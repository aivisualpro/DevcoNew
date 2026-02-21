export interface TimeCard {
  [key: string]: any
  _id: string
  legacy_id: string
  scheduleId: string | null
  legacy_scheduleId: string
  employeeId: string | null
  employeeName: string
  employeeAvatar: string
  type: string
  clockIn: string | null
  lunchStart: string | null
  lunchEnd: string | null
  clockOut: string | null
  locationIn: any
  locationOut: any
  hourlyRateSITE: number | null
  hourlyRateDrive: number | null
  dumpWashout: any
  comments: string
  createdBy: any
  createdAt: string | null
  distance: number | null
  hours: number | null
}

// ─── Global cache ───
const _allTimeCards = ref<TimeCard[]>([])
const _isFetched = ref(false)
const _isFetching = ref(false)
const _fetchError = ref<string | null>(null)
const _isSyncing = ref(false)
const _syncResult = ref<any>(null)

export function useTimeCardsApi() {
  /**
   * Calculate hours for SITE TIME entries:
   * Duration = (clockOut - clockIn) - (lunchEnd - lunchStart)
   * Then round minutes to nearest quarter-hour:
   *   1-14 min  → :00
   *   15-29 min → :15
   *   30-44 min → :30
   *   45-59 min → :45
   * Returns null if the required fields are missing.
   */
  function calculateSiteHours(tc: any): number | null {
    if (!tc.clockIn || !tc.clockOut) return null
    const clockIn = new Date(tc.clockIn).getTime()
    const clockOut = new Date(tc.clockOut).getTime()
    if (isNaN(clockIn) || isNaN(clockOut)) return null

    let totalMs = clockOut - clockIn

    // Subtract lunch break if both start and end are present
    if (tc.lunchStart && tc.lunchEnd) {
      const lunchStart = new Date(tc.lunchStart).getTime()
      const lunchEnd = new Date(tc.lunchEnd).getTime()
      if (!isNaN(lunchStart) && !isNaN(lunchEnd)) {
        totalMs -= (lunchEnd - lunchStart)
      }
    }

    // Convert ms → total minutes
    const totalMinutes = totalMs / (1000 * 60)
    const wholeHours = Math.floor(totalMinutes / 60)
    const remainingMinutes = Math.floor(totalMinutes % 60)

    // Round minutes to nearest quarter-hour
    let roundedMinutes: number
    if (remainingMinutes <= 14) roundedMinutes = 0
    else if (remainingMinutes <= 29) roundedMinutes = 15
    else if (remainingMinutes <= 44) roundedMinutes = 30
    else roundedMinutes = 45

    // Return as decimal hours (e.g. 8h 15m = 8.25)
    return wholeHours + (roundedMinutes / 60)
  }

  /**
   * Calculate road distance in miles between locationIn and locationOut
   * using the Haversine formula with a 1.3x road detour factor.
   */
  function calculateDriveDistance(tc: any): number | null {
    const locIn = tc.locationIn
    const locOut = tc.locationOut
    if (!locIn || !locOut) return null

    // Extract lat/lng — handle { lat, lng }, { latitude, longitude }, or [lat, lng]
    const latIn = Number(locIn.lat ?? locIn.latitude ?? locIn[0])
    const lngIn = Number(locIn.lng ?? locIn.longitude ?? locIn[1])
    const latOut = Number(locOut.lat ?? locOut.latitude ?? locOut[0])
    const lngOut = Number(locOut.lng ?? locOut.longitude ?? locOut[1])

    if (isNaN(latIn) || isNaN(lngIn) || isNaN(latOut) || isNaN(lngOut)) return null
    if (latIn === 0 && lngIn === 0) return null
    if (latOut === 0 && lngOut === 0) return null

    // Haversine formula
    const R = 3958.8 // Earth radius in miles
    const dLat = (latOut - latIn) * Math.PI / 180
    const dLng = (lngOut - lngIn) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(latIn * Math.PI / 180)
      * Math.cos(latOut * Math.PI / 180)
      * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const straightLine = R * c

    // Apply 1.3x road detour factor
    const roadDistance = straightLine * 1.3
    return Math.round(roadDistance * 10) / 10 // round to 1 decimal
  }

  /**
   * Normalize a time field value into a consistent format.
   * Handles bare "12:00:00" times, Firestore timestamps { _seconds }, etc.
   */
  function normalizeTimeField(val: any): string | null {
    if (!val) return null

    // Firestore Timestamp object → ISO string
    if (typeof val === 'object' && val._seconds) {
      return new Date(val._seconds * 1000).toISOString()
    }

    if (typeof val !== 'string') return String(val)

    const trimmed = val.trim()

    // Already ISO or full date → return as-is
    if (trimmed.includes('T') || trimmed.includes('/')) return trimmed

    // Bare 24-hour time like "12:00:00" or "7:30:00" → convert to ISO
    const bareMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
    if (bareMatch) {
      const h = bareMatch[1]!.padStart(2, '0')
      const m = bareMatch[2]!
      const s = bareMatch[3] || '00'
      return `2000-01-01T${h}:${m}:${s}.000Z`
    }

    return trimmed
  }

  async function fetchAllTimeCards(force = false) {
    if (_isFetched.value && !force) return
    if (_isFetching.value && !force) return

    _isFetching.value = true
    _fetchError.value = null

    try {
      // Fetch time cards and employees in parallel
      const [tcResponse, empResponse] = await Promise.all([
        $fetch<any>('/api/time-cards', { method: 'GET' }),
        $fetch<any>('/api/employees', { method: 'GET' }),
      ])

      // Build employee rate lookup by name (case-insensitive)
      const empRateMap = new Map<string, { rateSite: number | null, rateDrive: number | null }>()
      const empArr = Array.isArray(empResponse) ? empResponse : empResponse?.users || empResponse?.data || []
      for (const emp of empArr) {
        const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase()
        if (name) {
          empRateMap.set(name, {
            rateSite: emp.hourlyRateSITE ?? null,
            rateDrive: emp.hourlyRateDrive ?? null,
          })
        }
      }

      const arr = tcResponse?.timeCards || []
      _allTimeCards.value = arr.map((item: any) => {
        const tc = {
          ...item,
          id: item._id || item.id,
          // Normalize type to uppercase (e.g. "Site Time" → "SITE TIME")
          type: item.type ? String(item.type).toUpperCase() : item.type,
          // Normalize lunch fields so formatTime always gets a consistent format
          lunchStart: normalizeTimeField(item.lunchStart),
          lunchEnd: normalizeTimeField(item.lunchEnd),
        }

        // Fill missing rates from employee profile
        const empName = (tc.employeeName || '').toLowerCase()
        const empRates = empRateMap.get(empName)
        if (empRates) {
          if (!tc.hourlyRateSITE && tc.hourlyRateSITE !== 0 && empRates.rateSite) {
            tc.hourlyRateSITE = empRates.rateSite
          }
          if (!tc.hourlyRateDrive && tc.hourlyRateDrive !== 0 && empRates.rateDrive) {
            tc.hourlyRateDrive = empRates.rateDrive
          }
        }

        // If hours is blank/null/0 and type is SITE TIME, calculate it
        if ((!tc.hours || tc.hours === 0) && tc.type === 'SITE TIME') {
          const calculated = calculateSiteHours(tc)
          if (calculated !== null && calculated > 0) {
            tc.hours = calculated
          }
        }

        // If type is DRIVE TIME and distance is empty, calculate from locations
        if (tc.type === 'DRIVE TIME' && (!tc.distance || tc.distance === 0)) {
          const dist = calculateDriveDistance(tc)
          if (dist !== null && dist > 0) {
            tc.distance = dist
            tc._distanceCalculated = true
          }
        }

        // If type is DRIVE TIME and hours is empty, calculate from distance
        if (tc.type === 'DRIVE TIME' && (!tc.hours || tc.hours === 0) && tc.distance > 0) {
          tc.hours = Math.round((tc.distance / 55) * 100) / 100
        }

        return tc
      })
      _isFetched.value = true
    }
    catch (err: any) {
      _fetchError.value = err?.data?.message || err?.message || 'Failed to fetch time cards'
      _allTimeCards.value = []
    }
    finally {
      _isFetching.value = false
    }
  }

  async function syncTimeCards() {
    _isSyncing.value = true
    _syncResult.value = null
    try {
      const result = await $fetch<any>('/api/time-cards/sync', { method: 'POST' })
      _syncResult.value = result
    }
    catch (err: any) {
      _syncResult.value = {
        success: false,
        message: err?.data?.message || err?.message || 'Sync failed',
      }
    }
    finally {
      _isSyncing.value = false
    }
    await fetchAllTimeCards(true)
  }

  return {
    allTimeCards: _allTimeCards,
    isLoading: _isFetching,
    isFetched: _isFetched,
    fetchError: _fetchError,
    isSyncing: _isSyncing,
    syncResult: _syncResult,
    fetchAllTimeCards,
    syncTimeCards,
  }
}
