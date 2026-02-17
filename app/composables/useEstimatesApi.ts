export interface Estimate {
  [key: string]: any
  _id: string
  id: string
  projectName: string
  status: string
  grandTotal: number
  date: string
  proposalWriter: string
  contactName: string
  services: string[]
  createdAt: string
  updatedAt: string
}

// ─── Global cache: fetch once, reuse across all tabs ───
const _allEstimates = ref<Estimate[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

// ─── Sync state ───
const _isSyncing = ref(false)
const _syncResult = ref<{
  success: boolean
  message: string
  stats?: { total: number, created: number, updated: number, removed: number, duration: number }
} | null>(null)

export function useEstimatesApi() {
  /**
   * Fetch all estimates from Firebase via our server API.
   */
  async function fetchAllEstimates(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/estimates', {
        method: 'GET',
      })

      const estimatesArray = Array.isArray(response)
        ? response
        : response?.estimates || response?.data || []

      _allEstimates.value = estimatesArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch estimates'
      _allEstimates.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync estimates from MongoDB → Firebase, then re-fetch.
   */
  async function refreshEstimates() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/estimates/sync', {
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
    await fetchAllEstimates(true)
  }

  return {
    allEstimates: _allEstimates,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllEstimates,
    refreshEstimates,
  }
}
