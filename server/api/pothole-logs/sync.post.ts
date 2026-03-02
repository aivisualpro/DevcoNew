import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'
import { invalidatePotholeLogsCache } from '../../utils/potholeLogsCache'

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
 * POST /api/pothole-logs/sync
 *
 * Reads all documents from MongoDB `potholelogs` collection and syncs them
 * to Firebase Firestore `DevcoPotholeLogs` collection.
 *
 * - Firebase auto-generates its own document _id
 * - MongoDB _id is stored as `legacy_id` to prevent duplicates
 * - Employee references are resolved to Firebase IDs where possible
 * - Each doc contains its nested potholeItems array
 */
export default defineEventHandler(async () => {
    const startTime = Date.now()

    try {
        const firestore = useFirestoreAdmin()

        // ── Step 1: Load Reference Data ──

        // A. Employees: Build lookups
        const employeesSnap = await firestore.collection('devcoEmployees')
            .select('firstName', 'lastName', 'email', 'profilePicture', 'image', 'legacy_id')
            .get()
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

        // B. Schedules: lookup estimate → schedule context
        const schedulesSnap = await firestore.collection('devcoSchedules')
            .select('legacy_id', 'title', 'estimate', 'service', 'item', 'customerName', 'customerId')
            .get()
        const scheduleByEstimate = new Map<string, any>()

        schedulesSnap.docs.forEach((doc) => {
            const d = doc.data()
            if (d.estimate) {
                // Keep the first match (there may be multiple schedules per estimate)
                if (!scheduleByEstimate.has(d.estimate)) {
                    scheduleByEstimate.set(d.estimate, {
                        firebaseId: doc.id,
                        title: d.title || '',
                        service: d.service || '',
                        item: d.item || '',
                        customerName: d.customerName || '',
                        customerId: d.customerId || '',
                    })
                }
            }
        })

        // ── Step 2: Connect to MongoDB ──
        const mongoClient = await useMongoClient()
        const db = mongoClient.db('devco')

        const mongoPotholeLogs = await db.collection('potholelogs').find({}).toArray()

        if (!mongoPotholeLogs.length) {
            return {
                success: true,
                message: 'No pothole log records found in MongoDB',
                stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
            }
        }

        // ── Step 3: Sync Loop ──
        const potholeCollection = firestore.collection('DevcoPotholeLogs')

        // Get existing docs mapped by legacy_id
        const legacyIdToDocId = new Map<string, string>()
        try {
            const existingSnapshot = await potholeCollection.select('legacy_id').get()
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

        for (let i = 0; i < mongoPotholeLogs.length; i += BATCH_SIZE) {
            const batch = firestore.batch()
            const chunk = mongoPotholeLogs.slice(i, i + BATCH_SIZE)

            for (const potholeLog of chunk) {
                const legacyId = potholeLog._id.toString()
                processedLegacyIds.add(legacyId)

                // Determine Doc ID
                let docRef
                const existingDocId = legacyIdToDocId.get(legacyId)

                if (existingDocId) {
                    docRef = potholeCollection.doc(existingDocId)
                    updated++
                }
                else {
                    docRef = potholeCollection.doc()
                    created++
                }

                // Resolve schedule context from estimate
                const estimate = (potholeLog.estimate || '').toString().trim()
                const scheduleInfo = scheduleByEstimate.get(estimate)

                // Build payload
                const payload: Record<string, any> = {
                    legacy_id: legacyId,
                    _syncedAt: FieldValue.serverTimestamp(),

                    // ── Core fields ──
                    date: sanitizeForFirestore(potholeLog.date) || '',
                    estimate: estimate,
                    projectionLocation: potholeLog.projectionLocation || '',
                    createdAt: sanitizeForFirestore(potholeLog.createdAt) || '',
                    updatedAt: sanitizeForFirestore(potholeLog.updatedAt) || '',

                    // ── Schedule context (enriched) ──
                    scheduleId: scheduleInfo?.firebaseId || null,
                    scheduleTitle: scheduleInfo?.title || '',
                    service: scheduleInfo?.service || '',
                    item: scheduleInfo?.item || '',
                    customerName: scheduleInfo?.customerName || '',
                }

                // ── Resolve createdBy ──
                if (potholeLog.createdBy) {
                    const creatorInfo = resolveEmployee(potholeLog.createdBy)
                    if (creatorInfo) {
                        payload.createdById = creatorInfo.firebaseId
                        payload.createdByName = creatorInfo.name
                        payload.createdByAvatar = creatorInfo.avatar
                    }
                    else {
                        payload.createdByName = potholeLog.createdBy?.toString() || ''
                    }
                }

                // ── PotholeItems (nested array) ──
                const rawItems = Array.isArray(potholeLog.potholeItems) ? potholeLog.potholeItems : []
                const potholeItems = rawItems.map((item: any, itemIdx: number) => {
                    const itemPayload: Record<string, any> = {
                        potholeNo: item.potholeNo ?? (itemIdx + 1),
                        typeOfUtility: item.typeOfUtility || '',
                        soilType: item.soilType || '',
                        topDepthOfUtility: item.topDepthOfUtility ?? '',
                        bottomDepthOfUtility: item.bottomDepthOfUtility ?? '',
                        photo1: item.photo1 || '',
                        photo2: item.photo2 || '',
                        pin: item.pin || '',
                        createdAt: sanitizeForFirestore(item.createdAt) || '',
                    }

                    // Resolve item createdBy
                    if (item.createdBy) {
                        const itemCreator = resolveEmployee(item.createdBy)
                        if (itemCreator) {
                            itemPayload.createdById = itemCreator.firebaseId
                            itemPayload.createdByName = itemCreator.name
                        }
                        else {
                            itemPayload.createdByName = item.createdBy?.toString() || ''
                        }
                    }

                    return itemPayload
                })

                payload.potholeItems = potholeItems
                payload.itemCount = potholeItems.length

                batch.set(docRef, payload, { merge: true })
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
                    batch.delete(potholeCollection.doc(id))
                    removed++
                }
                await batch.commit()
            }
        }

        const duration = Date.now() - startTime
        invalidatePotholeLogsCache()

        return {
            success: true,
            message: `Synced ${processedLegacyIds.size} pothole log records to Firebase`,
            stats: { total: processedLegacyIds.size, created, updated, removed, duration },
        }
    }
    catch (error: any) {
        console.error('[Pothole Logs Sync Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Pothole Logs sync failed',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
