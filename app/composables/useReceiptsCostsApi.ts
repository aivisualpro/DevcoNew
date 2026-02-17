export interface ReceiptCostRecord {
  [key: string]: any
  _id: string
  id: string
  legacy_id: string
  estimateId: string | null
  legacy_estimateId: string
  estimateNumber: string
  type: string
  vendor: string
  amount: number
  date: string
  dueDate: string
  remarks: string
  createdAt: string
  createdBy: string
  createdByName: string
  createdByAvatar: string
  approvalStatus: string
  status: string
  paidBy: string
  paidByName: string
  paymentDate: string
  customerName: string
  service: string
  upload: any[]
  uploadCount: number
  tags: { email: string; id?: string; name: string; avatar?: string }[]
  tagCount: number
}

// ─── Global cache ───
const _allRecords = ref<ReceiptCostRecord[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

const _isSyncing = ref(false)
const _syncResult = ref<{
  success: boolean
  message: string
  stats?: { total: number; created: number; updated: number; removed: number; duration: number }
} | null>(null)

export function useReceiptsCostsApi() {
  async function fetchAll(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/receipts-costs', { method: 'GET' })
      const arr = Array.isArray(response) ? response : response?.records || response?.data || []
      _allRecords.value = arr.map((item: any) => ({ ...item, id: item._id || item.id }))
      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch'
      _allRecords.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  async function refresh() {
    _isSyncing.value = true
    _syncResult.value = null
    try {
      const result = await $fetch<any>('/api/receipts-costs/sync', { method: 'POST' })
      _syncResult.value = result
    }
    catch (err: any) {
      _syncResult.value = { success: false, message: err?.data?.data?.message || err?.message || 'Sync failed' }
    }
    finally {
      _isSyncing.value = false
    }
    await fetchAll(true)
  }

  return {
    allRecords: _allRecords,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAll,
    refresh,
  }
}
