/**
 * GET /api/estimates
 *
 * Reads estimates from Firestore — returns only the fields needed for the table listing.
 * Uses Firestore .select() to avoid downloading heavy nested data (lineItems, documents, etc.)
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()

    // Only select the fields the table and filters actually use
    const snapshot = await firestore
      .collection('devcoEstimates')
      .select(
        'estimate',
        'projectName',
        'date',
        'customerName',
        'proposalWriterName',
        'proposalWriterAvatar',
        'fringe',
        'certifiedPayroll',
        'services',
        'subTotal',
        'bidMarkUp',
        'margin',
        'grandTotal',
        'status',
        'createdAt',
        'updatedAt',
        'legacy_id',
      )
      .get()

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
