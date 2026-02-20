/**
 * DELETE /api/employees/[id]
 * Deletes an employee from Firestore devcoEmployees.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Employee ID is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoEmployees').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
    }

    await docRef.delete()

    return { success: true, message: 'Employee deleted' }
  }
  catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Employee Delete Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete employee' })
  }
})
