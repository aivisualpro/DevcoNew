/**
 * GET /api/clients
 *
 * Reads all clients from Firestore and returns them.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('clients').get()

    const clients = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        ...data,
        _id: doc.id,
        id: doc.id,
      }
    })

    return {
      success: true,
      clients,
      total: clients.length,
    }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return {
        success: true,
        clients: [],
        total: 0,
        message: 'No clients synced yet. Press Refresh to sync from MongoDB.',
      }
    }

    console.error('[Clients GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch clients',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
