/**
 * GET /api/proposals/:id
 *
 * Fetch proposal content for an estimate (by estimate doc ID).
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Estimate ID is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const doc = await firestore.collection('devcoProposals').doc(id).get()

    if (!doc.exists) {
      return { success: true, proposal: null }
    }

    return {
      success: true,
      proposal: { ...doc.data(), _id: doc.id },
    }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[Proposal GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch proposal',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
