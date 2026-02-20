/**
 * GET /api/activities
 *
 * Returns all activities from Firestore `devcoActivites` collection.
 * Ordered by createdAt descending (newest first).
 */
export default defineEventHandler(async (_event) => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore
      .collection('devcoActivites')
      .orderBy('createdAt', 'desc')
      .get()

    const activities = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        _id: doc.id,
        ...data,
      }
    })

    return {
      success: true,
      activities,
      total: activities.length,
    }
  }
  catch (error: any) {
    console.error('[Activities GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch activities',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
