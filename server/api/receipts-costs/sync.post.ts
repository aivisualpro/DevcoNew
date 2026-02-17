import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'

function sanitizeForFirestore(value: any): any {
  if (value === null || value === undefined) return null
  if (value instanceof ObjectId || (value && typeof value.toHexString === 'function')) return value.toString()
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map(sanitizeForFirestore)
  if (typeof value === 'object' && value !== null) {
    if (value.constructor && value.constructor !== Object) return value.toString()
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(v)
      if (sanitized !== undefined) result[k] = sanitized
    }
    return result
  }
  return value
}

/**
 * POST /api/receipts-costs/sync
 *
 * Extracts receiptsAndCosts arrays from estimatesdb in MongoDB and syncs them
 * to Firebase Firestore as `devcoReceiptsCosts`.
 *
 * - Firebase auto-generates its own document _id
 * - Each receipt/cost's MongoDB _id is stored as `legacy_id`
 * - The parent estimate's MongoDB _id is resolved to its Firebase ID (estimateId)
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    const firestore = useFirestoreAdmin()

    // ── Step 1: Load Reference Data ──
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
      if (info.email) empByEmail.set(info.email, info)
      if (info.name) empByName.set(info.name.toLowerCase(), info)
      if (info.legacyId) empByLegacyId.set(info.legacyId, info)
    })

    // Estimates: Legacy ID → Firebase ID
    const estimatesSnap = await firestore.collection('devcoEstimates').select('legacy_id', 'estimate').get()
    const estimateByLegacyId = new Map<string, { firebaseId: string; estimateNumber: string }>()
    estimatesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) {
        estimateByLegacyId.set(d.legacy_id.toString(), { firebaseId: doc.id, estimateNumber: d.estimate || '' })
      }
    })

    // Clients
    const clientsSnap = await firestore.collection('devcoClients').select('legacy_id', 'name').get()
    const clientByLegacyId = new Map<string, { id: string; name: string }>()
    clientsSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) clientByLegacyId.set(d.legacy_id.toString(), { id: doc.id, name: d.name || '' })
    })

    // Helper
    function resolveEmployee(raw: any): { firebaseId: string; name: string; avatar: string } | null {
      if (!raw) return null
      const str = raw.toString().trim()
      const strLower = str.toLowerCase()
      let info = empByLegacyId.get(str)
      if (!info) info = empByEmail.get(strLower)
      if (!info) info = empByName.get(strLower)
      return info || null
    }

    // ── Step 2: MongoDB ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')

    const mongoEstimates = await db.collection('estimatesdb').find({
      receiptsAndCosts: { $exists: true, $not: { $size: 0 } },
    }).toArray()

    if (!mongoEstimates.length) {
      return {
        success: true,
        message: 'No receipts/costs found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Sync ──
    const rcCollection = firestore.collection('devcoReceiptsCosts')

    const legacyIdToDocId = new Map<string, string>()
    try {
      const snap = await rcCollection.select('legacy_id').get()
      for (const doc of snap.docs) {
        const data = doc.data()
        if (data.legacy_id) legacyIdToDocId.set(data.legacy_id, doc.id)
      }
    }
    catch { /* Collection might not exist yet */ }

    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    let removed = 0
    const processedLegacyIds = new Set<string>()

    for (let i = 0; i < mongoEstimates.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoEstimates.slice(i, i + BATCH_SIZE)

      for (const estimate of chunk) {
        const items = estimate.receiptsAndCosts
        if (!Array.isArray(items) || items.length === 0) continue

        const estimateLegacyId = estimate._id.toString()
        const estimateInfo = estimateByLegacyId.get(estimateLegacyId)

        for (const item of items) {
          if (!item || typeof item !== 'object') continue

          const rcLegacyId = item._id ? item._id.toString() : `${estimateLegacyId}-rc-${Math.random().toString(36).slice(2, 8)}`
          processedLegacyIds.add(rcLegacyId)

          let docRef
          const existingDocId = legacyIdToDocId.get(rcLegacyId)
          if (existingDocId) {
            docRef = rcCollection.doc(existingDocId)
            updated++
          }
          else {
            docRef = rcCollection.doc()
            created++
          }

          const payload: Record<string, any> = {}
          payload.legacy_id = rcLegacyId
          payload._syncedAt = FieldValue.serverTimestamp()

          // ── Link to parent estimate ──
          payload.estimateId = estimateInfo?.firebaseId || null
          payload.legacy_estimateId = estimateLegacyId
          payload.estimateNumber = item.estimate || estimateInfo?.estimateNumber || estimate.estimate || ''

          // ── Core fields ──
          payload.type = item.type || ''
          payload.vendor = item.vendor || ''
          payload.amount = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0
          payload.date = item.date || ''
          payload.dueDate = item.dueDate || ''
          payload.remarks = item.remarks || ''
          payload.createdAt = item.createdAt || ''
          payload.approvalStatus = item.approvalStatus || ''
          payload.status = item.status || ''
          payload.paidBy = item.paidBy || ''
          payload.paymentDate = item.paymentDate || ''

          // ── Uploads ──
          payload.upload = Array.isArray(item.upload)
            ? item.upload.map((u: any) => sanitizeForFirestore(u))
            : []
          payload.uploadCount = payload.upload.length

          // ── Tags (employee emails) ──
          const rawTags = Array.isArray(item.tag) ? item.tag : []
          payload.tags = rawTags.map((t: any) => {
            const email = (typeof t === 'string' ? t : '').toLowerCase().trim()
            const emp = resolveEmployee(email)
            return emp
              ? { email, id: emp.firebaseId, name: emp.name, avatar: emp.avatar }
              : { email, name: email }
          })
          payload.tagCount = payload.tags.length

          // ── Resolve customer from parent estimate ──
          if (estimate.customerId) {
            const mId = estimate.customerId.toString()
            const clientInfo = clientByLegacyId.get(mId)
            if (clientInfo) {
              payload.customerId = clientInfo.id
              payload.customerName = clientInfo.name
            }
          }

          // Context from parent
          payload.service = estimate.service || ''
          payload.item = estimate.item || ''

          // ── Resolve createdBy ──
          if (item.createdBy) {
            const creatorInfo = resolveEmployee(item.createdBy)
            if (creatorInfo) {
              payload.createdById = creatorInfo.firebaseId
              payload.createdByName = creatorInfo.name
              payload.createdByAvatar = creatorInfo.avatar
            }
            else {
              payload.createdByName = item.createdBy?.toString() || ''
            }
          }

          // ── Resolve paidBy ──
          if (item.paidBy) {
            const paidInfo = resolveEmployee(item.paidBy)
            if (paidInfo) {
              payload.paidById = paidInfo.firebaseId
              payload.paidByName = paidInfo.name
            }
            else {
              payload.paidByName = item.paidBy?.toString() || ''
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
      if (!processedLegacyIds.has(legacyId)) orphanedDocIds.push(docId)
    }

    if (orphanedDocIds.length > 0) {
      for (let i = 0; i < orphanedDocIds.length; i += BATCH_SIZE) {
        const batch = firestore.batch()
        const chunk = orphanedDocIds.slice(i, i + BATCH_SIZE)
        for (const id of chunk) {
          batch.delete(rcCollection.doc(id))
          removed++
        }
        await batch.commit()
      }
    }

    const duration = Date.now() - startTime
    return {
      success: true,
      message: `Synced ${processedLegacyIds.size} receipts/costs to Firebase`,
      stats: { total: processedLegacyIds.size, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[Receipts/Costs Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Receipts/Costs sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
