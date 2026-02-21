<script setup lang="ts">
/**
 * Time Cards Sidebar Navigation
 *
 * Hierarchy: Year → Week → Employee → Days
 * Week starts Monday, ends Sunday. No timezone applied.
 */

const route = useRoute()
const { allTimeCards, isFetched, fetchAllTimeCards } = useTimeCardsApi()
fetchAllTimeCards()

// Inject shared search from layout
const searchQuery = inject<Ref<string>>('timeCardsSearch', ref(''))

// ─── Helpers (timezone-agnostic) ───

/** Extract date portion from various formats — no timezone conversion */
function extractDateStr(dateStr: string | null): string {
  if (!dateStr) return ''
  // ISO format: "2024-09-13T07:00:00.000Z"
  if (dateStr.includes('T')) return dateStr.split('T')[0] || ''
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10)
  // US format: "9/13/2024 7:16:00 AM" or "9/13/2024"
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch
    return `${yyyy}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}`
  }
  return dateStr
}

/** Get Monday of the week for a given date string (YYYY-MM-DD). Monday-first week. */
function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y!, m! - 1, d)
  const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // offset to Monday
  date.setDate(date.getDate() - diff)
  const my = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const md = String(date.getDate()).padStart(2, '0')
  return `${my}-${mm}-${md}`
}

/** Get Sunday (end of week) from a Monday date string */
function getSundayOfWeek(mondayStr: string): string {
  const [y, m, d] = mondayStr.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!)
  date.setDate(date.getDate() + 6)
  const sy = date.getFullYear()
  const sm = String(date.getMonth() + 1).padStart(2, '0')
  const sd = String(date.getDate()).padStart(2, '0')
  return `${sy}-${sm}-${sd}`
}

/**
 * Get ISO week number AND ISO year from a Monday date string.
 * The ISO year is determined by the Thursday of that week.
 * e.g. Monday 12/29/2025 → Thursday 01/01/2026 → ISO Year 2026, Week 1
 */
function getISOWeekData(mondayStr: string): { isoYear: number, weekNum: number } {
  const [y, m, d] = mondayStr.split('-').map(Number)
  const monday = new Date(y!, m! - 1, d!)
  // Thursday of this week (Monday + 3)
  const thursday = new Date(monday)
  thursday.setDate(monday.getDate() + 3)
  const isoYear = thursday.getFullYear()

  // Find Monday of ISO week 1: the week containing Jan 4th
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Day = jan4.getDay() || 7 // Convert Sun=0 to 7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - jan4Day + 1)

  const diffMs = monday.getTime() - week1Monday.getTime()
  const weekNum = Math.floor(diffMs / (7 * 86400000)) + 1

  return { isoYear, weekNum: weekNum > 0 ? weekNum : 1 }
}

/** Format YYYY-MM-DD → MM/DD */
function shortDate(str: string): string {
  const [, m, d] = str.split('-')
  return `${m}/${d}`
}

/** Format YYYY-MM-DD → MM/DD/YYYY */
function fullDate(str: string): string {
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

// ─── Build tree: Year → Week → Employee → Days ───
// Filtered by search query so sidebar totals match the table

interface DayEntry {
  dateStr: string
  hours: number
  cards: any[]
}

interface EmployeeNode {
  name: string
  employeeId: string | null
  totalHours: number
  days: DayEntry[]
}

interface WeekNode {
  mondayStr: string
  sundayStr: string
  weekNum: number
  totalHours: number
  employees: EmployeeNode[]
}

interface YearNode {
  year: number
  totalHours: number
  weeks: WeekNode[]
}

// Filter time cards by search query (same logic as table page)
const filteredTimeCards = computed(() => {
  if (!searchQuery.value) return allTimeCards.value
  const q = searchQuery.value.toLowerCase()
  return allTimeCards.value.filter(tc =>
    (tc.employeeName || '').toLowerCase().includes(q)
    || (tc.type || '').toLowerCase().includes(q)
    || (tc.comments || '').toLowerCase().includes(q),
  )
})

const tree = computed<YearNode[]>(() => {
  if (!isFetched.value) return []

  // Group: year → monday → employeeName → dateStr → cards
  const yearMap = new Map<number, Map<string, Map<string, Map<string, any[]>>>>()

  for (const tc of filteredTimeCards.value) {
    const dateStr = extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)
    if (!dateStr) continue

    const monday = getMondayOfWeek(dateStr)
    const { isoYear } = getISOWeekData(monday)
    const empName = tc.employeeName || 'Unknown'

    if (!yearMap.has(isoYear)) yearMap.set(isoYear, new Map())
    const weekMap = yearMap.get(isoYear)!

    if (!weekMap.has(monday)) weekMap.set(monday, new Map())
    const empMap = weekMap.get(monday)!

    if (!empMap.has(empName)) empMap.set(empName, new Map())
    const dayMap = empMap.get(empName)!

    if (!dayMap.has(dateStr)) dayMap.set(dateStr, [])
    dayMap.get(dateStr)!.push(tc)
  }

  // Build sorted tree
  const years: YearNode[] = []

  for (const [year, weekMap] of [...yearMap.entries()].sort((a, b) => b[0] - a[0])) {
    const weeks: WeekNode[] = []

    for (const [monday, empMap] of [...weekMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
      const employees: EmployeeNode[] = []

      for (const [empName, dayMap] of [...empMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        const days: DayEntry[] = []
        let empHours = 0

        for (const [dateStr, cards] of [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
          const dayHrs = cards.reduce((sum: number, c: any) => {
            const h = c.hours
            const n = h == null ? 0 : typeof h === 'number' ? h : Number(String(h).replace(/[^0-9.\-]/g, '')) || 0
            return sum + n
          }, 0)
          empHours += dayHrs
          days.push({ dateStr, hours: Math.round(dayHrs * 100) / 100, cards })
        }

        employees.push({
          name: empName,
          employeeId: empMap.get(empName)?.values().next().value?.[0]?.employeeId || null,
          totalHours: Math.round(empHours * 100) / 100,
          days,
        })
      }

      const weekHours = employees.reduce((s, e) => s + e.totalHours, 0)
      weeks.push({
        mondayStr: monday,
        sundayStr: getSundayOfWeek(monday),
        weekNum: getISOWeekData(monday).weekNum,
        totalHours: Math.round(weekHours * 100) / 100,
        employees,
      })
    }

    const yearHours = weeks.reduce((s, w) => s + w.totalHours, 0)
    years.push({ year, totalHours: Math.round(yearHours * 100) / 100, weeks })
  }

  return years
})

// ─── Accordion state ───
const expandedYears = ref<Set<number>>(new Set())
const expandedWeeks = ref<Set<string>>(new Set())
const expandedEmployees = ref<Set<string>>(new Set())

function clickYear(y: number) {
  expandedYears.value.has(y) ? expandedYears.value.delete(y) : expandedYears.value.add(y)
  navigateTo(`/time-cards/${y}`)
}
function clickWeek(yr: number, mondayStr: string) {
  const key = `${yr}-${mondayStr}`
  expandedWeeks.value.has(key) ? expandedWeeks.value.delete(key) : expandedWeeks.value.add(key)
  navigateTo(`/time-cards/${yr}/${mondayStr}`)
}
function clickEmployee(yr: number, mondayStr: string, empName: string) {
  const key = `${yr}-${mondayStr}-${empName}`
  expandedEmployees.value.has(key) ? expandedEmployees.value.delete(key) : expandedEmployees.value.add(key)
  navigateTo(`/time-cards/${yr}/${mondayStr}/${encodeURIComponent(empName)}`)
}
function clickDay(yr: number, mondayStr: string, empName: string, dateStr: string) {
  navigateTo(`/time-cards/${yr}/${mondayStr}/${encodeURIComponent(empName)}/${dateStr}`)
}

// ─── Route-based active state ───
const currentPath = computed(() => route.path)

function fmtHours(h: number) {
  return h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Auto-expand first year on load
watch(() => tree.value, (t) => {
  if (t.length > 0 && expandedYears.value.size === 0) {
    expandedYears.value.add(t[0]!.year)
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col gap-0.5 p-2 select-none overflow-hidden">
    <!-- Loading -->
    <div v-if="!isFetched" class="flex items-center gap-2 px-3 py-4 text-muted-foreground">
      <Icon name="i-lucide-loader-2" class="size-4 animate-spin" />
      <span class="text-xs">Loading time cards...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="tree.length === 0" class="px-3 py-4 text-center">
      <p class="text-xs text-muted-foreground">No time cards yet</p>
      <p class="text-[10px] text-muted-foreground/60 mt-1">Click Refresh to sync</p>
    </div>

    <!-- Year accordion -->
    <template v-for="yr in tree" :key="yr.year">
      <button
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all hover:bg-accent"
        :class="currentPath === `/time-cards/${yr.year}` ? 'bg-accent text-accent-foreground' : ''"
        @click="clickYear(yr.year)"
      >
        <Icon
          :name="expandedYears.has(yr.year) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5 shrink-0 text-muted-foreground"
        />
        <span class="font-bold text-sm flex-1 tabular-nums">{{ yr.year }}</span>
        <Badge variant="outline" class="text-[9px] tabular-nums font-semibold px-1.5 py-0 bg-muted/50 shrink-0">
          {{ fmtHours(yr.totalHours) }}
        </Badge>
      </button>

      <!-- Weeks -->
      <template v-if="expandedYears.has(yr.year)">
        <template v-for="wk in yr.weeks" :key="wk.mondayStr">
          <button
            class="flex items-center gap-1 rounded-lg pl-7 pr-3 py-1.5 text-left transition-all hover:bg-accent"
            :class="currentPath === `/time-cards/${yr.year}/${wk.mondayStr}` ? 'bg-accent text-accent-foreground' : ''"
            @click="clickWeek(yr.year, wk.mondayStr)"
          >
            <Icon
              :name="expandedWeeks.has(`${yr.year}-${wk.mondayStr}`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-3 shrink-0 text-muted-foreground"
            />
            <span class="text-xs font-semibold flex-1 tabular-nums truncate">
              ({{ wk.weekNum }}) {{ shortDate(wk.mondayStr) }}-{{ shortDate(wk.sundayStr) }}
            </span>
            <Badge variant="outline" class="text-[9px] tabular-nums font-medium px-1.5 py-0 bg-muted/30 shrink-0">
              {{ fmtHours(wk.totalHours) }}
            </Badge>
          </button>

          <!-- Employees -->
          <template v-if="expandedWeeks.has(`${yr.year}-${wk.mondayStr}`)">
            <template v-for="emp in wk.employees" :key="emp.name">
              <button
                class="flex items-center gap-1 rounded-lg pl-11 pr-3 py-1.5 text-left transition-all hover:bg-accent"
                :class="currentPath === `/time-cards/${yr.year}/${wk.mondayStr}/${encodeURIComponent(emp.name)}` ? 'bg-accent text-accent-foreground' : ''"
                @click="clickEmployee(yr.year, wk.mondayStr, emp.name)"
              >
                <Icon
                  :name="expandedEmployees.has(`${yr.year}-${wk.mondayStr}-${emp.name}`) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                  class="size-3 shrink-0 text-muted-foreground"
                />
                <span class="text-xs font-medium flex-1 truncate min-w-0">{{ emp.name }}</span>
                <Badge variant="outline" class="text-[9px] tabular-nums font-semibold px-1.5 py-0 bg-muted/30 shrink-0">
                  {{ fmtHours(emp.totalHours) }}
                </Badge>
              </button>

              <!-- Days -->
              <template v-if="expandedEmployees.has(`${yr.year}-${wk.mondayStr}-${emp.name}`)">
                <button
                  v-for="day in emp.days"
                  :key="day.dateStr"
                  class="flex items-center gap-1 rounded-lg pl-14 pr-3 py-1 text-left transition-all hover:bg-accent"
                  :class="currentPath === `/time-cards/${yr.year}/${wk.mondayStr}/${encodeURIComponent(emp.name)}/${day.dateStr}` ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'"
                  @click="clickDay(yr.year, wk.mondayStr, emp.name, day.dateStr)"
                >
                  <Icon name="i-lucide-calendar-days" class="size-3 shrink-0" />
                  <span class="text-[11px] font-medium flex-1 tabular-nums">{{ fullDate(day.dateStr) }}</span>
                  <Badge variant="outline" class="text-[9px] tabular-nums font-semibold px-1.5 py-0 bg-muted/30 shrink-0">
                    {{ fmtHours(day.hours) }}
                  </Badge>
                </button>
              </template>
            </template>
          </template>
        </template>
      </template>
    </template>
  </div>
</template>
