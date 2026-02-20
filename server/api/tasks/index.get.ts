/**
 * GET /api/tasks
 *
 * Returns all tasks from Firestore `devcoTasks` collection.
 */
export default defineEventHandler(async (_event) => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoTasks').get()

    const tasks = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        _id: doc.id,
        ...data,
      }
    })

    return {
      success: true,
      tasks,
      total: tasks.length,
    }
  }
  catch (error: any) {
    console.error('[Tasks GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch tasks',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
