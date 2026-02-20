export interface JhaRecord {
  [key: string]: any
  _id: string
  id: string
  legacy_id: string
  scheduleId: string | null
  legacy_scheduleId: string
  scheduleTitle: string
  estimate: string
  service: string
  item: string
  customerId: string
  customerName: string
  date: string
  jhaTime: string
  createdBy: string
  createdByName: string
  createdByAvatar: string
  clientEmail: string
  hasClientSign: boolean
  hasAllAssigneeSigns: boolean
  signatureCount: number
  assigneeCount: number
  unsignedAssigneeCount: number
  signatures: {
    employee: string
    employeeId?: string
    employeeName?: string
    employeeAvatar?: string
    signature: string
    createdAt: string
    location: string
  }[]
  assigneeDetails: {
    id?: string
    name: string
    email: string
    avatar?: string
  }[]
}

// ─── Global cache ───
const _allJha = ref<JhaRecord[]>([])
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

export function useJhaApi() {
  /**
   * Fetch all JHA records from Firebase via our server API.
   */
  async function fetchAllJha(force = false) {
    if (_isFetched.value && !force)
      return
    if (_isFetching.value && !force)
      return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/jha', {
        method: 'GET',
      })

      const jhaArray = Array.isArray(response)
        ? response
        : response?.jha || response?.data || []

      _allJha.value = jhaArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch JHA records'
      _allJha.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync JHA from MongoDB → Firebase, then re-fetch.
   */
  async function refreshJha() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/jha/sync', {
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
    await fetchAllJha(true)
  }

  return {
    allJha: _allJha,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllJha,
    refreshJha,
  }
}
