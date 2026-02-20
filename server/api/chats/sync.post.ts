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
 * POST /api/chats/sync
 *
 * Syncs chats from MongoDB `devcoChats` → Firestore `devcoChats`.
 *
 * Strategy:
 *   1. Fetch all docs from MongoDB `devcoChats`
 *   2. Build legacy_id → docId map for existing Firestore chats
 *   3. For each MongoDB chat:
 *      - Sanitize all fields for Firestore compatibility
 *      - MongoDB _id → legacy_id (Firebase generates its own _id)
 *      - If Firestore doc with matching legacy_id exists → update
 *      - Otherwise → create new doc
 *   4. Return sync stats
 */
export default defineEventHandler(async (_event) => {
  const startTime = Date.now()

  try {
    // ── Step 1: Connect to MongoDB and fetch all chats ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')
    const mongoChats = await db.collection('devcoChats').find({}).toArray()

    if (!mongoChats.length) {
      return {
        success: true,
        message: 'No chats found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 2: Build existing chats legacy_id → docId map ──
    const firestore = useFirestoreAdmin()
    const firestoreCollection = firestore.collection('devcoChats')
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

    for (let i = 0; i < mongoChats.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoChats.slice(i, i + BATCH_SIZE)

      for (const chat of chunk) {
        const legacyId = chat._id.toString()

        // Sanitize the entire document, then attach legacy_id and sync timestamp
        const sanitized = sanitizeForFirestore(chat)
        delete sanitized._id // Remove MongoDB _id, Firebase will use its own

        const payload: Record<string, any> = {
          ...sanitized,
          legacy_id: legacyId,
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
      message: `Synced ${mongoChats.length} chats to Firebase`,
      stats: {
        total: mongoChats.length,
        created,
        updated,
        duration,
      },
    }
  }
  catch (error: any) {
    console.error('[Chat Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Chat sync failed',
      data: { message: error?.message || 'Unknown error during sync' },
    })
  }
})
