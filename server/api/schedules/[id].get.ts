/**
 * GET /api/schedules/:id
 *
 * Fetch a single schedule from Firestore by its doc ID,
 * along with related data:
 *   - Time Cards  (devcoTimeCards where scheduleId == id)
 *   - DJT         (DevcoDJT where scheduleId == id)  — 1 per schedule
 *   - JHA         (devcoJHA where scheduleId == id)   — 1 per schedule
 *   - Tasks       (devcoTasks where estimate == schedule.estimate)
 *   - Chats       (devcoChats where scheduleId == id)
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Schedule ID is required',
    })
  }

  try {
    const firestore = useFirestoreAdmin()
    const doc = await firestore.collection('devcoSchedules').doc(id).get()

    if (!doc.exists) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Schedule not found',
      })
    }

    const data = doc.data()
    const schedule = { ...data, _id: doc.id, id: doc.id }

    // Fetch all related data in parallel
    const [tcResult, djtResult, jhaResult, tasksResult, chatsResult] = await Promise.allSettled([
      // Time Cards linked to this schedule
      firestore.collection('devcoTimeCards').where('scheduleId', '==', id).get(),
      // DJT linked to this schedule (1 per schedule)
      firestore.collection('DevcoDJT').where('scheduleId', '==', id).get(),
      // JHA linked to this schedule (1 per schedule)
      firestore.collection('devcoJHA').where('scheduleId', '==', id).get(),
      // Tasks linked to the same estimate (all schedules under this estimate)
      data?.estimate
        ? firestore.collection('devcoTasks').where('estimate', '==', data.estimate).get()
        : Promise.resolve(null),
      // Chats linked to this schedule
      firestore.collection('devcoChats').where('scheduleId', '==', id).get(),
    ])

    const timeCards = tcResult.status === 'fulfilled' && tcResult.value
      ? tcResult.value.docs.map((d: any) => ({ ...d.data(), _id: d.id, id: d.id }))
      : []

    const djts = djtResult.status === 'fulfilled' && djtResult.value
      ? djtResult.value.docs.map((d: any) => ({ ...d.data(), _id: d.id, id: d.id }))
      : []

    const jhaRecords = jhaResult.status === 'fulfilled' && jhaResult.value
      ? jhaResult.value.docs.map((d: any) => ({ ...d.data(), _id: d.id, id: d.id }))
      : []

    const tasks = tasksResult.status === 'fulfilled' && tasksResult.value
      ? tasksResult.value.docs.map((d: any) => ({ ...d.data(), _id: d.id, id: d.id }))
      : []

    const chats = chatsResult.status === 'fulfilled' && chatsResult.value
      ? chatsResult.value.docs.map((d: any) => ({ ...d.data(), _id: d.id, id: d.id }))
      : []

    return {
      success: true,
      schedule,
      timeCards,
      djt: djts[0] || null, // 1 per schedule
      jha: jhaRecords[0] || null, // 1 per schedule
      tasks,
      chats,
    }
  }
  catch (error: any) {
    if (error.statusCode)
      throw error
    console.error('[Schedule GET Error]', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch schedule',
      data: { message: error?.message || 'Unknown error' },
    })
  }
})
