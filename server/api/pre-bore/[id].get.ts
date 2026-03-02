/**
 * GET /api/pre-bore/:id
 *
 * Fetch a single Pre-Bore record from Firestore by its doc ID.
 * Returns the full document including preBoreLogs and signatures.
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Pre-Bore ID is required',
        })
    }

    try {
        const firestore = useFirestoreAdmin()
        const doc = await firestore.collection('preBore').doc(id).get()

        if (!doc.exists) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Pre-Bore record not found',
            })
        }

        const data = doc.data()
        const preBore = { ...data, _id: doc.id, id: doc.id }

        return {
            success: true,
            preBore,
        }
    }
    catch (error: any) {
        if (error.statusCode)
            throw error
        console.error('[Pre-Bore GET Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch Pre-Bore record',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
