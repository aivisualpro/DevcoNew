/**
 * GET /api/time-cards
 *
 * Returns all time cards from Firestore `devcoTimeCards` collection.
 * Uses .select() to only fetch the fields needed for the listing view.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    // Only select the lightweight fields needed for sidebar nav + table listing.
    // Heavy fields (locationIn, locationOut, createdBy, etc.) are omitted to
    // keep the payload small across 6,000+ documents.
    const snapshot = await firestore
      .collection('devcoTimeCards')
      .select(
        'employeeName',
        'type',
        'clockIn',
        'clockOut',
        'lunchStart',
        'lunchEnd',
        'hourlyRateSITE',
        'hourlyRateDrive',
        'distance',
        'hours',
        'scheduleDate',
        'createdAt',
      )
      .get()

    const timeCards = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        _id: doc.id,
        ...data,
      }
    })

    return {
      success: true,
      timeCards,
      total: timeCards.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        timeCards: [],
        total: 0,
        message: 'No time cards synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[TimeCards GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch time cards',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
