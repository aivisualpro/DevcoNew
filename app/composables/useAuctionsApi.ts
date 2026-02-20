export interface AuctionCar {
  [key: string]: any
  id: string
  _id?: string
  appointmentId: string
  imageUrl: string
  make: string
  model: string
  variant: string
  priceDiscovery: number
  yearMonthOfManufacture: string
  odometerReadingInKms: number
  ownerSerialNumber: number
  fuelType: string
  registrationNumber: string
  registeredRto: string
  registrationState: string
  registrationDate: string
  inspectionLocation: string
  isInspected: boolean
  cubicCapacity: number
  oneClickPrice: number
  otobuyOffer: number
  soldAt: number
  highestBid: number
  highestBidder: string
  auctionStartTime: string
  auctionEndTime: string
  auctionDuration: number
  auctionStatus: string
  upcomingTime: string | null
  upcomingUntil: string
  liveAt: string
  soldTo: string | null
  soldToName: string
  customerExpectedPrice: number
  imageUrls: { title: string, url: string }[]
}

// ─── Global cache: fetch once, reuse across all Auction sub-routes ───
const _allCars = ref<AuctionCar[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

export function useAuctionsApi() {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')

  /** Fetch all cars from the API (runs only once, cached globally) */
  async function fetchAllCars(force = false) {
    if (_isFetched.value && !force)
      return
    if (_isFetching.value && !force)
      return

    _isFetching.value = true
    _fetchError.value = null

    try {
      const response = await $fetch<any>(
        `${config.public.apiBaseUrl}car/cars-list`,
        {
          method: 'GET',
          headers: {
            ...(authToken.value ? { Authorization: `Bearer ${authToken.value}` } : {}),
          },
        },
      )

      // Extract cars array from response
      const carsArray = Array.isArray(response)
        ? response
        : response?.cars || response?.data || []

      // Normalize: ensure id field
      _allCars.value = carsArray.map((item: any) => ({
        ...item,
        id: item.id || item._id,
      }))

      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.message || err?.message || 'Failed to fetch cars'
      _allCars.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  /** Force re-fetch */
  async function refreshCars() {
    await fetchAllCars(true)
  }

  return {
    allCars: _allCars,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    fetchAllCars,
    refreshCars,
  }
}
