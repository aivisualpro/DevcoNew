import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'

/**
 * Deep-convert a MongoDB document into a Firestore-safe plain object.
 * Handles ObjectId, Date, Buffer, nested objects, and arrays recursively.
 */
function sanitizeForFirestore(value: any): any {
  if (value === null || value === undefined) return null

  // ObjectId → string
  if (value instanceof ObjectId || (value && typeof value.toHexString === 'function')) {
    return value.toString()
  }

  // Date → ISO string
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Buffer → base64
  if (Buffer.isBuffer(value)) {
    return value.toString('base64')
  }

  // Array → recurse
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore)
  }

  // Plain object → recurse
  if (typeof value === 'object' && value !== null) {
    // Only accept plain objects, convert custom-prototype objects to their string representation
    if (value.constructor && value.constructor !== Object) {
      return value.toString()
    }
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(v)
      if (sanitized !== undefined) {
        result[k] = sanitized
      }
    }
    return result
  }

  // Primitives (string, number, boolean) pass through
  return value
}

/**
 * POST /api/employees/sync
 *
 * Reads ALL employees from MongoDB → upserts each into Firestore `devcoEmployees` collection.
 * Uses Firebase auto-generated document IDs (not MongoDB _id).
 * Stores MongoDB _id as `legacy_id` to prevent duplicate syncs.
 *
 * Strategy:
 *   1. Fetch all docs from MongoDB `devcoEmployees` collection
 *   2. Build a lookup map of existing Firestore docs keyed by `legacy_id`
 *   3. For each MongoDB doc:
 *      - If a Firestore doc with matching `legacy_id` exists → update it
 *      - Otherwise → create a new doc with Firebase's auto-generated ID
 *   4. Remove orphaned Firestore docs whose `legacy_id` no longer exists in MongoDB
 *   5. Return sync stats
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // ── Step 1: Connect to MongoDB and fetch all employees ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')
    const collection = db.collection('devcoEmployees')

    const mongoEmployees = await collection.find({}).toArray()

    if (!mongoEmployees.length) {
      return {
        success: true,
        message: 'No employees found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 2: Get Firestore reference and build legacy_id → docId lookup ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('devcoEmployees')

    // Build a map of legacy_id → Firestore doc ID from existing docs
    const legacyIdToDocId = new Map<string, string>()
    try {
      const existingSnapshot = await firestoreCollection.select('legacy_id').get()
      for (const doc of existingSnapshot.docs) {
        const legacyId = doc.data().legacy_id
        if (legacyId) {
          legacyIdToDocId.set(legacyId, doc.id)
        }
      }
    }
    catch {
      // Collection doesn't exist yet on first sync — that's fine
    }

    // ── Step 3: Batch upsert (Firestore batches max 500 ops) ──
    const BATCH_SIZE = 450 // leave headroom
    let created = 0
    let updated = 0
    const processedLegacyIds = new Set<string>()

    for (let i = 0; i < mongoEmployees.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoEmployees.slice(i, i + BATCH_SIZE)

      for (const emp of chunk) {
        const legacyId = emp._id.toString()
        processedLegacyIds.add(legacyId)

        // Deep-sanitize the entire document for Firestore
        const sanitized = sanitizeForFirestore(emp)
        // Remove MongoDB _id — we store it as legacy_id instead
        delete sanitized._id

        // Add legacy_id and sync metadata
        sanitized.legacy_id = legacyId
        sanitized._syncedAt = FieldValue.serverTimestamp()

        // Check if a Firestore doc already exists for this MongoDB record
        const existingDocId = legacyIdToDocId.get(legacyId)

        if (existingDocId) {
          // Update existing doc
          const docRef = firestoreCollection.doc(existingDocId)
          batch.set(docRef, sanitized, { merge: true })
          updated++
        }
        else {
          // Create new doc with Firebase auto-generated ID
          const docRef = firestoreCollection.doc()
          batch.set(docRef, sanitized)
          created++
        }
      }

      await batch.commit()
    }

    // ── Step 4: Remove orphaned Firestore docs (legacy_id no longer in MongoDB) ──
    let removed = 0
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

        for (const orphanDocId of chunk) {
          batch.delete(firestoreCollection.doc(orphanDocId))
          removed++
        }

        await batch.commit()
      }
    }

    const duration = Date.now() - startTime

    return {
      success: true,
      message: `Synced ${mongoEmployees.length} employees to Firebase`,
      stats: {
        total: mongoEmployees.length,
        created,
        updated,
        removed,
        duration,
      },
    }
  }
  catch (error: any) {
    console.error('[Employee Sync Error]', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Sync failed',
      data: {
        message: error?.message || 'Unknown error during sync',
      },
    })
  }
})
