/**
 * GET /api/auth/debug-employees
 * 
 * Temporary debug endpoint — lists a few employees from Firebase
 * to verify the collection name, field names, and data.
 * DELETE THIS FILE before going to production.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()

    const snapshot = await firestore
      .collection('devcoEmployees')
      .limit(5)
      .get()

    if (snapshot.empty) {
      return {
        success: false,
        message: 'No documents found in devcoEmployees collection',
        databaseId: 'devcodbinitial',
      }
    }

    const employees = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        docId: doc.id,
        fields: Object.keys(data),
        email: data.email ?? 'MISSING',
        hasPassword: !!data.password,
        passwordLength: data.password?.length ?? 0,
        status: data.status ?? 'MISSING',
        firstName: data.firstName ?? 'MISSING',
        lastName: data.lastName ?? 'MISSING',
      }
    })

    return {
      success: true,
      count: snapshot.size,
      employees,
    }
  }
  catch (error: any) {
    return {
      success: false,
      error: error.message,
      stack: error.stack,
    }
  }
})
