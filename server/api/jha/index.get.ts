/**
 * GET /api/jha
 *
 * Reads all JHA records from Firebase (devcoJHA) and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoJHA').get()

    const jhaRecords = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      jha: jhaRecords,
      total: jhaRecords.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        jha: [],
        total: 0,
        message: 'No JHA records synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[JHA GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch JHA records',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
