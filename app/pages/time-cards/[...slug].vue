<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const { setHeader } = usePageHeader()

const { allTimeCards, isFetched, fetchAllTimeCards, isSyncing, syncTimeCards, syncResult } = useTimeCardsApi()
fetchAllTimeCards()

// Parse route: /time-cards/:year/:mondayStr/:employeeName/:dateStr
const slugParts = computed(() => {
  const slug = route.params.slug
  if (Array.isArray(slug)) return slug
  return slug ? slug.split('/') : []
})

const year = computed(() => slugParts.value[0] || '')
const mondayStr = computed(() => slugParts.value[1] || '')
const employeeName = computed(() => decodeURIComponent(slugParts.value[2] || ''))
const dateStr = computed(() => slugParts.value[3] || '')

// View mode: table (1-3 segments) or detail (4 segments)
const isDetailView = computed(() => slugParts.value.length >= 4 && !!dateStr.value)

watchEffect(() => {
  if (isDetailView.value) {
    setHeader({ title: `Time Cards / ${employeeName.value}`, icon: 'i-lucide-timer' })
  }
  else if (employeeName.value) {
    setHeader({ title: `Time Cards / ${employeeName.value}`, icon: 'i-lucide-timer' })
  }
  else if (mondayStr.value) {
    setHeader({ title: `Time Cards / Week of ${mondayStr.value}`, icon: 'i-lucide-timer' })
  }
  else if (year.value) {
    setHeader({ title: `Time Cards / ${year.value}`, icon: 'i-lucide-timer' })
  }
  else {
    setHeader({ title: 'Time Cards', icon: 'i-lucide-timer' })
  }
})

// ─── Helpers ───
function extractDateStr(dateStr: string | null): string {
  if (!dateStr) return ''
  if (dateStr.includes('T')) return dateStr.split('T')[0] || ''
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10)
  // US format: "9/13/2024 7:16:00 AM"
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch
    return `${yyyy}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}`
  }
  return dateStr
}

function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y!, m! - 1, d)
  const dayOfWeek = date.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  date.setDate(date.getDate() - diff)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  // ISO: "2024-09-13T07:00:00.000Z"
  if (dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1]
    if (timePart) {
      const [h, m] = timePart.split(':')
      const hour = Number.parseInt(h || '0', 10)
      const min = m || '00'
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
      return `${h12}:${min} ${ampm}`
    }
  }
  // US: "9/13/2024 7:16:00 AM"
  const usMatch = dateStr.match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(.+)/)
  if (usMatch) {
    return usMatch[1]!.replace(/:00\s+(AM|PM)/, ' $1')
  }
  return dateStr
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${d}, ${y}`
}

function shortDate(str: string): string {
  if (!str) return ''
  const [y, m, d] = str.split('-')
  return `${m}/${d}/${y}`
}

function fmtNum(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length] ?? 'bg-blue-500'
}

// ─── Filtered data for TABLE view ───
const tableCards = computed(() => {
  if (!isFetched.value) return []

  return allTimeCards.value.filter((tc) => {
    const tcDate = extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)
    if (!tcDate) return false

    const tcYear = tcDate.split('-')[0]
    if (year.value && tcYear !== year.value) return false

    if (mondayStr.value) {
      const tcMonday = getMondayOfWeek(tcDate)
      if (tcMonday !== mondayStr.value) return false
    }

    if (employeeName.value) {
      const tcName = tc.employeeName || ''
      if (tcName !== employeeName.value) return false
    }

    return true
  })
})

// Search for table
const tableSearch = ref('')
const filteredTableCards = computed(() => {
  if (!tableSearch.value) return tableCards.value
  const q = tableSearch.value.toLowerCase()
  return tableCards.value.filter(tc =>
    (tc.employeeName || '').toLowerCase().includes(q)
    || (tc.type || '').toLowerCase().includes(q)
    || (tc.comments || '').toLowerCase().includes(q),
  )
})

const tableTotalHours = computed(() =>
  filteredTableCards.value.reduce((sum, tc) => sum + (Number(tc.hours) || 0), 0),
)

// ─── Filtered data for DETAIL view ───
const dayCards = computed(() => {
  if (!isFetched.value || !dateStr.value || !employeeName.value) return []
  return allTimeCards.value.filter((tc) => {
    const tcDate = extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)
    const tcName = tc.employeeName || ''
    return tcDate === dateStr.value && tcName === employeeName.value
  })
})

const totalHours = computed(() => dayCards.value.reduce((sum, tc) => sum + (Number(tc.hours) || 0), 0))
const totalSiteRate = computed(() => dayCards.value.reduce((sum, tc) => sum + (Number(tc.hourlyRateSITE) || 0), 0))
const totalDriveRate = computed(() => dayCards.value.reduce((sum, tc) => sum + (Number(tc.hourlyRateDrive) || 0), 0))
const totalDistance = computed(() => dayCards.value.reduce((sum, tc) => sum + (Number(tc.distance) || 0), 0))

// ─── Click row → navigate to detail ───
function viewDetail(tc: any) {
  const tcDate = extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)
  if (!tcDate) return
  const tcYear = tcDate.split('-')[0]
  const tcMonday = getMondayOfWeek(tcDate)
  const tcName = tc.employeeName || 'Unknown'
  navigateTo(`/time-cards/${tcYear}/${tcMonday}/${encodeURIComponent(tcName)}/${tcDate}`)
}

// ─── Sync ───
async function handleRefresh() {
  await syncTimeCards()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(syncResult.value.message, {
      description: `Created: ${s.created} | Updated: ${s.updated} | Duration: ${(s.duration / 1000).toFixed(1)}s`,
    })
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error('Sync failed', { description: syncResult.value.message })
  }
}
</script>

<template>
  <div>
    <!-- Teleport toolbar into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <!-- Search (table view only) -->
        <div v-if="!isDetailView" class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="tableSearch" placeholder="Search..." class="pl-8 h-7 w-44 text-xs" />
        </div>

        <Badge v-if="!isDetailView" variant="secondary" class="text-[10px] tabular-nums font-bold hidden sm:flex">
          {{ filteredTableCards.length }} entries • {{ fmtNum(tableTotalHours) }} hrs
        </Badge>

        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ allTimeCards.length.toLocaleString() }} total
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <div class="w-full flex flex-col h-full overflow-hidden">
      <!-- ═══════════════════ TABLE VIEW (1-3 segments) ═══════════════════ -->
      <template v-if="!isDetailView">
        <!-- Table -->
        <div class="flex-1 min-h-0 overflow-auto">
          <!-- Loading -->
          <div v-if="!isFetched" class="flex items-center justify-center h-64">
            <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
          </div>

          <Table v-else-if="filteredTableCards.length > 0">
            <TableHeader>
              <TableRow>
                <TableHead class="text-[11px]">Employee</TableHead>
                <TableHead class="text-[11px]">Date</TableHead>
                <TableHead class="text-[11px]">Type</TableHead>
                <TableHead class="text-[11px]">Clock In</TableHead>
                <TableHead class="text-[11px]">Clock Out</TableHead>
                <TableHead class="text-[11px]">Lunch</TableHead>
                <TableHead class="text-[11px] text-right">Hours</TableHead>
                <TableHead class="text-[11px] text-right">Site Rate</TableHead>
                <TableHead class="text-[11px] text-right">Drive Rate</TableHead>
                <TableHead class="text-[11px] text-right">Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="(tc, idx) in filteredTableCards"
                :key="tc._id || idx"
                class="cursor-pointer hover:bg-accent/50 transition-colors"
                @click="viewDetail(tc)"
              >
                <TableCell>
                  <div class="flex items-center gap-2">
                    <div
                      class="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      :class="getAvatarColor(tc.employeeName || '')"
                    >
                      {{ getInitials(tc.employeeName || '?') }}
                    </div>
                    <span class="text-xs font-medium truncate max-w-[120px]">{{ tc.employeeName || '—' }}</span>
                  </div>
                </TableCell>
                <TableCell class="text-xs tabular-nums">
                  {{ shortDate(extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)) }}
                </TableCell>
                <TableCell>
                  <Badge v-if="tc.type" variant="outline" class="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                    {{ tc.type }}
                  </Badge>
                  <span v-else class="text-xs text-muted-foreground">—</span>
                </TableCell>
                <TableCell class="text-xs tabular-nums">{{ formatTime(tc.clockIn) }}</TableCell>
                <TableCell class="text-xs tabular-nums">{{ formatTime(tc.clockOut) }}</TableCell>
                <TableCell class="text-xs tabular-nums text-muted-foreground">
                  {{ formatTime(tc.lunchStart) }} – {{ formatTime(tc.lunchEnd) }}
                </TableCell>
                <TableCell class="text-right text-xs font-semibold tabular-nums text-primary">
                  {{ fmtNum(Number(tc.hours) || 0) }}
                </TableCell>
                <TableCell class="text-right text-xs tabular-nums">
                  {{ fmtMoney(Number(tc.hourlyRateSITE) || 0) }}
                </TableCell>
                <TableCell class="text-right text-xs tabular-nums">
                  {{ fmtMoney(Number(tc.hourlyRateDrive) || 0) }}
                </TableCell>
                <TableCell class="text-right text-xs tabular-nums text-muted-foreground">
                  {{ fmtNum(Number(tc.distance) || 0, 1) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Empty -->
          <div v-else class="flex flex-col items-center justify-center py-20">
            <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon name="i-lucide-clock" class="size-8 text-muted-foreground/50" />
            </div>
            <h3 class="text-lg font-bold">No Time Cards</h3>
            <p class="text-sm text-muted-foreground mt-1">
              {{ tableSearch ? 'No results match your search.' : 'No records found for this selection.' }}
            </p>
          </div>
        </div>
      </template>

      <!-- ═══════════════════ DETAIL VIEW (4 segments) ═══════════════════ -->
      <template v-else>
        <!-- Date label -->
        <div class="shrink-0 px-4 lg:px-6 py-3 border-b bg-muted/20">
          <div class="flex items-center gap-3">
            <Button variant="ghost" size="icon" class="size-8 shrink-0" @click="$router.back()">
              <Icon name="i-lucide-arrow-left" class="size-4" />
            </Button>
            <div
              class="size-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              :class="getAvatarColor(employeeName)"
            >
              {{ getInitials(employeeName) }}
            </div>
            <div>
              <p class="text-sm font-bold">{{ employeeName }}</p>
              <p class="text-xs text-muted-foreground">{{ formatFullDate(dateStr) }}</p>
            </div>
          </div>
        </div>

        <!-- Detail Content -->
        <div class="flex-1 min-h-0 overflow-auto">
          <div v-if="!isFetched" class="flex items-center justify-center h-64">
            <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
          </div>

          <div v-else class="p-4 lg:p-6 space-y-4">
            <!-- Summary Stats -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent class="p-4 flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name="i-lucide-clock" class="size-5 text-primary" />
                  </div>
                  <div>
                    <p class="text-xl font-bold tabular-nums">{{ fmtNum(totalHours) }}</p>
                    <p class="text-[10px] text-muted-foreground">Total Hours</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent class="p-4 flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon name="i-lucide-map-pin" class="size-5 text-emerald-500" />
                  </div>
                  <div>
                    <p class="text-xl font-bold tabular-nums">{{ fmtMoney(totalSiteRate) }}</p>
                    <p class="text-[10px] text-muted-foreground">Site Rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent class="p-4 flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Icon name="i-lucide-car" class="size-5 text-blue-500" />
                  </div>
                  <div>
                    <p class="text-xl font-bold tabular-nums">{{ fmtMoney(totalDriveRate) }}</p>
                    <p class="text-[10px] text-muted-foreground">Drive Rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent class="p-4 flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Icon name="i-lucide-route" class="size-5 text-amber-500" />
                  </div>
                  <div>
                    <p class="text-xl font-bold tabular-nums">{{ fmtNum(totalDistance, 1) }} mi</p>
                    <p class="text-[10px] text-muted-foreground">Distance</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <!-- Time Card Entries -->
            <div class="space-y-3">
              <div
                v-for="(tc, idx) in dayCards"
                :key="tc._id || idx"
                class="group relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
              >
                <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

                <div class="p-4 pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <Badge v-if="tc.type" variant="outline" class="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                        {{ tc.type }}
                      </Badge>
                      <Badge variant="secondary" class="text-[10px] font-bold tabular-nums">
                        Entry #{{ idx + 1 }}
                      </Badge>
                    </div>
                    <span class="text-lg font-bold tabular-nums text-primary">
                      {{ fmtNum(Number(tc.hours) || 0) }} hrs
                    </span>
                  </div>

                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-border/30">
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Icon name="i-lucide-log-in" class="size-3 text-emerald-500" />
                        Clock In
                      </p>
                      <p class="text-sm font-semibold mt-0.5">{{ formatTime(tc.clockIn) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Icon name="i-lucide-utensils" class="size-3 text-amber-500" />
                        Lunch Start
                      </p>
                      <p class="text-sm font-semibold mt-0.5">{{ formatTime(tc.lunchStart) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Icon name="i-lucide-utensils-crossed" class="size-3 text-amber-500" />
                        Lunch End
                      </p>
                      <p class="text-sm font-semibold mt-0.5">{{ formatTime(tc.lunchEnd) }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Icon name="i-lucide-log-out" class="size-3 text-rose-500" />
                        Clock Out
                      </p>
                      <p class="text-sm font-semibold mt-0.5">{{ formatTime(tc.clockOut) }}</p>
                    </div>
                  </div>

                  <div class="mt-3 grid grid-cols-3 gap-3">
                    <div class="rounded-lg bg-emerald-500/5 p-2.5 ring-1 ring-emerald-200/30 dark:ring-emerald-800/30">
                      <p class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Site Rate</p>
                      <p class="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {{ fmtMoney(Number(tc.hourlyRateSITE) || 0) }}<span class="text-[10px] font-normal">/hr</span>
                      </p>
                    </div>
                    <div class="rounded-lg bg-blue-500/5 p-2.5 ring-1 ring-blue-200/30 dark:ring-blue-800/30">
                      <p class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Drive Rate</p>
                      <p class="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                        {{ fmtMoney(Number(tc.hourlyRateDrive) || 0) }}<span class="text-[10px] font-normal">/hr</span>
                      </p>
                    </div>
                    <div class="rounded-lg bg-amber-500/5 p-2.5 ring-1 ring-amber-200/30 dark:ring-amber-800/30">
                      <p class="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p>
                      <p class="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                        {{ fmtNum(Number(tc.distance) || 0, 1) }} <span class="text-[10px] font-normal">mi</span>
                      </p>
                    </div>
                  </div>

                  <div v-if="tc.comments" class="mt-3">
                    <p class="text-xs text-muted-foreground italic leading-relaxed">{{ tc.comments }}</p>
                  </div>

                  <div v-if="tc.dumpWashout" class="mt-2">
                    <Badge variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                      <Icon name="i-lucide-droplets" class="size-2.5" />
                      Dump/Washout
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="dayCards.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
              <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Icon name="i-lucide-clock" class="size-8 text-muted-foreground/50" />
              </div>
              <h3 class="text-lg font-bold">No Time Cards</h3>
              <p class="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                No time card entries found for this employee on this date.
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
