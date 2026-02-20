/**
 * GET /api/time-cards
 *
 * Returns all time cards from Firestore `devcoTimeCards` collection.
 * Uses .select() to only fetch the fields needed for the listing view.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore
      .collection('devcoTimeCards')
      .select(
        'legacy_id',
        'scheduleId',
        'legacy_scheduleId',
        'employeeId',
        'employeeName',
        'employeeAvatar',
        'type',
        'clockIn',
        'lunchStart',
        'lunchEnd',
        'clockOut',
        'locationIn',
        'locationOut',
        'hourlyRateSITE',
        'hourlyRateDrive',
        'dumpWashout',
        'comments',
        'createdBy',
        'createdAt',
        'distance',
        'hours',
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
