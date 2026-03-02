/**
 * GET /api/pothole-logs/:id
 *
 * Fetch a single Pothole Log record from Firestore by its doc ID.
 */
export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Pothole Log ID is required',
        })
    }

    try {
        const firestore = useFirestoreAdmin()
        const doc = await firestore.collection('DevcoPotholeLogs').doc(id).get()

        if (!doc.exists) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Pothole Log record not found',
            })
        }

        const data = doc.data()
        const potholeLog = { ...data, _id: doc.id, id: doc.id }

        return {
            success: true,
            potholeLog,
        }
    }
    catch (error: any) {
        if (error.statusCode)
            throw error
        console.error('[Pothole Log GET Error]', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch Pothole Log record',
            data: { message: error?.message || 'Unknown error' },
        })
    }
})
