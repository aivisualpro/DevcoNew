/**
 * GET /api/pre-bore
 *
 * Reads all Pre-Bore records from Firebase (preBore) and returns them.
 * Uses server-side in-memory cache (60s TTL) for fast loading.
 */
import { getPreBoreCache, setPreBoreCache } from '../../utils/preBoreCache'

const SELECTED_FIELDS = [
    'legacy_id', 'scheduleId', 'legacy_scheduleId',
    'scheduleTitle', 'estimate', 'service', 'item',
    'customerName', 'customerForeman', 'customerWorkRequestNumber',
    'date', 'startTime',
    'addressBoreStart', 'addressBoreEnd',
    'devcoOperator', 'devcoOperatorName', 'devcoOperatorAvatar',
    'drillSize', 'pilotBoreSize',
    'reamerSize6', 'reamerSize8', 'reamerSize10', 'reamerSize12',
    'soilType', 'boreLength', 'pipeSize',
    'foremanSignature', 'customerSignature',
    'hasForemanSignature', 'hasCustomerSignature',
    'preBoreLogs', 'logCount',
    'createdByName', 'createdByAvatar', 'createdAt',
] as const

export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event)
        const forceRefresh = query.force === 'true' || query.force === '1'

        // Return cached data if fresh
        const cache = getPreBoreCache()
        const now = Date.now()
        if (!forceRefresh && cache.data && (now - cache.timestamp) < cache.ttl) {
            return {
                success: true,
                preBore: cache.data,
                total: cache.data.length,
                cached: true,
            }
        }

        const firestore = useFirestoreAdmin()
        const snapshot = await firestore
            .collection('preBore')
            .select(...SELECTED_FIELDS)
            .get()

        const preBoreRecords = snapshot.docs.map((doc) => {
            const data = doc.data()

            // Strip large signature data URIs for list view
            return {
                ...data,
                foremanSignature: typeof data.foremanSignature === 'string' && data.foremanSignature.length > 500 ? '[signature]' : (data.foremanSignature || ''),
                customerSignature: typeof data.customerSignature === 'string' && data.customerSignature.length > 500 ? '[signature]' : (data.customerSignature || ''),
                _id: doc.id,
                id: doc.id,
            }
        })

        // Update cache
        setPreBoreCache(preBoreRecords)

        return {
            success: true,
            preBore: preBoreRecords,
            total: preBoreRecords.length,
        }
    }
    catch (error: any) {
        if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
            return {
                success: true,
                preBore: [],
                total: 0,
                message: 'No Pre-Bore records synced yet. Press Refresh to sync from MongoDB.',
            }
        }

        console.error('[Pre-Bore GET Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch Pre-Bore records',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
