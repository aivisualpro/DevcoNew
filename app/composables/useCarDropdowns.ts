// ─── Car Dropdowns API ───
// Fetches make/model/variant data from the API and caches globally.
// Supports cascading: selecting a Make filters available Models,
// selecting a Model filters available Variants.

interface CarDropdownItem {
  [key: string]: any
  _id: string
  make: string
  model: string
  variant: string
}

interface CarDropdownResponse {
  data: CarDropdownItem[]
  total?: number
  totalCount?: number
}

// Global cache
const _carDropdowns = ref<CarDropdownItem[]>([])
const _carDropdownsFetched = ref(false)
const _carDropdownsFetching = ref(false)

export function useCarDropdowns() {
  const config = useRuntimeConfig()
  const authToken = useCookie('authToken')

  async function fetchCarDropdowns(force = false) {
    if (_carDropdownsFetched.value && !force)
      return
    if (_carDropdownsFetching.value && !force)
      return

    _carDropdownsFetching.value = true

    try {
      const response = await $fetch<CarDropdownResponse>(
        `${config.public.apiBaseUrl}admin/customers/car-dropdowns/get-list`,
        {
          method: 'GET',
          params: { page: 1, limit: 10000, search: '' },
          headers: {
            Authorization: `Bearer ${authToken.value}`,
          },
        },
      )

      _carDropdowns.value = response.data || []
      _carDropdownsFetched.value = true
    }
    catch (err: any) {
      console.error('Failed to fetch car dropdowns:', err)
    }
    finally {
      _carDropdownsFetching.value = false
    }
  }

  // Unique makes
  const makes = computed(() => {
    const set = new Set<string>()
    _carDropdowns.value.forEach((item) => {
      if (item.make)
        set.add(item.make)
    })
    return Array.from(set).sort()
  })

  // Models filtered by selected make
  function getModels(selectedMake: string) {
    const set = new Set<string>()
    _carDropdowns.value.forEach((item) => {
      if (item.make === selectedMake && item.model) {
        set.add(item.model)
      }
    })
    return Array.from(set).sort()
  }

  // Variants filtered by selected make + model
  function getVariants(selectedMake: string, selectedModel: string) {
    const set = new Set<string>()
    _carDropdowns.value.forEach((item) => {
      if (item.make === selectedMake && item.model === selectedModel && item.variant) {
        set.add(item.variant)
      }
    })
    return Array.from(set).sort()
  }

  return {
    carDropdowns: _carDropdowns,
    isFetched: _carDropdownsFetched,
    makes,
    getModels,
    getVariants,
    fetchCarDropdowns,
  }
}
