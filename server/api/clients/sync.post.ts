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
 * POST /api/clients/sync
 *
 * Syncs specific client fields from MongoDB → Firebase Firestore (devcoClients).
 * Uses Firebase auto-generated IDs and stores MongoDB _id as legacy_id.
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    // ── Step 1: Connect to MongoDB ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')

    // Fetch all clients
    const mongoClients = await db.collection('clients').find({}).toArray()

    if (!mongoClients.length) {
      return {
        success: true,
        message: 'No clients found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 2: Get Firestore reference ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('devcoClients')

    // ── Step 3: Get existing Firestore doc IDs mapped by legacy_id ──
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
    catch {
      // Collection doesn't exist on first sync
    }

    // ── Step 4: Batch upsert ──
    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    let removed = 0
    const processedLegacyIds = new Set<string>()

    for (let i = 0; i < mongoClients.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoClients.slice(i, i + BATCH_SIZE)

      for (const client of chunk) {
        const legacyId = client._id.toString()
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
        
        // Construct the payload with specific fields as requested
        const payload = {
          legacy_id: legacyId,
          addresses: sanitizeForFirestore(client.addresses) || [],
          contacts: sanitizeForFirestore(client.contacts) || [],
          createdAt: sanitizeForFirestore(client.createdAt),
          documents: sanitizeForFirestore(client.documents) || [],
          name: client.name || '',
          status: client.status || 'Active', // Default to Active/unknown if missing
          updatedAt: sanitizeForFirestore(client.updatedAt),
          _syncedAt: FieldValue.serverTimestamp(),
        }

        batch.set(docRef, payload, { merge: true })
      }

      await batch.commit()
    }

    // ── Step 5: Remove orphaned docs ──
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
      message: `Synced ${mongoClients.length} clients to Firebase (devcoClients)`,
      stats: { total: mongoClients.length, created, updated, removed, duration },
    }
  }
  catch (error: any) {
    console.error('[Clients Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Sync failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
