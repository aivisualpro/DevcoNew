/**
 * POST /api/tasks/create
 * Creates a new task in Firestore devcoTasks.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.task) {
    throw createError({ statusCode: 400, statusMessage: 'Task title is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoTasks').doc()

    const payload: Record<string, any> = {
      task: body.task,
      status: body.status || 'todo',
      assignees: body.assignees || [],
      estimate: body.estimate || null,
      createdBy: body.createdBy || null,
      createdAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: body.lastUpdatedBy || null,
      priority: body.priority || null,
      description: body.description || '',
      labels: body.labels || [],
    }

    await docRef.set(payload)

    return {
      success: true,
      task: { _id: docRef.id, ...payload },
    }
  }
  catch (error: any) {
    console.error('[Task Create Error]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create task' })
  }
})
