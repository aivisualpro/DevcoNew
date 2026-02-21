/**
 * POST /api/proposal-blocks/create
 *
 * Save a new reusable proposal block.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.title || !body?.content) {
    throw createError({ statusCode: 400, statusMessage: 'Title and content are required' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const now = new Date().toISOString()

    const docRef = await firestore.collection('devcoProposalBlocks').add({
      title: body.title,
      description: body.description || '',
      content: body.content,
      category: body.category || 'General',
      createdAt: now,
      updatedAt: now,
    })

    return { success: true, id: docRef.id, message: 'Block saved' }
  }
  catch (error: any) {
    console.error('[Proposal Block Create Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create proposal block',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
