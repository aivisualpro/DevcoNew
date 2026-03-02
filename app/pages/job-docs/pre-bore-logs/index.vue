<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Pre-Bore Logs',
  icon: 'i-lucide-drill',
})

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

// Eagerly fetch
fetchAllPreBore()

// ─── Search ───
const search = ref('')

const filteredRecords = computed(() => {
  let result = allPreBore.value
  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(r =>
      (r.customerName || '').toLowerCase().includes(q)
      || (r.scheduleTitle || '').toLowerCase().includes(q)
      || (r.addressBoreStart || '').toLowerCase().includes(q)
      || (r.addressBoreEnd || '').toLowerCase().includes(q)
      || (r.devcoOperatorName || r.devcoOperator || '').toLowerCase().includes(q)
      || (r.soilType || '').toLowerCase().includes(q)
      || (r.estimate || '').toLowerCase().includes(q)
      || (r.service || '').toLowerCase().includes(q)
      || (r.customerForeman || '').toLowerCase().includes(q),
    )
  }
  return result
})

// ─── Sorting ───
type SortDir = 'asc' | 'desc' | null
const sortKey = ref<string>('date')
const sortDir = ref<SortDir>('desc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    if (sortDir.value === 'desc') sortDir.value = 'asc'
    else if (sortDir.value === 'asc') { sortDir.value = null; sortKey.value = '' }
    else { sortDir.value = 'desc'; sortKey.value = key }
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function getSortIcon(key: string): string {
  if (sortKey.value !== key || !sortDir.value) return 'i-lucide-arrow-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

const sortedRecords = computed(() => {
  const items = [...filteredRecords.value]
  if (!sortKey.value || !sortDir.value) return items

  items.sort((a, b) => {
    const av = a[sortKey.value]
    const bv = b[sortKey.value]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1

    let result = 0
    if (sortKey.value === 'date' || sortKey.value === 'createdAt') {
      result = new Date(av).getTime() - new Date(bv).getTime()
    }
    else if (typeof av === 'number' && typeof bv === 'number') {
      result = av - bv
    }
    else {
      result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    }
    return sortDir.value === 'asc' ? result : -result
  })
  return items
})

// ─── Infinite scroll ───
const BATCH_SIZE = 30
const visibleCount = ref(BATCH_SIZE)
watch([search, sortKey, sortDir], () => { visibleCount.value = BATCH_SIZE })

const visibleItems = computed(() => sortedRecords.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedRecords.value.length)

function loadMore() {
  if (hasMore.value)
    visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, sortedRecords.value.length)
}

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target) return
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 200)
    loadMore()
}

// ─── Formatters ───
function formatDate(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return value }
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

async function handleRefresh() {
  await refreshPreBore()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} pre-bore records — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
  else {
    toast.success('Pre-bore logs refreshed')
  }
}

// Table columns
const columns = [
  { key: 'date', label: 'Date' },
  { key: 'customerName', label: 'Customer' },
  { key: 'scheduleTitle', label: 'Schedule / Job' },
  { key: 'addressBoreStart', label: 'Start Address' },
  { key: 'addressBoreEnd', label: 'End Address' },
  { key: 'devcoOperatorName', label: 'Operator' },
  { key: 'soilType', label: 'Soil Type' },
  { key: 'boreLength', label: 'Bore Length' },
  { key: 'pipeSize', label: 'Pipe Size' },
  { key: 'logCount', label: 'Logs' },
  { key: 'signatures', label: 'Signatures' },
]
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Teleport toolbar into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <!-- Search -->
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search pre-bore logs..." class="pl-8 h-8 w-48 text-sm" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredRecords.length }} record{{ filteredRecords.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-8" :disabled="isLoading || isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isLoading || isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Error Banner -->
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
    <ClientOnly>
      <div v-if="!fetchError" class="flex-1 min-h-0 overflow-auto" @scroll="handleScroll">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
            <TableRow>
              <TableHead
                v-for="col in columns"
                :key="col.key"
                class="text-[10px] h-8 select-none cursor-pointer hover:bg-muted/80 transition-colors group/th whitespace-nowrap"
                @click="toggleSort(col.key)"
              >
                <div class="flex items-center gap-1">
                  <span>{{ col.label }}</span>
                  <Icon
                    :name="getSortIcon(col.key)"
                    class="size-3 shrink-0 transition-opacity"
                    :class="sortKey === col.key && sortDir ? 'text-primary opacity-100' : 'opacity-0 group-hover/th:opacity-40'"
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in visibleItems"
              :key="item.id"
              class="group cursor-pointer hover:bg-muted/50 transition-colors"
              @click="navigateTo(`/job-docs/pre-bore-logs/${item.id}`)"
            >
              <!-- Date -->
              <TableCell class="text-[10px] text-muted-foreground whitespace-nowrap">
                {{ formatDate(item.date) }}
              </TableCell>

              <!-- Customer -->
              <TableCell>
                <div class="flex items-center gap-2">
                  <div class="size-6 rounded-md bg-sky-500/10 flex items-center justify-center shrink-0">
                    <Icon name="i-lucide-building-2" class="size-3 text-sky-500" />
                  </div>
                  <span class="text-[10px] font-medium truncate max-w-[120px]">{{ item.customerName || '—' }}</span>
                </div>
              </TableCell>

              <!-- Schedule Title -->
              <TableCell>
                <div class="flex items-center gap-1.5">
                  <span class="text-[10px] truncate max-w-[160px]">{{ item.scheduleTitle || '—' }}</span>
                  <Badge v-if="item.estimate" variant="outline" class="text-[9px] bg-primary/5 text-primary border-primary/20 shrink-0 px-1.5 h-4">
                    {{ item.estimate }}
                  </Badge>
                </div>
              </TableCell>

              <!-- Start Address -->
              <TableCell class="text-[10px] truncate max-w-[120px]">
                {{ item.addressBoreStart || '—' }}
              </TableCell>

              <!-- End Address -->
              <TableCell class="text-[10px] truncate max-w-[120px]">
                {{ item.addressBoreEnd || '—' }}
              </TableCell>

              <!-- Operator -->
              <TableCell>
                <div v-if="item.devcoOperatorName || item.devcoOperator" class="flex items-center gap-2">
                  <Avatar class="size-6 border">
                    <AvatarImage v-if="item.devcoOperatorAvatar" :src="item.devcoOperatorAvatar" />
                    <AvatarFallback class="text-[9px]">{{ getInitials(item.devcoOperatorName || item.devcoOperator) }}</AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] truncate max-w-[100px]">{{ item.devcoOperatorName || item.devcoOperator }}</span>
                </div>
                <span v-else class="text-[10px] text-muted-foreground">—</span>
              </TableCell>

              <!-- Soil Type -->
              <TableCell>
                <Badge v-if="item.soilType" variant="secondary" class="text-[9px] font-normal">
                  {{ item.soilType }}
                </Badge>
                <span v-else class="text-[10px] text-muted-foreground">—</span>
              </TableCell>

              <!-- Bore Length -->
              <TableCell class="text-[10px] font-semibold tabular-nums">
                {{ item.boreLength || '—' }}
              </TableCell>

              <!-- Pipe Size -->
              <TableCell class="text-[10px] tabular-nums">
                {{ item.pipeSize || '—' }}
              </TableCell>

              <!-- Log Count -->
              <TableCell>
                <Badge variant="secondary" class="text-[9px] font-bold tabular-nums h-5 min-w-5 justify-center">
                  {{ item.logCount || 0 }}
                </Badge>
              </TableCell>

              <!-- Signatures -->
              <TableCell>
                <div class="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <div
                          class="size-5 rounded-full flex items-center justify-center transition-colors"
                          :class="item.hasForemanSignature ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground/40'"
                        >
                          <Icon :name="item.hasForemanSignature ? 'i-lucide-check' : 'i-lucide-minus'" class="size-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ item.hasForemanSignature ? 'Foreman signed' : 'Foreman not signed' }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <div
                          class="size-5 rounded-full flex items-center justify-center transition-colors"
                          :class="item.hasCustomerSignature ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground/40'"
                        >
                          <Icon :name="item.hasCustomerSignature ? 'i-lucide-check' : 'i-lucide-minus'" class="size-3" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{{ item.hasCustomerSignature ? 'Customer signed' : 'Customer not signed' }}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableCell>
            </TableRow>

            <!-- Skeleton loading rows -->
            <template v-if="!isFetched && !fetchError">
              <TableRow v-for="i in 12" :key="`skeleton-${i}`" class="animate-pulse">
                <TableCell v-for="col in columns" :key="`sk-${col.key}-${i}`">
                  <div class="h-3 rounded bg-muted-foreground/10" :style="{ width: `${30 + (i * 13) % 60}px` }" />
                </TableCell>
              </TableRow>
            </template>

            <!-- Empty State -->
            <TableRow v-else-if="visibleItems.length === 0">
              <TableCell :colspan="columns.length" class="h-64 text-center">
                <div class="flex flex-col items-center gap-3 text-muted-foreground">
                  <div class="size-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                    <Icon name="i-lucide-drill" class="size-8 text-sky-500/50" />
                  </div>
                  <div>
                    <p class="font-semibold text-foreground">
                      {{ search ? 'No matching records' : 'No Pre-Bore Logs Found' }}
                    </p>
                    <p class="text-xs mt-1">
                      {{ search ? 'Try adjusting your search.' : 'Press Refresh to sync data from MongoDB.' }}
                    </p>
                  </div>
                  <Button v-if="!search" variant="outline" size="sm" :disabled="isSyncing" @click="handleRefresh">
                    <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                    Sync from MongoDB
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- Loading more -->
        <div v-if="hasMore" class="flex items-center justify-center py-4 text-muted-foreground">
          <Icon name="i-lucide-loader-2" class="size-4 animate-spin mr-2" />
          <span class="text-xs">Scroll for more...</span>
        </div>
      </div>

      <template #fallback>
        <div class="flex-1 flex flex-col p-4 gap-3">
          <div v-for="i in 8" :key="`fb-${i}`" class="flex items-center gap-4 animate-pulse">
            <div class="h-3 rounded bg-muted-foreground/10 w-16" />
            <div class="flex-1 flex gap-3">
              <div class="h-3 rounded bg-muted-foreground/10 flex-1" />
              <div class="h-3 rounded bg-muted-foreground/10 w-24" />
              <div class="h-3 rounded bg-muted-foreground/10 w-16" />
            </div>
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- Footer status bar -->
    <ClientOnly>
      <div v-if="isFetched && !fetchError" class="shrink-0 border-t bg-muted/30 px-4 lg:px-6 py-2 flex items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground tabular-nums">
          Showing {{ visibleItems.length }} of {{ filteredRecords.length }} records
        </p>
        <p v-if="sortKey && sortDir" class="text-xs text-muted-foreground flex items-center gap-1">
          <Icon :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3" />
          Sorted by {{ columns.find(c => c.key === sortKey)?.label || sortKey }}
        </p>
      </div>
    </ClientOnly>
  </div>
</template>
