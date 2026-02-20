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
 * POST /api/tasks/sync
 *
 * Syncs tasks from MongoDB `devcoTasks` → Firestore `devcoTasks`.
 *
 * Strategy:
 *   1. Fetch all docs from MongoDB `devcoTasks`
 *   2. Build lookup maps for reference resolution:
 *      - devcoEmployees: MongoDB _id → Firebase doc ID (for assignees & createdBy/lastUpdatedBy)
 *      - devcoEstimates: MongoDB _id → Firebase doc ID (for estimate reference)
 *   3. Build legacy_id → docId map for existing Firestore tasks
 *   4. For each MongoDB task:
 *      - Resolve assignees array: map each MongoDB employee _id → Firebase doc ID
 *      - Resolve estimate: map MongoDB estimate _id → Firebase doc ID
 *      - Resolve createdBy/lastUpdatedBy: map MongoDB employee _id → Firebase doc ID
 *      - If Firestore doc with matching legacy_id exists → update
 *      - Otherwise → create new doc with Firebase auto-generated ID
 *   5. Return sync stats
 */
export default defineEventHandler(async (_event) => {
  const startTime = Date.now()

  try {
    // ── Step 1: Connect to MongoDB and fetch all tasks ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')
    const mongoTasks = await db.collection('devcoTasks').find({}).toArray()

    if (!mongoTasks.length) {
      return {
        success: true,
        message: 'No tasks found in MongoDB',
        stats: { total: 0, created: 0, updated: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 2: Build reference lookup maps ──
    const firestore = useFirestoreAdmin()

    // Employees: legacy_id → Firebase doc ID
    const employeeByLegacyId = new Map<string, string>()
    const empSnap = await firestore.collection('devcoEmployees').select('legacy_id').get()
    for (const doc of empSnap.docs) {
      const d = doc.data()
      if (d.legacy_id)
        employeeByLegacyId.set(d.legacy_id.toString(), doc.id)
    }

    // Estimates: legacy_id → Firebase doc ID
    const estimateByLegacyId = new Map<string, string>()
    const estSnap = await firestore.collection('devcoEstimates').select('legacy_id').get()
    for (const doc of estSnap.docs) {
      const d = doc.data()
      if (d.legacy_id)
        estimateByLegacyId.set(d.legacy_id.toString(), doc.id)
    }

    // ── Step 3: Build existing tasks legacy_id → docId map ──
    const firestoreCollection = firestore.collection('devcoTasks')
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

    // ── Step 4: Batch upsert with reference resolution ──
    const BATCH_SIZE = 450
    let created = 0
    let updated = 0

    for (let i = 0; i < mongoTasks.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = mongoTasks.slice(i, i + BATCH_SIZE)

      for (const task of chunk) {
        const legacyId = task._id.toString()

        // Extract only the schema fields we care about
        const payload: Record<string, any> = {
          legacy_id: legacyId,
          task: task.task || task.name || task.title || '',
          status: task.status || 'todo',
          createdAt: task.createdAt ? sanitizeForFirestore(task.createdAt) : null,
          lastUpdatedAt: task.lastUpdatedAt || task.updatedAt ? sanitizeForFirestore(task.lastUpdatedAt || task.updatedAt) : null,
          _syncedAt: FieldValue.serverTimestamp(),
        }

        // Resolve createdBy → Firebase employee ID
        if (task.createdBy) {
          const createdById = task.createdBy.toString()
          payload.createdBy = employeeByLegacyId.get(createdById) || createdById
        }

        // Resolve lastUpdatedBy → Firebase employee ID
        if (task.lastUpdatedBy) {
          const updatedById = task.lastUpdatedBy.toString()
          payload.lastUpdatedBy = employeeByLegacyId.get(updatedById) || updatedById
        }

        // Resolve estimate → Firebase estimate ID
        if (task.estimate) {
          const estimateId = task.estimate.toString()
          payload.estimate = estimateByLegacyId.get(estimateId) || estimateId
        }

        // Resolve assignees array → Firebase employee IDs
        if (Array.isArray(task.assignees)) {
          payload.assignees = task.assignees.map((assignee: any) => {
            if (typeof assignee === 'string' || assignee instanceof ObjectId) {
              const id = assignee.toString()
              return { employeeId: employeeByLegacyId.get(id) || id }
            }
            if (typeof assignee === 'object' && assignee !== null) {
              const sanitized = sanitizeForFirestore(assignee)
              // Resolve the employee reference inside the assignee object
              const empId = (assignee._id || assignee.employeeId || assignee.employee || '').toString()
              if (empId) {
                sanitized.employeeId = employeeByLegacyId.get(empId) || empId
              }
              // Clean up MongoDB-specific fields
              delete sanitized._id
              return sanitized
            }
            return assignee
          })
        }
        else {
          payload.assignees = []
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
      message: `Synced ${mongoTasks.length} tasks to Firebase`,
      stats: {
        total: mongoTasks.length,
        created,
        updated,
        duration,
      },
    }
  }
  catch (error: any) {
    console.error('[Task Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Task sync failed',
      data: { message: error?.message || 'Unknown error during sync' },
    })
  }
})
