export interface TimeCard {
  [key: string]: any
  _id: string
  legacy_id: string
  scheduleId: string | null
  legacy_scheduleId: string
  employeeId: string | null
  employeeName: string
  employeeAvatar: string
  type: string
  clockIn: string | null
  lunchStart: string | null
  lunchEnd: string | null
  clockOut: string | null
  locationIn: any
  locationOut: any
  hourlyRateSITE: number | null
  hourlyRateDrive: number | null
  dumpWashout: any
  comments: string
  createdBy: any
  createdAt: string | null
  distance: number | null
  hours: number | null
}

// ─── Global cache ───
const _allTimeCards = ref<TimeCard[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)
const _isSyncing = ref(false)
const _syncResult = ref<any>(null)

export function useTimeCardsApi() {
  async function fetchAllTimeCards(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/time-cards', { method: 'GET' })
      const arr = response?.timeCards || []
      _allTimeCards.value = arr.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))
      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.message || err?.message || 'Failed to fetch time cards'
      _allTimeCards.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  async function syncTimeCards() {
    _isSyncing.value = true
    _syncResult.value = null
    try {
      const result = await $fetch<any>('/api/time-cards/sync', { method: 'POST' })
      _syncResult.value = result
    }
    catch (err: any) {
      _syncResult.value = {
        success: false,
        message: err?.data?.message || err?.message || 'Sync failed',
      }
    }
    finally {
      _isSyncing.value = false
    }
    await fetchAllTimeCards(true)
  }

  return {
    allTimeCards: _allTimeCards,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllTimeCards,
    syncTimeCards,
  }
}
