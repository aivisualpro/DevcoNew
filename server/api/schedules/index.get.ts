/**
 * GET /api/schedules
 *
 * Reads all schedules from Firestore (devcoSchedules) and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoSchedules').get()

    const schedules = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      schedules,
      total: schedules.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        schedules: [],
        total: 0,
        message: 'No schedules synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Schedules GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedules',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
