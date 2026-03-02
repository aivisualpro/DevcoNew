// ─── Server-side in-memory cache for Pothole Logs ───
let _cachedPotholeLogs: any[] | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

export function getPotholeLogsCache(): { data: any[] | null, timestamp: number, ttl: number } {
    return { data: _cachedPotholeLogs, timestamp: _cacheTimestamp, ttl: CACHE_TTL_MS }
}

export function setPotholeLogsCache(records: any[]) {
    _cachedPotholeLogs = records
    _cacheTimestamp = Date.now()
}

export function invalidatePotholeLogsCache() {
    _cachedPotholeLogs = null
    _cacheTimestamp = 0
}
