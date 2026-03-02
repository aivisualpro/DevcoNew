<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allPreBore,
  isLoading,
  isFetched,
  fetchError,
  fetchAllPreBore,
  refreshPreBore,
  isSyncing,
  syncResult,
} = usePreBoreApi()

fetchAllPreBore()

// ─── Base items (scoped to estimate if provided) ───
const baseItems = computed(() => {
  if (!props.estimateNumber)
    return allPreBore.value
  return allPreBore.value.filter((r: any) => r.estimate === props.estimateNumber)
})

const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value
  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter((r: any) =>
      (r.estimate || '').toLowerCase().includes(q)
      || (r.customerName || '').toLowerCase().includes(q)
      || (r.scheduleTitle || '').toLowerCase().includes(q)
      || (r.soilType || '').toLowerCase().includes(q)
      || (r.createdByName || '').toLowerCase().includes(q)
      || (r.devcoOperatorName || '').toLowerCase().includes(q)
      || (r.addressBoreStart || '').toLowerCase().includes(q)
      || (r.addressBoreEnd || '').toLowerCase().includes(q),
    )
  }
  return items
})

// ─── Sorting ───
type SortDir = 'desc' | 'asc' | null
const sortKey = ref('date')
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
  items.sort((a: any, b: any) => {
    const av = a[sortKey.value]
    const bv = b[sortKey.value]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    let result = 0
    if (sortKey.value === 'date' || sortKey.value === 'createdAt')
      result = new Date(av).getTime() - new Date(bv).getTime()
    else if (typeof av === 'number' && typeof bv === 'number')
      result = av - bv
    else
      result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    return sortDir.value === 'asc' ? result : -result
  })
  return items
})

// ─── Pagination ───
const PAGE_SIZE = 30
const displayCount = ref(PAGE_SIZE)
const displayedItems = computed(() => sortedItems.value.slice(0, displayCount.value))
const hasMore = computed(() => displayCount.value < sortedItems.value.length)
function loadMore() { displayCount.value += PAGE_SIZE }
watch([search], () => { displayCount.value = PAGE_SIZE })

// ─── Expand row (detail view) ───
const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Formatters ───
function formatDate(val: string): string {
  if (!val) return '—'
  try { return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }
  catch { return val }
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Refresh ───
async function handleRefresh() {
  await refreshPreBore()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(`Synced ${s.total} pre-bore logs — ${s.created} new, ${s.updated} updated in ${(s.duration / 1000).toFixed(1)}s`)
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
          <Input v-model="search" placeholder="Search pre-bore logs..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length }} record{{ filteredItems.length !== 1 ? 's' : '' }}
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
          <Input v-model="search" placeholder="Search pre-bore logs..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length }} record{{ filteredItems.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Error -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load pre-bore logs
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
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('date')">
              <div class="flex items-center gap-1">
                Date
                <Icon v-if="sortKey === 'date'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('estimate')">
              <div class="flex items-center gap-1">
                Estimate
                <Icon v-if="sortKey === 'estimate'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Customer
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Soil Type
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('boreLength')">
              <div class="flex items-center gap-1">
                Bore Length
                <Icon v-if="sortKey === 'boreLength'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('logCount')">
              <div class="flex items-center gap-1">
                Logs
                <Icon v-if="sortKey === 'logCount'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Signatures
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="9" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">
                  Loading pre-bore logs...
                </p>
              </div>
            </td>
          </tr>

          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="9" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-drill" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">
                  No Pre-Bore Logs
                </h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No logs match your search.' : estimateNumber ? 'No pre-bore logs for this estimate.' : 'No pre-bore log records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                  Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <template v-for="(record, index) in displayedItems" :key="record.id">
            <tr class="hover:bg-muted/30 transition-colors cursor-pointer" :class="{ 'bg-muted/20': expandedId === record.id }" @click="toggleExpand(record.id)">
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-medium">
                {{ formatDate(record.date) }}
              </td>
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="record.estimate" variant="outline" class="text-[10px] font-bold tabular-nums bg-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20">
                  {{ record.estimate }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 max-w-[140px]">
                <p class="truncate" :title="record.customerName">
                  {{ record.customerName || '—' }}
                </p>
              </td>
              <td class="px-3 py-2.5">
                <Badge v-if="record.soilType" variant="secondary" class="text-[9px]">{{ record.soilType }}</Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-semibold">
                {{ record.boreLength || '—' }}
              </td>
              <td class="px-3 py-2.5">
                <Badge variant="secondary" class="text-[10px] font-bold tabular-nums h-5 min-w-5 justify-center">
                  {{ record.logCount || 0 }}
                </Badge>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger>
                      <div class="size-5 rounded-full flex items-center justify-center" :class="record.hasForemanSignature ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground/40'">
                        <Icon name="i-lucide-hard-hat" class="size-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="text-[10px]">
                      Foreman: {{ record.hasForemanSignature ? 'Signed' : 'Pending' }}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger>
                      <div class="size-5 rounded-full flex items-center justify-center" :class="record.hasCustomerSignature ? 'bg-emerald-500/15 text-emerald-500' : 'bg-muted text-muted-foreground/40'">
                        <Icon name="i-lucide-user" class="size-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="text-[10px]">
                      Customer: {{ record.hasCustomerSignature ? 'Signed' : 'Pending' }}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <Icon :name="expandedId === record.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-muted-foreground" />
              </td>
            </tr>

            <!-- Expanded detail -->
            <tr v-if="expandedId === record.id">
              <td :colspan="9" class="px-0 py-0 bg-muted/10">
                <div class="p-4 space-y-4">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Info -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-info" class="size-3.5 text-sky-500" /> Bore Details
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Date</span>
                          <span class="font-medium">{{ formatDate(record.date) }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Drill Size</span>
                          <span class="font-bold">{{ record.drillSize || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Pilot Bore</span>
                          <span class="font-medium">{{ record.pilotBoreSize || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Bore Length</span>
                          <span class="font-bold">{{ record.boreLength || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Pipe Size</span>
                          <span class="font-medium">{{ record.pipeSize || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Soil Type</span>
                          <Badge variant="secondary" class="text-[9px]">{{ record.soilType || '—' }}</Badge>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t mt-1">
                          <span class="text-muted-foreground">Start</span>
                          <span class="font-medium text-right max-w-[140px] truncate text-[10px]">{{ record.addressBoreStart || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">End</span>
                          <span class="font-medium text-right max-w-[140px] truncate text-[10px]">{{ record.addressBoreEnd || '—' }}</span>
                        </div>
                        <div v-if="record.devcoOperatorName || record.devcoOperator" class="flex justify-between items-center pt-2 border-t mt-1">
                          <span class="text-muted-foreground">Operator</span>
                          <span class="font-medium">{{ record.devcoOperatorName || record.devcoOperator }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Bore Logs Table -->
                    <div class="rounded-lg border bg-card p-3 space-y-2 lg:col-span-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-list" class="size-3.5 text-purple-500" />
                        Rod Logs ({{ record.logCount || 0 }})
                      </h4>
                      <div class="max-h-[300px] overflow-auto">
                        <table v-if="record.preBoreLogs && record.preBoreLogs.length > 0" class="w-full text-[10px]">
                          <thead>
                            <tr class="border-b">
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                Rod #
                              </th>
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                Distance
                              </th>
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                Top Depth
                              </th>
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                Bottom Depth
                              </th>
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                O/U
                              </th>
                              <th class="px-2 py-1.5 text-left font-medium text-muted-foreground">
                                Utilities
                              </th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-border/30">
                            <tr v-for="(log, idx) in record.preBoreLogs" :key="idx" class="hover:bg-muted/30">
                              <td class="px-2 py-1.5 tabular-nums font-bold text-sky-600">
                                {{ log.rodNumber || idx + 1 }}
                              </td>
                              <td class="px-2 py-1.5 tabular-nums font-semibold">
                                {{ log.distance || '—' }}
                              </td>
                              <td class="px-2 py-1.5 tabular-nums">
                                {{ log.topDepth || '—' }}
                              </td>
                              <td class="px-2 py-1.5 tabular-nums">
                                {{ log.bottomDepth || '—' }}
                              </td>
                              <td class="px-2 py-1.5">
                                <Badge
                                  v-if="log.overOrUnder"
                                  variant="secondary"
                                  class="text-[8px] h-4 px-1"
                                  :class="log.overOrUnder === 'O' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'"
                                >
                                  {{ log.overOrUnder === 'O' ? 'Over' : log.overOrUnder === 'U' ? 'Under' : log.overOrUnder }}
                                </Badge>
                                <span v-else class="text-muted-foreground">—</span>
                              </td>
                              <td class="px-2 py-1.5">
                                {{ log.existingUtilities || '—' }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <p v-else class="text-xs text-muted-foreground italic py-4 text-center">
                          No bore log entries recorded
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- View Full Detail link -->
                  <div class="flex justify-end">
                    <NuxtLink :to="`/job-docs/pre-bore-logs/${record.id}`" class="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1" @click.stop>
                      <Icon name="i-lucide-external-link" class="size-3" />
                      View Full Detail
                    </NuxtLink>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="hasMore" ref="scrollSentinel">
            <td :colspan="9" class="py-4 text-center">
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
