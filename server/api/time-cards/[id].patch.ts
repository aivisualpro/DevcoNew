/**
 * PATCH /api/time-cards/:id
 *
 * Updates specific fields on a time card document in Firestore.
 * Currently supports: dumpQty, shopQty
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing time card ID' })
  }

  const body = await readBody(event)
  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, statusMessage: 'Missing request body' })
  }

  // Only allow specific fields to be updated
  const allowedFields = ['dumpQty', 'shopQty']
  const updates: Record<string, any> = {}

  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field] ?? null
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No valid fields to update' })
  }

  try {
    const firestore = useFirestoreAdmin()
    const docRef = firestore.collection('devcoTimeCards').doc(id)

    const doc = await docRef.get()
    if (!doc.exists) {
      throw createError({ statusCode: 404, statusMessage: 'Time card not found' })
    }

    await docRef.update(updates)

    return {
      success: true,
      message: 'Time card updated',
      updates,
    }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[TimeCard PATCH Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update time card',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
