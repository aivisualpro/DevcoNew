/**
 * GET /api/schedules
 *
 * Reads all schedules from Firestore (devcoSchedules) and returns them.
 * Uses server-side in-memory cache (60s TTL) to avoid repeated Firestore reads.
 * Only fetches the fields the UI actually needs via .select().
 */

// ─── Server-side in-memory cache ───
let _cachedSchedules: any[] | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 60 seconds (schedules change less frequently)

// All the fields the schedule listing + day view uses
const SELECTED_FIELDS = [
  'title', 'fromDate', 'toDate',
  'customerId', 'customerName',
  'estimate',
  'projectManager', 'projectManagerName', 'projectManagerAvatar',
  'foremanName', 'foremanDisplayName', 'foremanAvatar',
  'assignees', 'assigneeDetails',
  'description', 'service', 'item',
  'notifyAssignees', 'perDiem',
  'status', 'legacy_id',
] as const

export function invalidateSchedulesCache() {
  _cachedSchedules = null
  _cacheTimestamp = 0
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const forceRefresh = query.force === 'true' || query.force === '1'

    // Return cached data if fresh
    const now = Date.now()
    if (!forceRefresh && _cachedSchedules && (now - _cacheTimestamp) < CACHE_TTL_MS) {
      return {
        success: true,
        schedules: _cachedSchedules,
        total: _cachedSchedules.length,
        cached: true,
      }
    }

    const firestore = useFirestoreAdmin()
    const snapshot = await firestore
      .collection('devcoSchedules')
      .select(...SELECTED_FIELDS)
      .get()

    const schedules = snapshot.docs.map((doc) => {
      const data = doc.data()

      // Truncate description for list view (line-clamp-2 only shows ~200 chars max)
      let description = data.description || ''
      if (description.length > 200) {
        description = description.substring(0, 200) + '…'
      }

      // Slim down assigneeDetails — strip excessively long avatar URLs (base64 data URIs)
      let assigneeDetails = data.assigneeDetails
      if (Array.isArray(assigneeDetails)) {
        assigneeDetails = assigneeDetails.map((a: any) => ({
          id: a.id,
          name: a.name,
          avatar: typeof a.avatar === 'string' && a.avatar.length > 500 ? '' : (a.avatar || ''),
        }))
      }

      return {
        ...data,
        description,
        assigneeDetails,
        // Also strip overly long PM/foreman avatars
        projectManagerAvatar: typeof data.projectManagerAvatar === 'string' && data.projectManagerAvatar.length > 500 ? '' : (data.projectManagerAvatar || ''),
        foremanAvatar: typeof data.foremanAvatar === 'string' && data.foremanAvatar.length > 500 ? '' : (data.foremanAvatar || ''),
        _id: doc.id,
        id: doc.id,
      }
    })

    // Update cache
    _cachedSchedules = schedules
    _cacheTimestamp = Date.now()

    return {
      success: true,
      schedules,
      total: schedules.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        schedules: [],
        total: 0,
        message: 'No schedules synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Schedules GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedules',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
