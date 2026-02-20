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
 * POST /api/activities/sync
 *
 * Syncs activities from MongoDB `devcoActivites` → Firestore `devcoActivites`.
 *
 * Strategy:
 *   1. Fetch all docs from MongoDB `devcoActivites`
 *   2. Build legacy_id → docId map for existing Firestore activities
 *   3. For each MongoDB activity:
 *      - Map fields: user, action, type, title, entityId, metadata, createdAt, updatedAt
 *      - MongoDB _id → legacy_id (Firebase generates its own _id)
 *      - If Firestore doc with matching legacy_id exists → update
 *      - Otherwise → create new doc
 *   4. Return sync stats
 */
export default defineEventHandler(async (_event) => {
  const startTime = Date.now()

  try {
    // ── Step 1: Connect to MongoDB and fetch all activities ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')
    const mongoActivities = await db.collection('devcoActivites').find({}).toArray()

    if (!mongoActivities.length) {
      return {
        success: true,
        message: 'No activities found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 2: Build existing activities legacy_id → docId map ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('devcoActivites')
    const legacyIdToDocId = new Map<string, string>()

    try {
      const existingSnapshot = await firestoreCollection.select('legacy_id').get()
      for (const doc of existingSnapshot.docs) {
        const legacyId = doc.data().legacy_id
        if (legacyId)
          legacyIdToDocId.set(legacyId, doc.id)
      }
    }
    catch {
      // Collection doesn't exist yet — fine
    }

    // ── Step 3: Batch upsert ──
    const BATCH_SIZE = 450
    let created = 0
    let updated = 0

    for (let i = 0; i < mongoActivities.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoActivities.slice(i, i + BATCH_SIZE)

      for (const activity of chunk) {
        const legacyId = activity._id.toString()

        const payload: Record<string, any> = {
          legacy_id: legacyId,
          user: activity.user ? sanitizeForFirestore(activity.user) : null,
          action: activity.action || '',
          type: activity.type || '',
          title: activity.title || '',
          entityId: activity.entityId ? sanitizeForFirestore(activity.entityId) : null,
          metadata: activity.metadata ? sanitizeForFirestore(activity.metadata) : null,
          createdAt: activity.createdAt ? sanitizeForFirestore(activity.createdAt) : null,
          updatedAt: activity.updatedAt ? sanitizeForFirestore(activity.updatedAt) : null,
          _syncedAt: FieldValue.serverTimestamp(),
        }

        // Upsert
        const existingDocId = legacyIdToDocId.get(legacyId)
        if (existingDocId) {
          batch.set(firestoreCollection.doc(existingDocId), payload, { merge: true })
          updated++
        }
        else {
          batch.set(firestoreCollection.doc(), payload)
          created++
        }
      }

      await batch.commit()
    }

    const duration = Date.now() - startTime

    return {
      success: true,
      message: `Synced ${mongoActivities.length} activities to Firebase`,
      stats: {
        total: mongoActivities.length,
        created,
        updated,
        duration,
      },
    }
  }
  catch (error: any) {
    console.error('[Activity Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Activity sync failed',
      data: { message: error?.message || 'Unknown error during sync' },
    })
  }
})
