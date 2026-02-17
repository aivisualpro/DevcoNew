/**
 * GET /api/estimates
 *
 * Reads all estimates from Firestore and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoEstimates').get()

    const estimates = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      estimates,
      total: estimates.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        estimates: [],
        total: 0,
        message: 'No estimates synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Estimates GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch estimates',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
