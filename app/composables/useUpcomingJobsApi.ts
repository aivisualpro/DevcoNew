export interface TelecallingLead {
  [key: string]: any
  _id: string
  id: string
  appointmentId: string
  carRegistrationNumber: string
  yearOfRegistration: string
  ownerName: string
  ownershipSerialNumber: number
  make: string
  model: string
  variant: string
  emailAddress: string
  appointmentSource: string
  vehicleStatus: string
  zipCode: string
  customerContactNumber: string
  city: string
  yearOfManufacture: string
  allocatedTo: string
  inspectionStatus: string
  approvalStatus: string
  priority: string
  ncdUcdName: string
  repName: string
  repContact: string
  bankSource: string
  referenceName: string
  remarks: string
  createdBy: string
  odometerReadingInKms: number
  additionalNotes: string
  carImages: string[]
  inspectionDateTime: string
  inspectionAddress: string
  inspectionEngineerNumber: string
  addedBy: string
  timeStamp: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  data: TelecallingLead[]
  total?: number
  totalCount?: number
  totalPages?: number
  page?: number
  limit?: number
}

// ─── Global cache: fetch once, reuse across all route views ───
const _allLeads = ref<TelecallingLead[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

export function useUpcomingJobsApi() {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')

  /** Fetch all leads from the API (runs only once, cached globally) */
  async function fetchAllLeads(force = false) {
    // Skip if already fetched & not forced
    if (_isFetched.value && !force)
      return
    // Skip if another call is already in-flight
    if (_isFetching.value && !force)
      return

    _isFetching.value = true
    _fetchError.value = null

    try {
      // Fetch with a large limit to get all records in one shot
      const response = await $fetch<ApiResponse>(
        `${config.public.apiBaseUrl}admin/telecallings/get-list`,
        {
          method: 'GET',
          params: { page: 1, limit: 10000 },
          headers: {
            ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
          },
        },
      )

      // Extract the leads array from whatever shape the API returns
      const responseData = (response as any)?.data || response
      const leadsArray = Array.isArray(responseData) ? responseData : responseData?.data || []

      // Normalize: map _id → id
      _allLeads.value = leadsArray.map((item: any) => ({
        ...item,
        id: item._id || item.id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      console.error('Failed to fetch leads:', err)
      _fetchError.value = err?.data?.message || err?.message || 'Failed to fetch leads'
      _allLeads.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /** Force re-fetch (e.g. after create/edit/delete or manual refresh) */
  async function refreshLeads() {
    await fetchAllLeads(true)
  }

  return {
    allLeads: _allLeads,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    fetchAllLeads,
    refreshLeads,
  }
}
