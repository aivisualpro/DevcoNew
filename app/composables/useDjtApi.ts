export interface DjtRecord {
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
  fromDate: string
  toDate: string
  createdAt: string
  createdBy: string
  createdByName: string
  createdByAvatar: string
  dailyJobDescription: string
  djtCost: number
  clientEmail: string
  customerPrintName: string
  customerSignature: string
  hasCustomerSignature: boolean
  hasAllAssigneeSigns: boolean
  signatureCount: number
  assigneeCount: number
  unsignedAssigneeCount: number
  imageCount: number
  equipmentCount: number
  djtimages: string[]
  equipmentUsed: { equipment: string; type: string; qty: number; cost: number }[]
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
const _allDjt = ref<DjtRecord[]>([])
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

export function useDjtApi() {
  /**
   * Fetch all DJT records from Firebase via our server API.
   */
  async function fetchAllDjt(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/djt', {
        method: 'GET',
      })

      const djtArray = Array.isArray(response)
        ? response
        : response?.djt || response?.data || []

      _allDjt.value = djtArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch DJT records'
      _allDjt.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /**
   * Sync DJT from MongoDB → Firebase, then re-fetch.
   */
  async function refreshDjt() {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/djt/sync', {
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
    await fetchAllDjt(true)
  }

  return {
    allDjt: _allDjt,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllDjt,
    refreshDjt,
  }
}
