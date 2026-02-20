export interface BillingTicket {
  [key: string]: any
  _id: string
  id: string
  legacy_id: string
  estimateId: string | null
  legacy_estimateId: string
  estimateNumber: string
  date: string
  billingTerms: string
  otherBillingTerms: string
  lumpSum: string
  fileName: string
  createdAt: string
  createdBy: string
  createdByName: string
  createdByAvatar: string
  customerId: string
  customerName: string
  service: string
  item: string
  titleDescriptions: { title: string, description: string, _id: string }[]
  titleDescriptionCount: number
  uploads: any[]
  uploadCount: number
  links: any[]
}

// ─── Global cache ───
const _allTickets = ref<BillingTicket[]>([])
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

export function useBillingTicketsApi() {
  /**
   * Fetch all billing tickets from Firebase via our server API.
   */
  async function fetchAllTickets(force = false) {
    if (_isFetched.value && !force)
      return
    if (_isFetching.value && !force)
      return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/billing-tickets', {
        method: 'GET',
      })

      const ticketsArray = Array.isArray(response)
        ? response
        : response?.tickets || response?.data || []

      _allTickets.value = ticketsArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch billing tickets'
      _allTickets.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync billing tickets from MongoDB → Firebase, then re-fetch.
   */
  async function refreshTickets() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/billing-tickets/sync', {
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
    await fetchAllTickets(true)
  }

  return {
    allTickets: _allTickets,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllTickets,
    refreshTickets,
  }
}
