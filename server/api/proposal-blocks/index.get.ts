/**
 * GET /api/proposal-blocks
 *
 * Fetch all saved reusable proposal blocks.
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore
      .collection('devcoProposalBlocks')
      .orderBy('updatedAt', 'desc')
      .get()

    const blocks = snapshot.docs.map((doc) => ({
      ...doc.data(),
      _id: doc.id,
      id: doc.id,
    }))

    return { success: true, blocks }
  }
  catch (error: any) {
    console.error('[Proposal Blocks GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch proposal blocks',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
