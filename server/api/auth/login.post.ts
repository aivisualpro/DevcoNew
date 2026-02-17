/**
 * POST /api/auth/login
 *
 * Authenticates an employee against Firebase.
 * Looks up by email, verifies password, and checks status === 'Active'.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const { email, password } = body || {}

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required',
    })
  }

  try {
    const firestore = useFirestoreAdmin()

    // Query for employee by email (case-insensitive)
    const snapshot = await firestore
      .collection('devcoEmployees')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get()

    if (snapshot.empty) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      })
    }

    const doc = snapshot.docs[0]
    const employee = doc.data()

    // Check password
    if (employee.password !== password) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid email or password',
      })
    }

    // Check status is Active
    if (employee.status !== 'Active') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Your account is inactive. Please contact your administrator.',
      })
    }

    // Build user object for the session (exclude sensitive fields)
    const user = {
      _id: doc.id,
      id: doc.id,
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email,
      appRole: employee.appRole || 'Employee',
      designation: employee.designation || '',
      mobile: employee.mobile || '',
      phone: employee.phone || '',
      profilePicture: employee.profilePicture || '',
      status: employee.status,
      city: employee.city || '',
      state: employee.state || '',
    }

    return {
      success: true,
      message: 'Login successful',
      user,
      // Simple token (employee ID + timestamp, for session tracking)
      token: Buffer.from(`${doc.id}:${Date.now()}`).toString('base64'),
    }
  }
  catch (error: any) {
    // Re-throw if it's already an H3 error
    if (error.statusCode) throw error

    console.error('[Auth Login Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Login failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
