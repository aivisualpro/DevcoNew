import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'

/**
 * Deep-convert a MongoDB document into a Firestore-safe plain object.
 */
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
 * POST /api/estimates/sync
 *
 * Syncs estimates from MongoDB (estimatesdb) → Firebase Firestore (devcoEstimates).
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    const firestore = useFirestoreAdmin()
    
    // ── Step 1: Load Reference Data from Firestore ──
    // We fetch employees and clients from Firestore because we need their valid Firebase IDs
    // to create proper references in the estimates collection.

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

      if (info.email) empByEmail.set(info.email, info)
      if (info.name) empByName.set(info.name.toLowerCase(), info)
      if (info.legacyId) empByLegacyId.set(info.legacyId, info)
    })

    // B. Clients: Build lookup for Legacy ID -> Firebase ID & Name
    const clientsSnap = await firestore.collection('devcoClients').select('legacy_id', 'name').get()
    const clientByLegacyId = new Map<string, { id: string, name: string }>()

    clientsSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id) {
        clientByLegacyId.set(d.legacy_id.toString(), { 
            id: doc.id,
            name: d.name || ''
        })
      }
    })

    // ── Step 2: Connect to MongoDB ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')

    // Fetch all estimates
    const mongoEstimates = await db.collection('estimatesdb').find({}).toArray()

    if (!mongoEstimates.length) {
      return {
        success: true,
        message: 'No estimates found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Sync Loop ──
    const firestoreCollection = firestore.collection('devcoEstimates')

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

    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    let removed = 0
    const processedLegacyIds = new Set<string>()

    for (let i = 0; i < mongoEstimates.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoEstimates.slice(i, i + BATCH_SIZE)

      for (const estimate of chunk) {
        const legacyId = estimate._id.toString()
        processedLegacyIds.add(legacyId)

        // Determine Doc ID: Use existing if found, else auto-generate
        let docRef
        const existingDocId = legacyIdToDocId.get(legacyId)
        
        if (existingDocId) {
            docRef = firestoreCollection.doc(existingDocId)
            updated++
        } else {
            docRef = firestoreCollection.doc()
            created++
        }
        
        // Base payload
        const payload = sanitizeForFirestore(estimate)
        
        // Standard fields
        payload.legacy_id = legacyId
        delete payload._id 
        payload._syncedAt = FieldValue.serverTimestamp()

        // ── Remove sub-document fields (synced as separate collections) ──
        delete payload.billingTickets
        delete payload.receiptsAndCosts

        // ── Resolve Proposal Writer ──
        // proposalWriter could be Email, Name, or ObjectId string
        let writerInfo = null
        if (estimate.proposalWriter) {
            const raw = estimate.proposalWriter.toString().trim()
            const rawLower = raw.toLowerCase()
            
            // Priority 1: Email
            writerInfo = empByEmail.get(rawLower)
            // Priority 2: Name
            if (!writerInfo) writerInfo = empByName.get(rawLower)
            // Priority 3: Legacy MongoDB ID
            if (!writerInfo) writerInfo = empByLegacyId.get(raw)
        }

        if (writerInfo) {
            payload.proposalWriter = writerInfo.firebaseId // Actual Firebase Reference ID
            payload.proposalWriterName = writerInfo.name
            payload.proposalWriterAvatar = writerInfo.avatar
        } else {
             // Fallback: keep original value if no match found
             payload.proposalWriterName = estimate.proposalWriter
             payload.proposalWriterAvatar = ''
        }

        // ── Resolve Customer ──
        if (estimate.customerId) {
            const mId = estimate.customerId.toString()
            const clientInfo = clientByLegacyId.get(mId)
            
            if (clientInfo) {
                payload.customerId = clientInfo.id // Actual Firebase Reference ID
                payload.customerName = clientInfo.name // Store name for display
                payload.legacy_customerId = mId
            }
        }

        batch.set(docRef, payload, { merge: true })
      }

      await batch.commit()
    }

    // ── Step 4: Remove orphaned docs ──
    // Identify docs in Firestore whose legacy_id is no longer in MongoDB
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
      message: `Synced ${mongoEstimates.length} estimates to Firebase`,
      stats: { total: mongoEstimates.length, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[Estimates Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
