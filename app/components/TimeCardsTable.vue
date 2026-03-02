<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allTimeCards,
  isLoading,
  isFetched,
  fetchError,
  fetchAllTimeCards,
  syncTimeCards,
  isSyncing,
  syncResult,
} = useTimeCardsApi()

const { allSchedules, fetchAllSchedules } = useScheduledJobsApi()

// Eagerly fetch both
fetchAllTimeCards()
fetchAllSchedules()

// ─── Build scheduleId → estimate map ───
const scheduleEstimateMap = computed(() => {
  const map = new Map<string, string>()
  for (const s of allSchedules.value) {
    if (s.estimate && (s.id || s._id)) {
      map.set(s.id || s._id, s.estimate)
    }
  }
  return map
})

// ─── Enrich time cards with estimate ───
const enrichedTimeCards = computed(() => {
  return allTimeCards.value.map((tc: any) => ({
    ...tc,
    estimate: tc.estimate || (tc.scheduleId ? scheduleEstimateMap.value.get(tc.scheduleId) : null) || '',
  }))
})

// ─── Base items (scoped to estimate if provided) ───
const baseItems = computed(() => {
  if (!props.estimateNumber)
    return enrichedTimeCards.value
  return enrichedTimeCards.value.filter(tc => tc.estimate === props.estimateNumber)
})

// ─── Tabs ───
const tabs = [
  { key: 'all', label: 'All', icon: 'i-lucide-layers', color: 'text-blue-500' },
  { key: 'site', label: 'Site Time', icon: 'i-lucide-hard-hat', color: 'text-emerald-500' },
  { key: 'drive', label: 'Drive Time', icon: 'i-lucide-car', color: 'text-violet-500' },
]

const activeTab = ref('all')
const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value

  if (activeTab.value === 'site')
    items = items.filter(tc => (tc.type || '').toUpperCase().includes('SITE'))
  else if (activeTab.value === 'drive')
    items = items.filter(tc => (tc.type || '').toUpperCase().includes('DRIVE'))

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(tc =>
      (tc.employeeName || '').toLowerCase().includes(q)
      || (tc.type || '').toLowerCase().includes(q)
      || (tc.comments || '').toLowerCase().includes(q)
      || (tc.estimate || '').toLowerCase().includes(q),
    )
  }
  return items
})

// ─── Sorting ───
type SortDir = 'desc' | 'asc' | null
const sortKey = ref('clockIn')
const sortDir = ref<SortDir>('desc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : sortDir.value === 'asc' ? null : 'desc'
    if (sortDir.value === null)
      sortKey.value = ''
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const sortedItems = computed(() => {
  if (!sortKey.value || !sortDir.value)
    return filteredItems.value
  const items = [...filteredItems.value]
  const key = sortKey.value
  const dir = sortDir.value

  items.sort((a: any, b: any) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    let result = 0
    if (key === 'clockIn' || key === 'clockOut' || key === 'createdAt' || key === 'scheduleDate')
      result = new Date(av).getTime() - new Date(bv).getTime()
    else if (typeof av === 'number' && typeof bv === 'number')
      result = av - bv
    else
      result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    return dir === 'asc' ? result : -result
  })
  return items
})

// ─── Pagination ───
const PAGE_SIZE = 30
const displayCount = ref(PAGE_SIZE)
const displayedItems = computed(() => sortedItems.value.slice(0, displayCount.value))
const hasMore = computed(() => displayCount.value < sortedItems.value.length)
function loadMore() { displayCount.value += PAGE_SIZE }
watch([activeTab, search], () => { displayCount.value = PAGE_SIZE })

// ─── Expand row ───
const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Tab counts ───
function getTabCount(key: string): number {
  if (!isFetched.value) return 0
  if (key === 'all') return baseItems.value.length
  if (key === 'site') return baseItems.value.filter(tc => (tc.type || '').toUpperCase().includes('SITE')).length
  if (key === 'drive') return baseItems.value.filter(tc => (tc.type || '').toUpperCase().includes('DRIVE')).length
  return 0
}

// ─── Stats ───
const totalHours = computed(() =>
  filteredItems.value.reduce((sum, tc) => sum + (Number(tc.hours) || 0), 0),
)

const totalSiteCost = computed(() =>
  filteredItems.value
    .filter(tc => (tc.type || '').toUpperCase().includes('SITE'))
    .reduce((sum, tc) => sum + (Number(tc.hours) || 0) * (Number(tc.hourlyRateSITE) || 0), 0),
)

const totalDriveCost = computed(() =>
  filteredItems.value
    .filter(tc => (tc.type || '').toUpperCase().includes('DRIVE'))
    .reduce((sum, tc) => sum + (Number(tc.hours) || 0) * (Number(tc.hourlyRateDrive) || 0), 0),
)

// ─── Formatters ───
function formatTime(val: string | null): string {
  if (!val) return '—'
  try {
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return val
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  catch { return val }
}

function formatDate(val: string | null): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  catch { return val || '—' }
}

function formatHours(h: number | null): string {
  if (!h && h !== 0) return '—'
  return `${h.toFixed(2)}h`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getTypeColor(type: string): string {
  const t = (type || '').toUpperCase()
  if (t.includes('SITE')) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  if (t.includes('DRIVE')) return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
  return 'bg-muted text-muted-foreground border-border/30'
}

// ─── Refresh ───
async function handleRefresh() {
  await syncTimeCards()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(`Synced ${s.total} time cards — ${s.created} new, ${s.updated} updated in ${(s.duration / 1000).toFixed(1)}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
}

// ─── Scroll ───
const scrollSentinel = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!scrollSentinel.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoading.value)
        loadMore()
    },
    { threshold: 0.1 },
  )
  observer.observe(scrollSentinel.value)
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Inline header for embedded mode -->
    <div v-if="embedded" class="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-background">
      <div class="flex items-center gap-2">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search time cards..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} card{{ filteredItems.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
        {{ isSyncing ? 'Syncing...' : 'Refresh' }}
      </Button>
    </div>

    <!-- Teleport for standalone mode -->
    <ClientOnly v-if="!embedded">
      <Teleport to="#header-actions">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search time cards..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} card{{ filteredItems.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Tab Bar + Stats -->
    <div class="shrink-0 border-b bg-muted/30">
      <div class="flex items-center justify-between px-4">
        <div class="flex items-center gap-0.5 overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors whitespace-nowrap rounded-t-lg"
            :class="[activeTab === tab.key ? 'text-foreground bg-background border border-b-0 border-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50']"
            @click="activeTab = tab.key"
          >
            <Icon :name="tab.icon" class="size-3.5" :class="activeTab === tab.key ? tab.color : ''" />
            <span>{{ tab.label }}</span>
            <Badge variant="secondary" class="text-[9px] h-4 min-w-[1.25rem] px-1 tabular-nums">
              {{ getTabCount(tab.key).toLocaleString() }}
            </Badge>
          </button>
        </div>
        <div v-if="isFetched" class="hidden md:flex items-center gap-3 text-[11px]">
          <div class="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-md font-bold">
            <Icon name="i-lucide-clock" class="size-3.5" />
            {{ totalHours.toFixed(1) }}h
          </div>
          <div v-if="totalSiteCost > 0" class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-md font-bold">
            <Icon name="i-lucide-hard-hat" class="size-3" />
            {{ formatCurrency(totalSiteCost) }}
          </div>
          <div v-if="totalDriveCost > 0" class="flex items-center gap-1.5 bg-violet-500/10 text-violet-600 px-2.5 py-1 rounded-md font-bold">
            <Icon name="i-lucide-car" class="size-3" />
            {{ formatCurrency(totalDriveCost) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load time cards
        </p>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ fetchError }}
        </p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">
        Retry
      </Button>
    </div>

    <!-- Table -->
    <div class="flex-1 min-h-0 overflow-auto">
      <table class="w-full text-[11px]">
        <thead class="sticky top-0 z-10 bg-background border-b">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">
              #
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Employee
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('clockIn')">
              <div class="flex items-center gap-1">
                Clock In
                <Icon v-if="sortKey === 'clockIn'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Clock Out
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('hours')">
              <div class="flex items-center gap-1">
                Hours
                <Icon v-if="sortKey === 'hours'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Rate
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('scheduleDate')">
              <div class="flex items-center gap-1">
                Date
                <Icon v-if="sortKey === 'scheduleDate'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground">
              Estimate
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="estimateNumber ? 9 : 10" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">
                  Loading time cards...
                </p>
              </div>
            </td>
          </tr>

          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="estimateNumber ? 9 : 10" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-clock" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">
                  No Time Cards
                </h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No cards match your search.' : estimateNumber ? 'No time cards for this estimate.' : 'No time card records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                  Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <template v-for="(tc, index) in displayedItems" :key="tc.id || tc._id">
            <tr class="hover:bg-muted/30 transition-colors cursor-pointer" :class="{ 'bg-muted/20': expandedId === (tc.id || tc._id) }" @click="toggleExpand(tc.id || tc._id)">
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1.5">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="tc.employeeAvatar" :src="tc.employeeAvatar" />
                    <AvatarFallback class="text-[7px]">{{ getInitials(tc.employeeName) }}</AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] font-medium truncate max-w-[110px]">{{ tc.employeeName || '—' }}</span>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <Badge variant="outline" class="text-[9px] font-bold" :class="getTypeColor(tc.type)">
                  {{ tc.type || '—' }}
                </Badge>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {{ formatTime(tc.clockIn) }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                {{ formatTime(tc.clockOut) }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span v-if="tc.hours" class="font-bold" :class="(tc.type || '').toUpperCase().includes('SITE') ? 'text-emerald-600' : 'text-violet-600'">
                  {{ formatHours(tc.hours) }}
                </span>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span v-if="(tc.type || '').toUpperCase().includes('SITE') && tc.hourlyRateSITE" class="font-medium text-emerald-600">
                  ${{ Number(tc.hourlyRateSITE).toFixed(0) }}/hr
                </span>
                <span v-else-if="(tc.type || '').toUpperCase().includes('DRIVE') && tc.hourlyRateDrive" class="font-medium text-violet-600">
                  ${{ Number(tc.hourlyRateDrive).toFixed(0) }}/hr
                </span>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                {{ formatDate(tc.scheduleDate || tc.clockIn) }}
              </td>
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="tc.estimate" variant="outline" class="text-[10px] font-bold tabular-nums bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  {{ tc.estimate }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5">
                <Icon :name="expandedId === (tc.id || tc._id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-muted-foreground" />
              </td>
            </tr>

            <!-- Expanded detail -->
            <tr v-if="expandedId === (tc.id || tc._id)">
              <td :colspan="estimateNumber ? 9 : 10" class="px-0 py-0 bg-muted/10">
                <div class="p-4">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Time Details -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-clock" class="size-3.5 text-orange-500" /> Time Details
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Clock In</span>
                          <span class="font-medium">{{ formatTime(tc.clockIn) }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Clock Out</span>
                          <span class="font-medium">{{ formatTime(tc.clockOut) }}</span>
                        </div>
                        <template v-if="tc.lunchStart || tc.lunchEnd">
                          <Separator />
                          <div class="flex justify-between items-center">
                            <span class="text-muted-foreground">Lunch Start</span>
                            <span class="font-medium">{{ formatTime(tc.lunchStart) }}</span>
                          </div>
                          <div class="flex justify-between items-center">
                            <span class="text-muted-foreground">Lunch End</span>
                            <span class="font-medium">{{ formatTime(tc.lunchEnd) }}</span>
                          </div>
                        </template>
                        <Separator />
                        <div class="flex justify-between items-center">
                          <span class="font-bold text-muted-foreground">Total Hours</span>
                          <span class="text-base font-bold" :class="(tc.type || '').toUpperCase().includes('SITE') ? 'text-emerald-600' : 'text-violet-600'">
                            {{ formatHours(tc.hours) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Pay & Distance -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-dollar-sign" class="size-3.5 text-emerald-500" /> Pay Info
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Type</span>
                          <Badge variant="outline" class="text-[9px] font-bold" :class="getTypeColor(tc.type)">{{ tc.type }}</Badge>
                        </div>
                        <div v-if="tc.hourlyRateSITE" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Site Rate</span>
                          <span class="font-bold text-emerald-600">${{ Number(tc.hourlyRateSITE).toFixed(2) }}/hr</span>
                        </div>
                        <div v-if="tc.hourlyRateDrive" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Drive Rate</span>
                          <span class="font-bold text-violet-600">${{ Number(tc.hourlyRateDrive).toFixed(2) }}/hr</span>
                        </div>
                        <div v-if="tc.distance" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Distance</span>
                          <span class="font-bold">{{ Number(tc.distance).toFixed(1) }} mi</span>
                        </div>
                        <div v-if="tc.dumpQty" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Dump Qty</span>
                          <span class="font-medium">{{ tc.dumpQty }}</span>
                        </div>
                        <div v-if="tc.shopQty" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Shop Qty</span>
                          <span class="font-medium">{{ tc.shopQty }}</span>
                        </div>
                        <template v-if="tc.hours && (tc.hourlyRateSITE || tc.hourlyRateDrive)">
                          <Separator />
                          <div class="flex justify-between items-center pt-1">
                            <span class="font-bold text-muted-foreground uppercase tracking-wider">Est. Cost</span>
                            <span class="text-base font-bold text-emerald-600">
                              {{ formatCurrency(Number(tc.hours) * (Number((tc.type || '').toUpperCase().includes('SITE') ? tc.hourlyRateSITE : tc.hourlyRateDrive) || 0)) }}
                            </span>
                          </div>
                        </template>
                      </div>
                    </div>

                    <!-- Comments & Meta -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-info" class="size-3.5 text-blue-500" /> Additional Info
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Schedule Date</span>
                          <span class="font-medium">{{ formatDate(tc.scheduleDate) }}</span>
                        </div>
                        <div v-if="tc.estimate" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Estimate</span>
                          <Badge variant="outline" class="text-[10px] font-bold tabular-nums">{{ tc.estimate }}</Badge>
                        </div>
                        <div v-if="tc.createdAt" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Created</span>
                          <span class="font-medium">{{ formatDate(tc.createdAt) }}</span>
                        </div>
                      </div>
                      <div v-if="tc.comments" class="pt-2 border-t">
                        <p class="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">
                          Comments
                        </p>
                        <p class="text-[11px] text-foreground/80 whitespace-pre-line leading-relaxed bg-muted/30 rounded-md p-2">
                          {{ tc.comments }}
                        </p>
                      </div>
                      <div v-if="!tc.comments && !tc.createdAt && !tc.estimate" class="text-xs text-muted-foreground italic text-center py-4">
                        No additional information
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="hasMore" ref="scrollSentinel">
            <td :colspan="estimateNumber ? 9 : 10" class="py-4 text-center">
              <div class="flex items-center justify-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-4 animate-spin" />
                <span class="text-xs">Loading more...</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
