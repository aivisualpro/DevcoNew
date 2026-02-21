/**
 * PUT /api/proposals/:id
 *
 * Save/update proposal content for an estimate.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Estimate ID is required' })
  }

  const body = await readBody(event)

  if (!body || typeof body.content === 'undefined') {
    throw createError({ statusCode: 400, statusMessage: 'Content is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoProposals').doc(id)

    await docRef.set({
      estimateId: id,
      content: body.content,
      updatedAt: new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString(),
    }, { merge: true })

    return { success: true, message: 'Proposal saved' }
  }
  catch (error: any) {
    if (error.statusCode) throw error
    console.error('[Proposal PUT Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save proposal',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
