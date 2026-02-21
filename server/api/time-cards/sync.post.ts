import { FieldValue } from 'firebase-admin/firestore'
import { ObjectId } from 'mongodb'
import { useMongoClient } from '../../utils/mongodb'

/**
 * Deep-convert a MongoDB document into a Firestore-safe plain object.
 */
function sanitizeForFirestore(value: any): any {
  if (value === null || value === undefined)
    return null
  if (value instanceof ObjectId || (value && typeof value.toHexString === 'function'))
    return value.toString()
  if (value instanceof Date)
    return value.toISOString()
  if (Buffer.isBuffer(value))
    return value.toString('base64')
  // MongoDB numeric types (Double, Int32, Long) — extract the raw number
  if (typeof value === 'object' && value !== null && typeof value.valueOf === 'function') {
    const raw = value.valueOf()
    if (typeof raw === 'number' || typeof raw === 'bigint')
      return Number(raw)
  }
  if (Array.isArray(value))
    return value.map(sanitizeForFirestore)
  if (typeof value === 'object' && value !== null) {
    if (value.constructor && value.constructor !== Object)
      return value.toString()
    const result: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(v)
      if (sanitized !== undefined)
        result[k] = sanitized
    }
    return result
  }
  return value
}

/**
 * Extract a clean { lat, lng } from various MongoDB location formats.
 * Handles: { latitude, longitude }, { lat, lng }, GeoJSON { type, coordinates },
 * plain arrays [lat, lng], and nested $numberDouble wrappers.
 */
function extractLocation(loc: any): { lat: number, lng: number } | null {
  if (!loc) return null

  // String format: "33.498991, -117.157243"
  if (typeof loc === 'string') {
    const parts = loc.split(',').map((s: string) => s.trim())
    if (parts.length >= 2) {
      const lat = Number(parts[0])
      const lng = Number(parts[1])
      if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng }
    }
    return null
  }

  // GeoJSON: { type: 'Point', coordinates: [lng, lat] }
  if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
    const lng = Number(loc.coordinates[0]?.$numberDouble ?? loc.coordinates[0])
    const lat = Number(loc.coordinates[1]?.$numberDouble ?? loc.coordinates[1])
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng }
    return null
  }

  // Plain object with lat/lng or latitude/longitude
  const rawLat = loc.lat ?? loc.latitude
  const rawLng = loc.lng ?? loc.longitude
  if (rawLat !== undefined && rawLng !== undefined) {
    const lat = Number(rawLat?.$numberDouble ?? rawLat?.valueOf?.() ?? rawLat)
    const lng = Number(rawLng?.$numberDouble ?? rawLng?.valueOf?.() ?? rawLng)
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng }
    return null
  }

  // Array: [lat, lng]
  if (Array.isArray(loc) && loc.length >= 2) {
    const lat = Number(loc[0]?.$numberDouble ?? loc[0])
    const lng = Number(loc[1]?.$numberDouble ?? loc[1])
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) return { lat, lng }
    return null
  }

  return null
}

/**
 * POST /api/time-cards/sync
 *
 * Extracts timesheet arrays from MongoDB `devcoschedules` and flattens them
 * into individual time card documents in Firestore `devcoTimeCards`.
 *
 * Strategy:
 *   1. Load reference maps (employees, schedules) from Firestore
 *   2. Fetch all `devcoschedules` docs that have a `timesheet` array
 *   3. For each timesheet entry, create a flat time card with:
 *      - legacy_id = timesheet entry's _id (from MongoDB)
 *      - employee resolved to Firebase ID
 *      - scheduleId resolved to Firebase ID
 *      - All time fields stored as-is (no timezone conversion)
 *   4. Upsert using legacy_id to avoid duplicates, update if changed
 */
export default defineEventHandler(async () => {
  const startTime = Date.now()

  try {
    const firestore = useFirestoreAdmin()

    // ── Step 1: Load Reference Maps ──

    // A. Employees: Legacy MongoDB ID → Firebase ID + name
    const employeesSnap = await firestore.collection('devcoEmployees').get()
    const empByLegacyId = new Map<string, { firebaseId: string, name: string, avatar: string }>()
    const empByName = new Map<string, { firebaseId: string, name: string, avatar: string }>()

    employeesSnap.docs.forEach((doc) => {
      const d = doc.data()
      const info = {
        firebaseId: doc.id,
        name: `${d.firstName || ''} ${d.lastName || ''}`.trim(),
        avatar: d.profilePicture || d.image || '',
      }
      if (d.legacy_id)
        empByLegacyId.set(d.legacy_id.toString(), info)
      if (info.name)
        empByName.set(info.name.toLowerCase(), info)
    })

    // B. Schedules: Legacy MongoDB ID → Firebase ID
    const schedulesSnap = await firestore.collection('devcoSchedules').select('legacy_id').get()
    const scheduleByLegacyId = new Map<string, string>()
    schedulesSnap.docs.forEach((doc) => {
      const d = doc.data()
      if (d.legacy_id)
        scheduleByLegacyId.set(d.legacy_id, doc.id)
    })

    // ── Step 2: Fetch timesheet arrays from MongoDB ──
    const mongoClient = await useMongoClient()
    const db = mongoClient.db('devco')
    const mongoSchedules = await db.collection('devcoschedules').find(
      { timesheet: { $exists: true, $ne: [] } },
      { projection: { _id: 1, timesheet: 1, fromDate: 1 } },
    ).toArray()

    if (!mongoSchedules.length) {
      return {
        success: true,
        message: 'No timesheets found in MongoDB schedules',
        stats: { total: 0, created: 0, updated: 0, duration: Date.now() - startTime },
      }
    }

    // ── Step 3: Build existing time cards map ──
    const firestoreCollection = firestore.collection('devcoTimeCards')
    const legacyIdToDocId = new Map<string, string>()

    try {
      const existingSnapshot = await firestoreCollection.select('legacy_id').get()
      for (const doc of existingSnapshot.docs) {
        const legacyId = doc.data().legacy_id
        if (legacyId)
          legacyIdToDocId.set(legacyId, doc.id)
      }
    }
    catch {
      // Collection doesn't exist yet
    }

    // Helper: resolve employee
    function resolveEmployee(raw: any): { firebaseId: string, name: string, avatar: string } | null {
      if (!raw) return null
      const str = raw.toString().trim()
      let info = empByLegacyId.get(str)
      if (!info) info = empByName.get(str.toLowerCase())
      return info || null
    }

    // ── Step 4: Flatten & upsert ──
    const BATCH_SIZE = 450
    let created = 0
    let updated = 0
    let totalEntries = 0
    const allEntries: { legacyId: string, payload: Record<string, any> }[] = []

    for (const schedule of mongoSchedules) {
      const scheduleLegacyId = schedule._id.toString()
      const scheduleFirebaseId = scheduleByLegacyId.get(scheduleLegacyId) || null
      const timesheetArray = schedule.timesheet || []
      const scheduleFromDate = schedule.fromDate ? sanitizeForFirestore(schedule.fromDate) : null

      for (const entry of timesheetArray) {
        if (!entry || !entry._id) continue
        totalEntries++
        const entryLegacyId = entry._id.toString()

        // Resolve employee reference
        const empInfo = resolveEmployee(entry.employee)

        const payload: Record<string, any> = {
          legacy_id: entryLegacyId,
          scheduleId: scheduleFirebaseId,
          legacy_scheduleId: scheduleLegacyId,
          employeeId: empInfo?.firebaseId || null,
          employeeName: empInfo?.name || (entry.employee ? entry.employee.toString() : ''),
          employeeAvatar: empInfo?.avatar || '',
          legacy_employeeId: entry.employee ? entry.employee.toString() : null,
          type: entry.type || '',
          clockIn: entry.clockIn ? sanitizeForFirestore(entry.clockIn) : null,
          lunchStart: entry.lunchStart ? sanitizeForFirestore(entry.lunchStart) : null,
          lunchEnd: entry.lunchEnd ? sanitizeForFirestore(entry.lunchEnd) : null,
          clockOut: entry.clockOut ? sanitizeForFirestore(entry.clockOut) : null,
          locationIn: extractLocation(entry.locationIn),
          locationOut: extractLocation(entry.locationOut),
          hourlyRateSITE: entry.hourlyRateSITE ?? null,
          hourlyRateDrive: entry.hourlyRateDrive ?? null,
          dumpWashout: entry.dumpWashout ?? null,
          comments: entry.comments || '',
          createdBy: entry.createdBy ? sanitizeForFirestore(entry.createdBy) : null,
          createdAt: entry.createdAt ? sanitizeForFirestore(entry.createdAt) : null,
          distance: entry.distance ?? null,
          hours: entry.hours ?? null,
          scheduleDate: scheduleFromDate,
          _syncedAt: FieldValue.serverTimestamp(),
        }

        allEntries.push({ legacyId: entryLegacyId, payload })
      }
    }

    // Batch write
    for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
      const batch = firestore.batch()
      const chunk = allEntries.slice(i, i + BATCH_SIZE)

      for (const { legacyId, payload } of chunk) {
        const existingDocId = legacyIdToDocId.get(legacyId)
        if (existingDocId) {
          batch.set(firestoreCollection.doc(existingDocId), payload, { merge: true })
          updated++
        }
        else {
          batch.set(firestoreCollection.doc(), payload)
          created++
        }
      }

      await batch.commit()
    }

    const duration = Date.now() - startTime

    return {
      success: true,
      message: `Synced ${totalEntries} time cards from ${mongoSchedules.length} schedules`,
      stats: {
        total: totalEntries,
        schedules: mongoSchedules.length,
        created,
        updated,
        duration,
      },
    }
  }
  catch (error: any) {
    console.error('[TimeCard Sync Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Time card sync failed',
      data: { message: error?.message || 'Unknown error during sync' },
    })
  }
})
