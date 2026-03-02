import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'
import { invalidatePreBoreCache } from '../../utils/preBoreCache'

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
 * POST /api/pre-bore/sync
 *
 * Extracts preBore objects from devcoschedules in MongoDB and syncs them
 * to Firebase Firestore as a separate `preBore` collection.
 *
 * - Firebase auto-generates its own document _id
 * - preBore._id (from Mongo) is stored as `legacy_id`
 * - The parent schedule's MongoDB _id is resolved to its Firebase ID (scheduleId)
 * - Each preBore doc contains its nested preBoreLogs array
 * - Employee references resolved to Firebase IDs where possible
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

        // B. Schedules: Build lookup for Legacy ID → Firebase ID + context
        const schedulesSnap = await firestore.collection('devcoSchedules')
            .select('legacy_id', 'title', 'estimate', 'service', 'item', 'customerName', 'customerId')
            .get()
        const scheduleByLegacyId = new Map<string, any>()

        schedulesSnap.docs.forEach((doc) => {
            const d = doc.data()
            if (d.legacy_id) {
                scheduleByLegacyId.set(d.legacy_id.toString(), {
                    firebaseId: doc.id,
                    title: d.title || '',
                    estimate: d.estimate || '',
                    service: d.service || '',
                    item: d.item || '',
                    customerName: d.customerName || '',
                    customerId: d.customerId || '',
                })
            }
        })

        // ── Step 2: Connect to MongoDB ──
        const mongoClient = await useMongoClient()
        const db = mongoClient.db('devco')

        // Fetch all schedules that have a preBore array
        const mongoSchedules = await db.collection('devcoschedules').find({
            preBore: { $exists: true, $ne: null },
        }).toArray()

        if (!mongoSchedules.length) {
            return {
                success: true,
                message: 'No Pre-Bore records found in MongoDB',
                stats: { total: 0, created: 0, updated: 0, removed: 0, duration: Date.now() - startTime },
            }
        }

        // ── Step 3: Sync Loop ──
        const preBoreCollection = firestore.collection('preBore')

        // Get existing preBore docs mapped by legacy_id
        const legacyIdToDocId = new Map<string, string>()
        try {
            const existingSnapshot = await preBoreCollection.select('legacy_id').get()
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

        for (let i = 0; i < mongoSchedules.length; i += BATCH_SIZE) {
            const batch = firestore.batch()
            const chunk = mongoSchedules.slice(i, i + BATCH_SIZE)
            let batchOps = 0

            for (const schedule of chunk) {
                const preBoreArray = schedule.preBore
                if (!Array.isArray(preBoreArray) || preBoreArray.length === 0)
                    continue

                const scheduleLegacyId = schedule._id.toString()
                const scheduleInfo = scheduleByLegacyId.get(scheduleLegacyId)

                for (const preBore of preBoreArray) {
                    if (!preBore || typeof preBore !== 'object')
                        continue

                    // Use preBore's legacyId or _id as legacy_id
                    const preBoreLegacyId = preBore.legacyId
                        ? preBore.legacyId.toString()
                        : preBore._id
                            ? preBore._id.toString()
                            : `${scheduleLegacyId}-pb-${preBoreArray.indexOf(preBore)}`

                    processedLegacyIds.add(preBoreLegacyId)

                    // Determine Doc ID
                    let docRef
                    const existingDocId = legacyIdToDocId.get(preBoreLegacyId)

                    if (existingDocId) {
                        docRef = preBoreCollection.doc(existingDocId)
                        updated++
                    }
                    else {
                        docRef = preBoreCollection.doc()
                        created++
                    }

                    // Build payload
                    const payload: Record<string, any> = {
                        legacy_id: preBoreLegacyId,
                        _syncedAt: FieldValue.serverTimestamp(),

                        // ── Link to parent schedule ──
                        scheduleId: scheduleInfo?.firebaseId || null,
                        legacy_scheduleId: scheduleLegacyId,
                        scheduleTitle: scheduleInfo?.title || schedule.title || '',
                        estimate: scheduleInfo?.estimate || schedule.estimate || '',
                        service: scheduleInfo?.service || schedule.service || '',
                        item: scheduleInfo?.item || schedule.item || '',
                        customerName: preBore.customerName || scheduleInfo?.customerName || '',

                        // ── Pre-Bore header fields ──
                        date: sanitizeForFirestore(preBore.date) || '',
                        customerForeman: preBore.customerForeman || '',
                        customerWorkRequestNumber: preBore.customerWorkRequestNumber || '',
                        startTime: sanitizeForFirestore(preBore.startTime) || '',
                        addressBoreStart: preBore.addressBoreStart || '',
                        addressBoreEnd: preBore.addressBoreEnd || '',
                        devcoOperator: preBore.devcoOperator || '',
                        drillSize: preBore.drillSize || '',
                        pilotBoreSize: preBore.pilotBoreSize || '',
                        reamerSize6: preBore.reamerSize6 || '',
                        reamerSize8: preBore.reamerSize8 || '',
                        reamerSize10: preBore.reamerSize10 || '',
                        reamerSize12: preBore.reamerSize12 || '',
                        soilType: preBore.soilType || '',
                        boreLength: preBore.boreLength || '',
                        pipeSize: preBore.pipeSize || '',

                        // ── Signatures ──
                        foremanSignature: preBore.foremanSignature || '',
                        customerSignature: preBore.customerSignature || '',
                        hasForemanSignature: !!(preBore.foremanSignature),
                        hasCustomerSignature: !!(preBore.customerSignature),

                        // ── Metadata ──
                        createdAt: sanitizeForFirestore(preBore.createdAt) || '',
                    }

                    // ── Resolve createdBy ──
                    if (preBore.createdBy) {
                        const creatorInfo = resolveEmployee(preBore.createdBy)
                        if (creatorInfo) {
                            payload.createdById = creatorInfo.firebaseId
                            payload.createdByName = creatorInfo.name
                            payload.createdByAvatar = creatorInfo.avatar
                        }
                        else {
                            payload.createdByName = preBore.createdBy?.toString() || ''
                        }
                    }

                    // ── Resolve devcoOperator ──
                    if (preBore.devcoOperator) {
                        const operatorInfo = resolveEmployee(preBore.devcoOperator)
                        if (operatorInfo) {
                            payload.devcoOperatorId = operatorInfo.firebaseId
                            payload.devcoOperatorName = operatorInfo.name
                            payload.devcoOperatorAvatar = operatorInfo.avatar
                        }
                        else {
                            payload.devcoOperatorName = preBore.devcoOperator?.toString() || ''
                        }
                    }

                    // ── Pre-Bore Logs (nested array) ──
                    const rawLogs = Array.isArray(preBore.preBoreLogs) ? preBore.preBoreLogs : []
                    const preBoreLogs = rawLogs.map((log: any, logIdx: number) => {
                        const logLegacyId = log._id ? log._id.toString() : `${preBoreLegacyId}-log-${logIdx}`

                        const logPayload: Record<string, any> = {
                            legacy_id: logLegacyId,
                            rodNumber: log.rodNumber ?? '',
                            distance: log.distance ?? '',
                            topDepth: log.topDepth ?? '',
                            bottomDepth: log.bottomDepth ?? '',
                            overOrUnder: log.overOrUnder ?? '',
                            existingUtilities: log.existingUtilities ?? '',
                            picture: log.picture || '',
                            createdAt: sanitizeForFirestore(log.createdAt) || '',
                        }

                        // Resolve log createdBy
                        if (log.createdBy) {
                            const logCreator = resolveEmployee(log.createdBy)
                            if (logCreator) {
                                logPayload.createdById = logCreator.firebaseId
                                logPayload.createdByName = logCreator.name
                            }
                            else {
                                logPayload.createdByName = log.createdBy?.toString() || ''
                            }
                        }

                        return logPayload
                    })

                    payload.preBoreLogs = preBoreLogs
                    payload.logCount = preBoreLogs.length

                    // Guard: Firestore batch limit is 500 ops
                    if (batchOps >= BATCH_SIZE) {
                        await batch.commit()
                        break
                    }

                    batch.set(docRef, payload, { merge: true })
                    batchOps++
                }
            }

            if (batchOps > 0) {
                await batch.commit()
            }
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
                    batch.delete(preBoreCollection.doc(id))
                    removed++
                }
                await batch.commit()
            }
        }

        const duration = Date.now() - startTime
        invalidatePreBoreCache()

        return {
            success: true,
            message: `Synced ${processedLegacyIds.size} Pre-Bore records to Firebase`,
            stats: { total: processedLegacyIds.size, created, updated, removed, duration },
        }
    }
    catch (error: any) {
        console.error('[Pre-Bore Sync Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Pre-Bore sync failed',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
