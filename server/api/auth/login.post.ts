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
    const normalizedEmail = email.toLowerCase().trim()

    console.log('[Auth Login] Attempting login for:', normalizedEmail)

    // Try exact match first
    let snapshot = await firestore
      .collection('devcoEmployees')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get()

    // If no exact match, try fetching all employees and do case-insensitive match
    // (Firestore queries are case-sensitive, so stored email might have different casing)
    if (snapshot.empty) {
      console.log('[Auth Login] No exact email match, trying case-insensitive lookup...')
      const allSnapshot = await firestore
        .collection('devcoEmployees')
        .get()

      const matchingDoc = allSnapshot.docs.find(
        d => d.data().email?.toLowerCase().trim() === normalizedEmail,
      )

      if (!matchingDoc) {
        console.log('[Auth Login] No employee found for email:', normalizedEmail)
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid email or password',
        })
      }

      // Create a compatible snapshot-like result
      snapshot = { empty: false, docs: [matchingDoc] } as any
    }

    const doc = snapshot.docs[0]
    const employee = doc.data()
    console.log('[Auth Login] Found employee:', employee.firstName, employee.lastName, '| Status:', employee.status)

    // Check password
    console.log('[Auth Login] Password check — stored length:', employee.password?.length, '| input length:', password.length)
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
    if (error.statusCode)
      throw error

    console.error('[Auth Login Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Login failed',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
