// ─── Server-side in-memory cache for Pre-Bore records ───
// This is a separate file to avoid circular-import issues in Nitro API routes.

let _cachedPreBore: any[] | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 60_000 // 60 seconds

export function getPreBoreCache(): { data: any[] | null, timestamp: number, ttl: number } {
    return { data: _cachedPreBore, timestamp: _cacheTimestamp, ttl: CACHE_TTL_MS }
}

export function setPreBoreCache(records: any[]) {
    _cachedPreBore = records
    _cacheTimestamp = Date.now()
}

export function invalidatePreBoreCache() {
    _cachedPreBore = null
    _cacheTimestamp = 0
}
