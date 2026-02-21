/**
 * DELETE /api/proposal-blocks/:id
 *
 * Delete a reusable proposal block.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Block ID is required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    await firestore.collection('devcoProposalBlocks').doc(id).delete()
    return { success: true, message: 'Block deleted' }
  }
  catch (error: any) {
    console.error('[Proposal Block Delete Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete proposal block',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
