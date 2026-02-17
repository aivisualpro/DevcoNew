export interface Schedule {
  [key: string]: any
  _id: string
  id: string
  title: string
  fromDate: string
  toDate: string
  customerId: string
  customerName: string
  estimate: string
  projectManager: string
  projectManagerName: string
  projectManagerAvatar: string
  foremanName: string
  foremanDisplayName: string
  foremanAvatar: string
  assignees: string[]
  assigneeDetails: { id: string; name: string; avatar: string }[]
  description: string
  service: string
  item: string
  notifyAssignees: boolean
  perDiem: boolean
}

// ─── Global cache: fetch once, reuse across all tabs ───
const _allSchedules = ref<Schedule[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

// ─── Sync state ───
const _isSyncing = ref(false)
const _syncResult = ref<{
  success: boolean
  message: string
  stats?: { total: number; created: number; updated: number; removed: number; duration: number }
} | null>(null)

export function useScheduledJobsApi() {
  /**
   * Fetch all schedules from Firebase via our server API.
   */
  async function fetchAllSchedules(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/schedules', {
        method: 'GET',
      })

      const schedulesArray = Array.isArray(response)
        ? response
        : response?.schedules || response?.data || []

      _allSchedules.value = schedulesArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch schedules'
      _allSchedules.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync schedules from MongoDB → Firebase, then re-fetch.
   */
  async function refreshSchedules() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/schedules/sync', {
        method: 'POST',
      })
      _syncResult.value = result
    }
    catch (err: any) {
      _syncResult.value = {
        success: false,
        message: err?.data?.data?.message || err?.data?.message || err?.message || 'Sync failed',
      }
    }
    finally {
      _isSyncing.value = false
    }

    // Re-fetch from Firebase
    await fetchAllSchedules(true)
  }

  return {
    allSchedules: _allSchedules,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllSchedules,
    refreshSchedules,
  }
}
