import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'

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
 * Syncs all clients from MongoDB → Firebase Firestore.
 * Also counts projects (estimates) per client via customerId.
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

    // Count projects per client (via estimatesdb.customerId)
    const projectCounts = await db.collection('estimatesdb').aggregate([
      { $match: { customerId: { $ne: null, $exists: true } } },
      { $group: { _id: '$customerId', projectCount: { $sum: 1 } } },
    ]).toArray()

    const projectCountMap = new Map<string, number>()
    for (const pc of projectCounts) {
      projectCountMap.set(String(pc._id), pc.projectCount)
    }

    // ── Step 2: Get Firestore reference ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('clients')

    // ── Step 3: Get existing Firestore doc IDs ──
    let existingIds = new Set<string>()
    try {
      const existingSnapshot = await firestoreCollection.select().get()
      existingIds = new Set(existingSnapshot.docs.map(d => d.id))
    }
    catch {
      // Collection doesn't exist on first sync
    }

    // ── Step 4: Batch upsert ──
    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    const mongoIds = new Set<string>()

    for (let i = 0; i < mongoClients.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoClients.slice(i, i + BATCH_SIZE)

      for (const client of chunk) {
        const docId = client._id.toString()
        mongoIds.add(docId)

        const docRef = firestoreCollection.doc(docId)
        const sanitized = sanitizeForFirestore(client)
        delete sanitized._id

        // Add project count and sync metadata
        sanitized.projectCount = projectCountMap.get(docId) || 0
        sanitized._syncedAt = FieldValue.serverTimestamp()
        sanitized._sourceId = docId

        if (existingIds.has(docId)) {
          updated++
        }
        else {
          created++
        }

        batch.set(docRef, sanitized, { merge: true })
      }

      await batch.commit()
    }

    // ── Step 5: Remove orphaned docs ──
    let removed = 0
    const orphanedIds = [...existingIds].filter(id => !mongoIds.has(id))
    if (orphanedIds.length > 0) {
      for (let i = 0; i < orphanedIds.length; i += BATCH_SIZE) {
        const batch = firestore.batch()
        const chunk = orphanedIds.slice(i, i + BATCH_SIZE)
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
      message: `Synced ${mongoClients.length} clients to Firebase`,
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
