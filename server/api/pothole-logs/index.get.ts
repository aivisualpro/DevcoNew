/**
 * GET /api/pothole-logs
 *
 * Reads all Pothole Log records from Firebase (DevcoPotholeLogs).
 * Uses server-side in-memory cache (60s TTL) for fast loading.
 */
import { getPotholeLogsCache, setPotholeLogsCache } from '../../utils/potholeLogsCache'

const SELECTED_FIELDS = [
    'legacy_id', 'scheduleId', 'scheduleTitle',
    'estimate', 'service', 'item', 'customerName',
    'date', 'projectionLocation',
    'potholeItems', 'itemCount',
    'createdByName', 'createdByAvatar', 'createdAt', 'updatedAt',
] as const

export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event)
        const forceRefresh = query.force === 'true' || query.force === '1'

        // Return cached data if fresh
        const cache = getPotholeLogsCache()
        const now = Date.now()
        if (!forceRefresh && cache.data && (now - cache.timestamp) < cache.ttl) {
            return {
                success: true,
                potholeLogs: cache.data,
                total: cache.data.length,
                cached: true,
            }
        }

        const firestore = useFirestoreAdmin()
        const snapshot = await firestore
            .collection('DevcoPotholeLogs')
            .select(...SELECTED_FIELDS)
            .get()

        const records = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
                ...data,
                _id: doc.id,
                id: doc.id,
            }
        })

        // Update cache
        setPotholeLogsCache(records)

        return {
            success: true,
            potholeLogs: records,
            total: records.length,
        }
    }
    catch (error: any) {
        if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
            return {
                success: true,
                potholeLogs: [],
                total: 0,
                message: 'No Pothole Log records synced yet. Press Refresh to sync from MongoDB.',
            }
        }

        console.error('[Pothole Logs GET Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch Pothole Log records',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
