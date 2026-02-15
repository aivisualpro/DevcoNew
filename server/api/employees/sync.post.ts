import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'

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
 * Reads ALL employees from MongoDB → upserts each into Firestore.
 * Uses MongoDB _id as the Firestore document ID so duplicates are impossible.
 *
 * Strategy:
 *   1. Fetch all docs from MongoDB `employees` collection
 *   2. For each doc, use Firestore `set(data, { merge: true })` keyed by _id
 *      - If doc exists → updates changed fields only
 *      - If doc doesn't exist → creates it
 *   3. Optionally remove Firestore docs that no longer exist in MongoDB
 *   4. Return sync stats
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

    // ── Step 2: Get Firestore reference ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('employees')

    // ── Step 3: Get existing Firestore doc IDs for cleanup comparison ──
    let existingIds = new Set<string>()
    try {
      const existingSnapshot = await firestoreCollection.select().get()
      existingIds = new Set(existingSnapshot.docs.map(d => d.id))
    }
    catch {
      // Collection doesn't exist yet on first sync — that's fine
    }

    // ── Step 4: Batch upsert (Firestore batches max 500 ops) ──
    const BATCH_SIZE = 450 // leave headroom
    let created = 0
    let updated = 0
    const mongoIds = new Set<string>()

    for (let i = 0; i < mongoEmployees.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoEmployees.slice(i, i + BATCH_SIZE)

      for (const emp of chunk) {
        const docId = emp._id.toString()
        mongoIds.add(docId)

        const docRef = firestoreCollection.doc(docId)

        // Deep-sanitize the entire document for Firestore
        const sanitized = sanitizeForFirestore(emp)
        // Remove _id since it's already the doc key
        delete sanitized._id

        // Add sync metadata
        sanitized._syncedAt = FieldValue.serverTimestamp()
        sanitized._sourceId = docId

        if (existingIds.has(docId)) {
          updated++
        }
        else {
          created++
        }

        // merge: true → updates existing fields, adds new ones, keeps untouched fields
        batch.set(docRef, sanitized, { merge: true })
      }

      await batch.commit()
    }

    // ── Step 5: Remove orphaned Firestore docs (exist in Firebase but not in MongoDB) ──
    let removed = 0
    const orphanedIds = [...existingIds].filter(id => !mongoIds.has(id))

    if (orphanedIds.length > 0) {
      for (let i = 0; i < orphanedIds.length; i += BATCH_SIZE) {
        const batch = firestore.batch()
        const chunk = orphanedIds.slice(i, i + BATCH_SIZE)

        for (const orphanId of chunk) {
          batch.delete(firestoreCollection.doc(orphanId))
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
