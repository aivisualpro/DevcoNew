/**
 * GET /api/djt
 *
 * Reads all DJT records from Firebase (DevcoDJT) and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('DevcoDJT').get()

    const djtRecords = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      djt: djtRecords,
      total: djtRecords.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        djt: [],
        total: 0,
        message: 'No DJT records synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[DJT GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch DJT records',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
