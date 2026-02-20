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
 * POST /api/schedules/sync
 *
 * Syncs schedules from MongoDB (devcoschedules) → Firebase Firestore (devcoSchedules).
 *
 * - Firebase auto-generates its own document _id
 * - MongoDB _id is stored as `legacy_id`
 * - customerId is resolved from legacy_id → Firebase doc id (same as estimates pattern)
 * - estimate is kept as-is (version-agnostic reference)
 * - projectManager, foremanName resolved to employee Firebase IDs
 * - assignees resolved to array of employee Firebase IDs
 * - notifyAssignees → boolean
 * - perDiem → boolean
 * - Dates stored as-is (no timezone conversion)
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    const firestore = useFirestoreAdmin()

    // ── Step 1: Load Reference Data from Firestore ──

    // A. Employees: Build lookups for Email, Name, and Legacy ID
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

    // B. Clients: Build lookup for Legacy ID -> Firebase ID & Name
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

    // Fetch all schedules
    const mongoSchedules = await db.collection('devcoschedules').find({}).toArray()

    if (!mongoSchedules.length) {
      return {
        success: true,
        message: 'No schedules found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Sync Loop ──
    const firestoreCollection = firestore.collection('devcoSchedules')

    // Get existing IDs mapped by legacy_id to handle updates and orphans
    const legacyIdToDocId = new Map<string, string>()
    try {
      const existingSnapshot = await firestoreCollection.select('legacy_id').get()
      for (const doc of existingSnapshot.docs) {
        const data = doc.data()
        if (data.legacy_id) {
          legacyIdToDocId.set(data.legacy_id, doc.id)
        }
      }
    }
    catch { /* Collection might not exist yet */ }

    // Helper: resolve an employee reference (could be ObjectId string, name, or email)
    function resolveEmployee(raw: any): { firebaseId: string, name: string, avatar: string } | null {
      if (!raw)
        return null
      const str = raw.toString().trim()
      const strLower = str.toLowerCase()

      // Priority 1: Legacy MongoDB ID
      let info = empByLegacyId.get(str)
      // Priority 2: Email
      if (!info)
        info = empByEmail.get(strLower)
      // Priority 3: Name
      if (!info)
        info = empByName.get(strLower)

      return info || null
    }

    // Helper: convert to boolean
    function toBool(val: any): boolean {
      if (typeof val === 'boolean')
        return val
      if (typeof val === 'string')
        return val.toLowerCase() === 'true' || val.toLowerCase() === 'yes' || val === '1'
      if (typeof val === 'number')
        return val !== 0
      return !!val
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
        const legacyId = schedule._id.toString()
        processedLegacyIds.add(legacyId)

        // Determine Doc ID: Use existing if found, else auto-generate
        let docRef
        const existingDocId = legacyIdToDocId.get(legacyId)

        if (existingDocId) {
          docRef = firestoreCollection.doc(existingDocId)
          updated++
        }
        else {
          docRef = firestoreCollection.doc()
          created++
        }

        // Base payload (sanitize all values for Firestore)
        const payload = sanitizeForFirestore(schedule)

        // Standard fields
        payload.legacy_id = legacyId
        delete payload._id
        payload._syncedAt = FieldValue.serverTimestamp()

        // ── Remove sub-document fields (synced as separate collections) ──
        delete payload.jha
        delete payload.JHASignatures
        delete payload.DJTSignatures
        delete payload.djt
        delete payload.timesheet

        // ── Resolve Customer ──
        if (schedule.customerId) {
          const mId = schedule.customerId.toString()
          const clientInfo = clientByLegacyId.get(mId)

          if (clientInfo) {
            payload.customerId = clientInfo.id // Actual Firebase Reference ID
            payload.customerName = clientInfo.name // Store name for display
            payload.legacy_customerId = mId
          }
        }

        // ── estimate: keep as-is (version-agnostic reference) ──
        // payload.estimate is already in the sanitized payload

        // ── Resolve Project Manager ──
        if (schedule.projectManager) {
          const pmInfo = resolveEmployee(schedule.projectManager)
          if (pmInfo) {
            payload.projectManager = pmInfo.firebaseId
            payload.projectManagerName = pmInfo.name
            payload.projectManagerAvatar = pmInfo.avatar
          }
          else {
            payload.projectManagerName = schedule.projectManager?.toString() || ''
            payload.projectManagerAvatar = ''
          }
        }

        // ── Resolve Foreman ──
        if (schedule.foremanName) {
          const foremanInfo = resolveEmployee(schedule.foremanName)
          if (foremanInfo) {
            payload.foremanName = foremanInfo.firebaseId
            payload.foremanDisplayName = foremanInfo.name
            payload.foremanAvatar = foremanInfo.avatar
          }
          else {
            payload.foremanDisplayName = schedule.foremanName?.toString() || ''
            payload.foremanAvatar = ''
          }
        }

        // ── Resolve Assignees (enumlist → array of Firebase IDs) ──
        if (schedule.assignees) {
          let rawAssignees: string[] = []

          if (Array.isArray(schedule.assignees)) {
            rawAssignees = schedule.assignees.map((a: any) => a?.toString().trim()).filter(Boolean)
          }
          else if (typeof schedule.assignees === 'string') {
            // Could be comma-separated enumlist
            rawAssignees = schedule.assignees.split(',').map((s: string) => s.trim()).filter(Boolean)
          }

          const resolvedAssignees: { firebaseId: string, name: string, avatar: string }[] = []
          const unresolvedAssignees: string[] = []

          for (const raw of rawAssignees) {
            const emp = resolveEmployee(raw)
            if (emp) {
              resolvedAssignees.push(emp)
            }
            else {
              unresolvedAssignees.push(raw)
            }
          }

          payload.assignees = resolvedAssignees.map(a => a.firebaseId)
          payload.assigneeDetails = resolvedAssignees.map(a => ({
            id: a.firebaseId,
            name: a.name,
            avatar: a.avatar,
          }))
          if (unresolvedAssignees.length > 0) {
            payload.unresolvedAssignees = unresolvedAssignees
          }
        }

        // ── Boolean fields ──
        payload.notifyAssignees = toBool(schedule.notifyAssignees)
        payload.perDiem = toBool(schedule.perDiem)

        // ── Dates: store as-is (no timezone conversion) ──
        // fromDate and toDate are already sanitized by sanitizeForFirestore
        // which converts Date objects to ISO strings. The values are timezone-agnostic.

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
          batch.delete(firestoreCollection.doc(id))
          removed++
        }
        await batch.commit()
      }
    }

    const duration = Date.now() - startTime
    return {
      success: true,
      message: `Synced ${mongoSchedules.length} schedules to Firebase`,
      stats: { total: mongoSchedules.length, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[Schedules Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
