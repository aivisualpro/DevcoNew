/**
 * GET /api/receipts-costs
 *
 * Reads all receipts/costs from Firebase (devcoReceiptsCosts).
 */
export default defineEventHandler(async () => {
  try {
    const firestore = useFirestoreAdmin()
    const snapshot = await firestore.collection('devcoReceiptsCosts').get()

    const records = snapshot.docs.map((doc) => {
      const data = doc.data()
      return { ...data, _id: doc.id, id: doc.id }
    })

    return { success: true, records, total: records.length }
  }
  catch (error: any) {
    if (error?.code === 5 || error?.message?.includes('NOT_FOUND')) {
      return { success: true, records: [], total: 0, message: 'No records synced yet.' }
    }
    console.error('[Receipts/Costs GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch receipts/costs',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
