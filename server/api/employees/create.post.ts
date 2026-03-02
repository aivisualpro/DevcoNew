import { invalidateEmployeesCache } from './index.get'

/**
 * POST /api/employees/create
 * Creates a new employee in Firestore devcoEmployees.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.email) {
    throw createError({ statusCode: 400, statusMessage: 'Email is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoEmployees').doc()

    const now = new Date().toISOString()

    const payload: Record<string, any> = {
      firstName: body.firstName || '',
      lastName: body.lastName || '',
      email: body.email,
      password: body.password || '',
      phone: body.phone || '',
      mobile: body.mobile || '',
      appRole: body.appRole || 'Employee',
      companyPosition: body.companyPosition || '',
      designation: body.designation || '',
      isScheduleActive: body.isScheduleActive ?? false,
      status: body.status || 'Active',
      groupNo: body.groupNo || '',
      hourlyRateSITE: body.hourlyRateSITE || null,
      hourlyRateDrive: body.hourlyRateDrive || null,
      dob: body.dob || '',
      driverLicense: body.driverLicense || '',
      address: body.address || '',
      city: body.city || '',
      state: body.state || '',
      zip: body.zip || '',
      dateHired: body.dateHired || '',
      separationDate: body.separationDate || '',
      separationReason: body.separationReason || '',
      emergencyContact: body.emergencyContact || '',
      // Document fields (boolean or URL string)
      applicationResume: body.applicationResume || '',
      employeeHandbook: body.employeeHandbook || '',
      quickbooksW4I9DD: body.quickbooksW4I9DD || '',
      workforce: body.workforce || '',
      dotRelease: body.dotRelease || '',
      dmvPullNotifications: body.dmvPullNotifications || '',
      drivingRecordPermission: body.drivingRecordPermission || '',
      backgroundCheck: body.backgroundCheck || '',
      copyOfDL: body.copyOfDL || '',
      copyOfSS: body.copyOfSS || '',
      lcpTracker: body.lcpTracker || '',
      edd: body.edd || '',
      autoInsurance: body.autoInsurance || '',
      veriforce: body.veriforce || '',
      unionPaperwork1184: body.unionPaperwork1184 || '',
      // Metadata
      createdAt: now,
      updatedAt: now,
    }

    await docRef.set(payload)
    invalidateEmployeesCache()

    return {
      success: true,
      employee: { _id: docRef.id, id: docRef.id, ...payload },
    }
  }
  catch (error: any) {
    console.error('[Employee Create Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create employee' })
  }
})
