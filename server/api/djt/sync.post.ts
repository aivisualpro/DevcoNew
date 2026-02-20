import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'

/**
 * Deep-convert a MongoDB document into a Firestore-safe plain object.
 */
function sanitizeForFirestore(value: any): any {
  if (value === null || value === undefined)
    return null
  if (value instanceof ObjectId || (value && typeof value.toHexString === 'function'))
    return value.toString()
  if (value instanceof Date)
    return value.toISOString()
  if (Buffer.isBuffer(value))
    return value.toString('base64')
  if (Array.isArray(value))
    return value.map(sanitizeForFirestore)
  if (typeof value === 'object' && value !== null) {
    if (value.constructor && value.constructor !== Object)
      return value.toString()
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(v)
      if (sanitized !== undefined)
        result[k] = sanitized
    }
    return result
  }
  return value
}

/**
 * POST /api/djt/sync
 *
 * Extracts DJT objects from devcoschedules in MongoDB and syncs them
 * to Firebase Firestore as a separate `DevcoDJT` collection.
 *
 * - Firebase auto-generates its own document _id
 * - DJT._id (from Mongo) is stored as `legacy_id`
 * - The parent schedule's MongoDB _id is resolved to its Firebase ID (scheduleId)
 * - DJTSignatures from the parent schedule are embedded in each DJT doc
 * - Employee references resolved to Firebase IDs
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    const firestore = useFirestoreAdmin()

    // ── Step 1: Load Reference Data ──

    // A. Employees
    const employeesSnap = await firestore.collection('devcoEmployees').get()
    const empByEmail = new Map<string, any>()
    const empByName = new Map<string, any>()
    const empByLegacyId = new Map<string, any>()

    employeesSnap.docs.forEach((doc) => {
      const d = doc.data()
      const info = {
        firebaseId: doc.id,
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        avatar: d.profilePicture || d.image || '',
        email: (d.email || '').toLowerCase().trim(),
        legacyId: d.legacy_id ? d.legacy_id.toString() : null,
      }

      if (info.email)
        empByEmail.set(info.email, info)
      if (info.name)
        empByName.set(info.name.toLowerCase(), info)
      if (info.legacyId)
        empByLegacyId.set(info.legacyId, info)
    })

    // B. Schedules: Legacy ID → Firebase ID
    const schedulesSnap = await firestore.collection('devcoSchedules').select('legacy_id').get()
    const scheduleByLegacyId = new Map<string, string>()

    schedulesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) {
        scheduleByLegacyId.set(d.legacy_id.toString(), doc.id)
      }
    })

    // C. Clients: Legacy ID → Firebase ID & Name
    const clientsSnap = await firestore.collection('devcoClients').select('legacy_id', 'name').get()
    const clientByLegacyId = new Map<string, { id: string, name: string }>()

    clientsSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) {
        clientByLegacyId.set(d.legacy_id.toString(), {
          id: doc.id,
          name: d.name || '',
        })
      }
    })

    // ── Step 2: Connect to MongoDB ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')

    // Fetch all schedules that have a djt object
    const mongoSchedules = await db.collection('devcoschedules').find({ djt: { $exists: true, $ne: null } }).toArray()

    if (!mongoSchedules.length) {
      return {
        success: true,
        message: 'No DJT records found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Sync Loop ──
    const djtCollection = firestore.collection('DevcoDJT')

    // Get existing DJT docs mapped by legacy_id
    const legacyIdToDocId = new Map<string, string>()
    try {
      const existingSnapshot = await djtCollection.select('legacy_id').get()
      for (const doc of existingSnapshot.docs) {
        const data = doc.data()
        if (data.legacy_id) {
          legacyIdToDocId.set(data.legacy_id, doc.id)
        }
      }
    }
    catch { /* Collection might not exist yet */ }

    // Helper: resolve employee
    function resolveEmployee(raw: any): { firebaseId: string, name: string, avatar: string } | null {
      if (!raw)
        return null
      const str = raw.toString().trim()
      const strLower = str.toLowerCase()

      let info = empByLegacyId.get(str)
      if (!info)
        info = empByEmail.get(strLower)
      if (!info)
        info = empByName.get(strLower)

      return info || null
    }

    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    let removed = 0
    const processedLegacyIds = new Set<string>()

    for (let i = 0; i < mongoSchedules.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoSchedules.slice(i, i + BATCH_SIZE)

      for (const schedule of chunk) {
        const djt = schedule.djt
        if (!djt || typeof djt !== 'object')
          continue

        // Use DJT's own _id as legacy_id
        const djtLegacyId = djt._id ? djt._id.toString() : `${schedule._id.toString()}-djt`
        processedLegacyIds.add(djtLegacyId)

        // Determine Doc ID
        let docRef
        const existingDocId = legacyIdToDocId.get(djtLegacyId)

        if (existingDocId) {
          docRef = djtCollection.doc(existingDocId)
          updated++
        }
        else {
          docRef = djtCollection.doc()
          created++
        }

        // Build DJT payload
        const payload = sanitizeForFirestore(djt)
        payload.legacy_id = djtLegacyId
        delete payload._id
        payload._syncedAt = FieldValue.serverTimestamp()

        // ── Link to parent schedule via Firebase ID ──
        const scheduleLegacyId = schedule._id.toString()
        const scheduleFirebaseId = scheduleByLegacyId.get(scheduleLegacyId)
        payload.scheduleId = scheduleFirebaseId || null
        payload.legacy_scheduleId = scheduleLegacyId

        // ── Copy context from parent schedule ──
        payload.scheduleTitle = schedule.title || ''
        payload.estimate = schedule.estimate || ''
        payload.service = schedule.service || ''
        payload.item = schedule.item || ''
        payload.fromDate = schedule.fromDate ? sanitizeForFirestore(schedule.fromDate) : null
        payload.toDate = schedule.toDate ? sanitizeForFirestore(schedule.toDate) : null

        // Resolve customer
        if (schedule.customerId) {
          const mId = schedule.customerId.toString()
          const clientInfo = clientByLegacyId.get(mId)
          if (clientInfo) {
            payload.customerId = clientInfo.id
            payload.customerName = clientInfo.name
          }
          else {
            payload.customerName = schedule.customerId?.toString() || ''
          }
        }

        // ── Customer signature status ──
        const custSig = (djt.customerSignature || '').toString().trim()
        const custPrintName = (djt.customerPrintName || '').toString().trim()
        payload.hasCustomerSignature = !!custSig
        payload.customerPrintName = custPrintName
        payload.customerSignature = custSig

        // ── DJT cost ──
        payload.djtCost = typeof djt.djtCost === 'number' ? djt.djtCost : Number.parseFloat(djt.djtCost) || 0

        // ── Client email ──
        payload.clientEmail = (djt.clientEmail || '').toString().trim()

        // ── Daily Job Description ──
        payload.dailyJobDescription = (djt.dailyJobDescription || '').toString()

        // ── Images ──
        payload.djtimages = Array.isArray(djt.djtimages) ? djt.djtimages : []
        payload.imageCount = payload.djtimages.length

        // ── Equipment Used ──
        payload.equipmentUsed = Array.isArray(djt.equipmentUsed)
          ? djt.equipmentUsed.map((eq: any) => sanitizeForFirestore(eq))
          : []
        payload.equipmentCount = payload.equipmentUsed.length

        // ── Copy DJTSignatures from parent schedule ──
        const rawSigs = Array.isArray(schedule.DJTSignatures) ? schedule.DJTSignatures : []
        const signatures = rawSigs.map((sig: any) => {
          const sanitized = sanitizeForFirestore(sig)

          if (sig.employee) {
            const empInfo = resolveEmployee(sig.employee)
            if (empInfo) {
              sanitized.employeeId = empInfo.firebaseId
              sanitized.employeeName = empInfo.name
              sanitized.employeeAvatar = empInfo.avatar
            }
            else {
              sanitized.employeeName = sig.employee?.toString() || ''
              sanitized.employeeAvatar = ''
            }
          }

          return sanitized
        })
        payload.signatures = signatures
        payload.signatureCount = signatures.length

        // ── Copy assignee details from parent schedule ──
        let assigneeEmails: string[] = []
        if (Array.isArray(schedule.assignees)) {
          assigneeEmails = schedule.assignees.map((a: any) => a?.toString().trim().toLowerCase()).filter(Boolean)
        }
        else if (typeof schedule.assignees === 'string') {
          assigneeEmails = schedule.assignees.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
        }

        const assigneeDetails = assigneeEmails
          .map((email: string) => {
            const emp = resolveEmployee(email)
            return emp ? { id: emp.firebaseId, name: emp.name, avatar: emp.avatar, email } : { name: email, email }
          })

        payload.assigneeCount = assigneeDetails.length
        payload.assigneeDetails = assigneeDetails

        // ── Signature analysis ──
        const signedEmails = new Set(signatures.map((s: any) => (s.employee || '').toString().toLowerCase()).filter(Boolean))
        const unsignedAssignees = assigneeDetails.filter((a: any) => !signedEmails.has(a.email))
        payload.unsignedAssigneeCount = unsignedAssignees.length
        payload.hasAllAssigneeSigns = unsignedAssignees.length === 0 && assigneeDetails.length > 0

        // Resolve createdBy
        if (djt.createdBy) {
          const creatorInfo = resolveEmployee(djt.createdBy)
          if (creatorInfo) {
            payload.createdById = creatorInfo.firebaseId
            payload.createdByName = creatorInfo.name
            payload.createdByAvatar = creatorInfo.avatar
          }
          else {
            payload.createdByName = djt.createdBy?.toString() || ''
          }
        }

        batch.set(docRef, payload, { merge: true })
      }

      await batch.commit()
    }

    // ── Step 4: Remove orphaned docs ──
    const orphanedDocIds: string[] = []
    for (const [legacyId, docId] of legacyIdToDocId) {
      if (!processedLegacyIds.has(legacyId)) {
        orphanedDocIds.push(docId)
      }
    }

    if (orphanedDocIds.length > 0) {
      for (let i = 0; i < orphanedDocIds.length; i += BATCH_SIZE) {
        const batch = firestore.batch()
        const chunk = orphanedDocIds.slice(i, i + BATCH_SIZE)
        for (const id of chunk) {
          batch.delete(djtCollection.doc(id))
          removed++
        }
        await batch.commit()
      }
    }

    const duration = Date.now() - startTime
    return {
      success: true,
      message: `Synced ${processedLegacyIds.size} DJT records to Firebase`,
      stats: { total: processedLegacyIds.size, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[DJT Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'DJT sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
