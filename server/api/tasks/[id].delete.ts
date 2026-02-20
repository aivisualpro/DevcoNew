/**
 * DELETE /api/tasks/[id]
 * Deletes a task from Firestore devcoTasks.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Task ID is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoTasks').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Task not found' })
    }

    await docRef.delete()

    return { success: true, message: 'Task deleted' }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[Task Delete Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete task' })
  }
})
