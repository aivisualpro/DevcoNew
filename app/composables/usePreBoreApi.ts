export interface PreBoreLog {
    legacy_id: string
    rodNumber: string | number
    distance: string | number
    topDepth: string | number
    bottomDepth: string | number
    overOrUnder: string
    existingUtilities: string
    picture: string
    createdByName?: string
    createdAt: string
}

export interface PreBore {
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
    customerForeman: string
    customerWorkRequestNumber: string
    date: string
    startTime: string
    addressBoreStart: string
    addressBoreEnd: string
    devcoOperator: string
    devcoOperatorName: string
    drillSize: string
    pilotBoreSize: string
    reamerSize6: string
    reamerSize8: string
    reamerSize10: string
    reamerSize12: string
    soilType: string
    boreLength: string
    pipeSize: string
    hasForemanSignature: boolean
    hasCustomerSignature: boolean
    preBoreLogs: PreBoreLog[]
    logCount: number
    createdByName: string
    createdAt: string
}

// ─── Global cache ───
const _allPreBore = ref<PreBore[]>([])
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

export function usePreBoreApi() {
    async function fetchAllPreBore(force = false) {
        if (_isFetched.value && !force)
            return
        if (_isFetching.value && _inflightFetch && !force)
            return _inflightFetch

        _isFetching.value = true
        _fetchError.value = null

        const doFetch = async () => {
            try {
                const url = force ? '/api/pre-bore?force=1' : '/api/pre-bore'
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 20_000)

                const response = await $fetch<any>(url, {
                    method: 'GET',
                    signal: controller.signal,
                })

                clearTimeout(timeoutId)

                const records = Array.isArray(response)
                    ? response
                    : response?.preBore || response?.data || []

                _allPreBore.value = records.map((item: any) => ({
                    ...item,
                    id: item._id || item.id,
                }))

                _isFetched.value = true
            }
            catch (err: any) {
                _fetchError.value = err?.data?.data?.message || err?.data?.message || err?.message || 'Failed to fetch pre-bore records'
                if (!_allPreBore.value.length) {
                    _allPreBore.value = []
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

    async function refreshPreBore() {
        _isSyncing.value = true
        _syncResult.value = null

        try {
            const result = await $fetch<any>('/api/pre-bore/sync', {
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

        await fetchAllPreBore(true)
    }

    return {
        allPreBore: _allPreBore,
        isLoading: _isFetching,
        isFetched: _isFetched,
        fetchError: _fetchError,
        isSyncing: _isSyncing,
        syncResult: _syncResult,
        fetchAllPreBore,
        refreshPreBore,
    }
}
