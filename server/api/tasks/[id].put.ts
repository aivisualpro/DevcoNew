/**
 * PUT /api/tasks/[id]
 * Updates a task in Firestore devcoTasks.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Task ID is required' })
  }

  const body = await readBody(event)

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoTasks').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Task not found' })
    }

    const updates: Record<string, any> = {
      ...body,
      lastUpdatedAt: new Date().toISOString(),
    }
    // Don't overwrite _id
    delete updates._id

    await docRef.update(updates)

    return {
      success: true,
      task: { _id: id, ...doc.data(), ...updates },
    }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[Task Update Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to update task' })
  }
})
