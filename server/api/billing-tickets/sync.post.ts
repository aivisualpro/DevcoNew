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
 * POST /api/billing-tickets/sync
 *
 * Extracts billingTickets arrays from estimatesdb in MongoDB and syncs them
 * to Firebase Firestore as a separate `devcoBillingTickets` collection.
 *
 * - Firebase auto-generates its own document _id
 * - Each billing ticket's MongoDB _id is stored as `legacy_id`
 * - The parent estimate's MongoDB _id is resolved to its Firebase ID (estimateId)
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

    // B. Estimates: Legacy ID → Firebase ID
    const estimatesSnap = await firestore.collection('devcoEstimates').select('legacy_id', 'estimate').get()
    const estimateByLegacyId = new Map<string, { firebaseId: string, estimateNumber: string }>()

    estimatesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) {
        estimateByLegacyId.set(d.legacy_id.toString(), {
          firebaseId: doc.id,
          estimateNumber: d.estimate || '',
        })
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

    // Fetch estimates that have billingTickets
    const mongoEstimates = await db.collection('estimatesdb').find({
      billingTickets: { $exists: true, $not: { $size: 0 } },
    }).toArray()

    if (!mongoEstimates.length) {
      return {
        success: true,
        message: 'No billing tickets found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Sync Loop ──
    const btCollection = firestore.collection('devcoBillingTickets')

    // Get existing docs mapped by legacy_id
    const legacyIdToDocId = new Map<string, string>()
    try {
      const existingSnapshot = await btCollection.select('legacy_id').get()
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

    for (let i = 0; i < mongoEstimates.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoEstimates.slice(i, i + BATCH_SIZE)

      for (const estimate of chunk) {
        const tickets = estimate.billingTickets
        if (!Array.isArray(tickets) || tickets.length === 0)
          continue

        const estimateLegacyId = estimate._id.toString()
        const estimateInfo = estimateByLegacyId.get(estimateLegacyId)

        for (const ticket of tickets) {
          if (!ticket || typeof ticket !== 'object')
            continue

          // Use ticket's own _id as legacy_id
          const btLegacyId = ticket._id ? ticket._id.toString() : `${estimateLegacyId}-bt-${Math.random().toString(36).slice(2, 8)}`
          processedLegacyIds.add(btLegacyId)

          // Determine Doc ID
          let docRef
          const existingDocId = legacyIdToDocId.get(btLegacyId)

          if (existingDocId) {
            docRef = btCollection.doc(existingDocId)
            updated++
          }
          else {
            docRef = btCollection.doc()
            created++
          }

          // Build payload
          const payload: Record<string, any> = {}
          payload.legacy_id = btLegacyId
          payload._syncedAt = FieldValue.serverTimestamp()

          // ── Link to parent estimate via Firebase ID ──
          payload.estimateId = estimateInfo?.firebaseId || null
          payload.legacy_estimateId = estimateLegacyId
          payload.estimateNumber = ticket.estimate || estimateInfo?.estimateNumber || estimate.estimate || ''

          // ── Core fields ──
          payload.date = ticket.date || ''
          payload.billingTerms = ticket.billingTerms || ''
          payload.otherBillingTerms = ticket.otherBillingTerms || ''
          payload.lumpSum = ticket.lumpSum || ''
          payload.fileName = ticket.fileName || ''
          payload.createdAt = ticket.createdAt || ''

          // ── Daily Job Description (titleDescriptions) ──
          payload.titleDescriptions = Array.isArray(ticket.titleDescriptions)
            ? ticket.titleDescriptions.map((td: any) => ({
                title: td?.title || '',
                description: td?.description || '',
                _id: td?._id?.toString() || '',
              }))
            : []
          payload.titleDescriptionCount = payload.titleDescriptions.length

          // ── Uploads ──
          payload.uploads = Array.isArray(ticket.uploads)
            ? ticket.uploads.map((u: any) => sanitizeForFirestore(u))
            : []
          payload.uploadCount = payload.uploads.length

          // ── Links ──
          payload.links = Array.isArray(ticket.links)
            ? ticket.links.map((l: any) => sanitizeForFirestore(l))
            : []

          // ── Resolve customer from parent estimate ──
          if (estimate.customerId) {
            const mId = estimate.customerId.toString()
            const clientInfo = clientByLegacyId.get(mId)
            if (clientInfo) {
              payload.customerId = clientInfo.id
              payload.customerName = clientInfo.name
            }
            else {
              payload.customerName = ''
            }
          }

          // ── Copy useful context from parent estimate ──
          payload.service = estimate.service || ''
          payload.item = estimate.item || ''

          // ── Resolve createdBy ──
          if (ticket.createdBy) {
            const creatorInfo = resolveEmployee(ticket.createdBy)
            if (creatorInfo) {
              payload.createdById = creatorInfo.firebaseId
              payload.createdByName = creatorInfo.name
              payload.createdByAvatar = creatorInfo.avatar
            }
            else {
              payload.createdByName = ticket.createdBy?.toString() || ''
            }
          }

          batch.set(docRef, payload, { merge: true })
        }
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
          batch.delete(btCollection.doc(id))
          removed++
        }
        await batch.commit()
      }
    }

    const duration = Date.now() - startTime
    return {
      success: true,
      message: `Synced ${processedLegacyIds.size} billing tickets to Firebase`,
      stats: { total: processedLegacyIds.size, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[Billing Tickets Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Billing tickets sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
