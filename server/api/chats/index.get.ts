/**
 * GET /api/chats
 *
 * Returns all chats from Firestore `devcoChats` collection.
 */
export default defineEventHandler(async (_event) => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoChats').get()

    const chats = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        _id: doc.id,
        ...data,
      }
    })

    return {
      success: true,
      chats,
      total: chats.length,
    }
  }
  catch (error: any) {
    console.error('[Chats GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch chats',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
