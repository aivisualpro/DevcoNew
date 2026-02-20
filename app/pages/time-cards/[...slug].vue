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

watchEffect(() => {
  if (employeeName.value && dateStr.value) {
    setHeader({
      title: `Time Cards / ${employeeName.value}`,
      icon: 'i-lucide-timer',
    })
  }
  else {
    setHeader({ title: 'Time Cards', icon: 'i-lucide-timer' })
  }
})

// Filter cards for this employee + date
const dayCards = computed(() => {
  if (!isFetched.value || !dateStr.value || !employeeName.value) return []

  return allTimeCards.value.filter((tc) => {
    const tcDate = extractDateStr(tc.clockIn) || extractDateStr(tc.createdAt)
    const tcName = tc.employeeName || ''
    return tcDate === dateStr.value && tcName === employeeName.value
  })
})

const totalHours = computed(() => {
  return dayCards.value.reduce((sum, tc) => sum + (Number(tc.hours) || 0), 0)
})

const totalSiteRate = computed(() => {
  return dayCards.value.reduce((sum, tc) => sum + (Number(tc.hourlyRateSITE) || 0), 0)
})

const totalDriveRate = computed(() => {
  return dayCards.value.reduce((sum, tc) => sum + (Number(tc.hourlyRateDrive) || 0), 0)
})

const totalDistance = computed(() => {
  return dayCards.value.reduce((sum, tc) => sum + (Number(tc.distance) || 0), 0)
})

// ─── Helpers ───
function extractDateStr(dateStr: string | null): string {
  if (!dateStr) return ''
  if (dateStr.includes('T')) return dateStr.split('T')[0] || ''
  if (dateStr.length >= 10) return dateStr.substring(0, 10)
  return dateStr
}

/** Extract time from ISO string — timezone-agnostic */
function formatTime(dateStr: string | null): string {
  if (!dateStr) return '—'
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
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ allTimeCards.length.toLocaleString() }} time cards
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <div class="w-full flex flex-col h-full overflow-hidden">
      <!-- Date label -->
      <div v-if="dateStr" class="shrink-0 px-4 lg:px-6 py-3 border-b bg-muted/20">
        <div class="flex items-center gap-3">
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

      <!-- Content -->
      <div class="flex-1 min-h-0 overflow-auto">
        <!-- No date selected -->
        <div v-if="!dateStr" class="flex items-center justify-center h-full text-muted-foreground">
          <div class="text-center">
            <div class="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="i-lucide-timer" class="size-8 text-primary" />
            </div>
            <p class="text-sm font-semibold text-foreground">Select a day</p>
            <p class="text-xs mt-1">from the sidebar to view time cards</p>
          </div>
        </div>

        <!-- Loading -->
        <div v-else-if="!isFetched" class="flex items-center justify-center h-64">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
        </div>

        <!-- Content with cards -->
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
              <!-- Top accent bar -->
              <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

              <div class="p-4 pt-4">
                <!-- Type badge + Hours -->
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

                <!-- Clock times grid -->
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

                <!-- Rates & Distance -->
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

                <!-- Comments -->
                <div v-if="tc.comments" class="mt-3">
                  <p class="text-xs text-muted-foreground italic leading-relaxed">
                    {{ tc.comments }}
                  </p>
                </div>

                <!-- Dump/Washout -->
                <div v-if="tc.dumpWashout" class="mt-2">
                  <Badge variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                    <Icon name="i-lucide-droplets" class="size-2.5" />
                    Dump/Washout
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state -->
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
    </div>
  </div>
</template>
