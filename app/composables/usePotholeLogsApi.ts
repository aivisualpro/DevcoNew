export interface PotholeItem {
    potholeNo: string | number
    typeOfUtility: string
    soilType: string
    topDepthOfUtility: string | number
    bottomDepthOfUtility: string | number
    photo1: string
    photo2: string
    pin: string
    createdByName?: string
    createdAt: string
}

export interface PotholeLog {
    [key: string]: any
    _id: string
    id: string
    legacy_id: string
    scheduleId: string
    scheduleTitle: string
    estimate: string
    service: string
    item: string
    customerName: string
    date: string
    projectionLocation: string
    potholeItems: PotholeItem[]
    itemCount: number
    createdByName: string
    createdAt: string
    updatedAt: string
}

// ─── Global cache ───
const _allPotholeLogs = ref<PotholeLog[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)

// ─── Request deduplication ───
let _inflightFetch: Promise<void> | null = null

// ─── Sync state ───
const _isSyncing = ref(false)
const _syncResult = ref<{
    success: boolean
    message: string
    stats?: { total: number, created: number, updated: number, removed: number, duration: number }
} | null>(null)

export function usePotholeLogsApi() {
    async function fetchAllPotholeLogs(force = false) {
        if (_isFetched.value && !force)
            return
        if (_isFetching.value && _inflightFetch && !force)
            return _inflightFetch

        _isFetching.value = true
        _fetchError.value = null

        const doFetch = async () => {
            try {
                const url = force ? '/api/pothole-logs?force=1' : '/api/pothole-logs'
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 20_000)

                const response = await $fetch<any>(url, {
                    method: 'GET',
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                const records = Array.isArray(response)
                    ? response
                    : response?.potholeLogs || response?.data || []

                _allPotholeLogs.value = records.map((item: any) => ({
                    ...item,
                    id: item._id || item.id,
                }))

                _isFetched.value = true
            }
            catch (err: any) {
                _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch pothole logs'
                if (!_allPotholeLogs.value.length) {
                    _allPotholeLogs.value = []
                }
            }
            finally {
                _isFetching.value = false
                _inflightFetch = null
            }
        }

        _inflightFetch = doFetch()
        return _inflightFetch
    }

    async function refreshPotholeLogs() {
        _isSyncing.value = true
        _syncResult.value = null

        try {
            const result = await $fetch<any>('/api/pothole-logs/sync', {
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

        await fetchAllPotholeLogs(true)
    }

    return {
        allPotholeLogs: _allPotholeLogs,
        isLoading: _isFetching,
        isFetched: _isFetched,
        fetchError: _fetchError,
        isSyncing: _isSyncing,
        syncResult: _syncResult,
        fetchAllPotholeLogs,
        refreshPotholeLogs,
    }
}
