/**
 * GET /api/employees
 *
 * Reads all employees from Firestore and returns them.
 * This is the primary data source for the frontend employees table.
 * If the collection doesn't exist yet (no sync has happened), returns an empty array.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('employees').get()

    const employees = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
        // Build display name from firstName + lastName
        userName: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || '—',
      }
    })

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
