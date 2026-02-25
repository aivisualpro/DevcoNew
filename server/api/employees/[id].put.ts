/**
 * PUT /api/employees/[id]
 * Updates an employee in Firestore devcoEmployees.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Employee ID is required' })
  }

  const body = await readBody(event)

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoEmployees').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Employee not found' })
    }

    const updates: Record<string, any> = {
      ...body,
      updatedAt: new Date().toISOString(),
    }
    // Never overwrite internal fields
    delete updates._id
    delete updates.id
    delete updates.createdAt

    await docRef.update(updates)

    return {
      success: true,
      employee: { _id: id, id, ...doc.data(), ...updates },
    }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[Employee Update Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update employee' })
  }
})
