export interface Client {
  [key: string]: any
  _id: string
  id: string
  name: string
  status: string
  addresses: string[]
  contacts: any[]
  documents: any[]
  projectCount: number
  createdAt: string
  updatedAt: string
}

// ─── Global cache: fetch once, reuse across all tabs ───
const _allClients = ref<Client[]>([])
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

export function useClientsApi() {
  /**
   * Fetch all clients from Firebase via our server API.
   */
  async function fetchAllClients(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/clients', {
        method: 'GET',
      })

      const clientsArray = Array.isArray(response)
        ? response
        : response?.clients || response?.data || []

      _allClients.value = clientsArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
        projectCount: item.projectCount || 0,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch clients'
      _allClients.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync clients from MongoDB → Firebase, then re-fetch.
   */
  async function refreshClients() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/clients/sync', {
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
    await fetchAllClients(true)
  }

  return {
    allClients: _allClients,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllClients,
    refreshClients,
  }
}
