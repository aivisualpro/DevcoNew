/**
 * GET /api/employees
 *
 * Reads all employees from Firestore and returns them.
 * Uses server-side in-memory cache (30s TTL) to avoid repeated Firestore reads.
 * Only fetches the fields needed by the UI for fast loading.
 */

// ─── Server-side in-memory cache ───
let _cachedEmployees: any[] | null = null
let _cacheTimestamp = 0
const CACHE_TTL_MS = 30_000 // 30 seconds

// All the fields the employee table + detail page needs
const SELECTED_FIELDS = [
  // Table list fields
  'firstName', 'lastName', 'email', 'phone', 'mobile',
  'appRole', 'companyPosition', 'designation', 'status',
  'dateHired', 'approvalStatus', 'rejectionComment',
  'profilePicture', 'image', 'createdAt', 'updatedAt',
  'legacy_id', 'permissions', 'userRole',
  // Detail page fields
  'dob', 'driverLicense', 'address', 'city', 'state', 'zip',
  'groupNo', 'hourlyRateSITE', 'hourlyRateDrive',
  'separationDate', 'separationReason', 'isScheduleActive',
  'emergencyContact', 'emergencyContactName', 'emergencyContactEmail',
  'emergencyContactPhone', 'emergencyContactRelation',
  // Document compliance fields
  'applicationResume', 'employeeHandbook', 'quickbooksW4I9DD',
  'workforce', 'dotRelease', 'dmvPullNotifications',
  'drivingRecordPermission', 'backgroundCheck', 'copyOfDL',
  'copyOfSS', 'lcpTracker', 'edd', 'autoInsurance',
  'veriforce', 'unionPaperwork1184',
] as const

export function invalidateEmployeesCache() {
  _cachedEmployees = null
  _cacheTimestamp = 0
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const forceRefresh = query.force === 'true' || query.force === '1'

    // Return cached data if fresh
    const now = Date.now()
    if (!forceRefresh && _cachedEmployees && (now - _cacheTimestamp) < CACHE_TTL_MS) {
      return {
        success: true,
        users: _cachedEmployees,
        total: _cachedEmployees.length,
        cached: true,
      }
    }

    const firestore = useFirestoreAdmin()

    // Use .select() to only fetch needed fields — much faster than full docs
    const snapshot = await firestore
      .collection('devcoEmployees')
      .select(...SELECTED_FIELDS)
      .get()

    const employees = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
        userName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || '—',
      }
    })

    // Update cache
    _cachedEmployees = employees
    _cacheTimestamp = Date.now()

    return {
      success: true,
      users: employees,
      total: employees.length,
    }
  }
  catch (error: any) {
    // If collection doesn't exist yet (NOT_FOUND), return empty
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        users: [],
        total: 0,
        message: 'No employees synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Employees GET Error]', error)

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch employees',
      data: {
        message: error?.message || 'Unknown error',
      },
    })
  }
})
