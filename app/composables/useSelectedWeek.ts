import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'

// Global shared state for the selected week
const _weekStart = ref<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })) // Monday

export function useSelectedWeek() {
  const weekStart = computed(() => _weekStart.value)
  const weekEnd = computed(() => endOfWeek(_weekStart.value, { weekStartsOn: 1 }))

  const weekLabel = computed(() => {
    const s = _weekStart.value
    const e = weekEnd.value
    const sameMonth = s.getMonth() === e.getMonth()
    if (sameMonth) {
      return `${format(s, 'MMM d')} – ${format(e, 'd, yyyy')}`
    }
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  })

  function prevWeek() {
    _weekStart.value = subWeeks(_weekStart.value, 1)
  }

  function nextWeek() {
    _weekStart.value = addWeeks(_weekStart.value, 1)
  }

  function goToCurrentWeek() {
    _weekStart.value = startOfWeek(new Date(), { weekStartsOn: 1 })
  }

  function setWeekFromDate(date: Date) {
    _weekStart.value = startOfWeek(date, { weekStartsOn: 1 })
  }

  /** Get the actual date for a given day name within the selected week */
  function getDateForDay(dayId: string): Date {
    const dayOffsets: Record<string, number> = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    }
    const offset = dayOffsets[dayId] ?? 0
    const d = new Date(_weekStart.value)
    d.setDate(d.getDate() + offset)
    return d
  }

  return {
    weekStart,
    weekEnd,
    weekLabel,
    prevWeek,
    nextWeek,
    goToCurrentWeek,
    setWeekFromDate,
    getDateForDay,
  }
}
