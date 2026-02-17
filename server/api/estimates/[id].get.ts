/**
 * GET /api/estimates/:id
 *
 * Fetch a single estimate from Firestore by its doc ID.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Estimate ID is required',
    })
  }

  try {
    const firestore = useFirestoreAdmin()
    const doc = await firestore.collection('devcoEstimates').doc(id).get()

    if (!doc.exists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Estimate not found',
      })
    }

    const data = doc.data()
    return {
      success: true,
      estimate: {
        ...data,
        _id: doc.id,
        id: doc.id,
      },
    }
  }
  catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Estimate GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch estimate',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
