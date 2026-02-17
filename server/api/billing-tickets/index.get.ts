/**
 * GET /api/billing-tickets
 *
 * Reads all billing tickets from Firebase (devcoBillingTickets) and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoBillingTickets').get()

    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      tickets,
      total: tickets.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        tickets: [],
        total: 0,
        message: 'No billing tickets synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Billing Tickets GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch billing tickets',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
