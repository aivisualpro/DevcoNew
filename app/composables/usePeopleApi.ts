export interface PeopleUser {
  [key: string]: any
  _id: string
  id: string
  userRole: string
  phoneNumber: string
  location: string
  userName: string
  email: string
  dealershipName: string
  image: string
  entityType: string
  isStaff: boolean
  primaryContactPerson: string
  primaryContactNumber: string
  secondaryContactPerson: string
  secondaryContactNumber: string
  addressList: string[]
  approvalStatus: string
  rejectionComment: string
  wishlist: string[]
  myBids: string[]
  purchasedCars: string[]
  assignedKam: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

// ─── Global cache: fetch once, reuse across all People sub-routes ───
const _allUsers = ref<PeopleUser[]>([])
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

export function usePeopleApi() {
  /** Fetch all employees from Firebase via our server API */
  async function fetchAllUsers(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>('/api/employees', {
        method: 'GET',
      })

      // Extract users array from response
      const usersArray = Array.isArray(response)
        ? response
        : response?.users || response?.data || []

      // Normalize: map _id → id
      _allUsers.value = usersArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch employees'
      _allUsers.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /** Sync employees from MongoDB → Firebase via server API */
  async function syncToFirebase(): Promise<typeof _syncResult.value> {
    _isSyncing.value = true
    _syncResult.value = null

    try {
      const result = await $fetch<any>('/api/employees/sync', {
        method: 'POST',
      })

      _syncResult.value = result
      return result
    }
    catch (err: any) {
      const errorResult = {
        success: false,
        message: err?.data?.data?.message || err?.message || 'Sync failed',
      }
      _syncResult.value = errorResult
      return errorResult
    }
    finally {
      _isSyncing.value = false
    }
  }

  /** Force re-fetch + sync to Firebase */
  async function refreshUsers() {
    // 1. Sync MongoDB → Firebase
    await syncToFirebase()
    // 2. Re-fetch the latest data for display
    await fetchAllUsers(true)
  }

  return {
    allUsers: _allUsers,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllUsers,
    refreshUsers,
    syncToFirebase,
  }
}

