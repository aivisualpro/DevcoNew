<script setup lang="ts">
import type { CrudColumn } from '~/composables/useCrud'
import { toast } from 'vue-sonner'

const props = defineProps<{
  title: string
  description: string
  icon: string
  columns: CrudColumn[]
  filterFn: (est: any) => boolean
}>()
const route = useRoute()
const router = useRouter()

const { setHeader } = usePageHeader()
setHeader({ title: props.title, icon: props.icon })

// Watch for title changes (when switching tabs)
watch(() => props.title, (newTitle) => {
  setHeader({ title: newTitle, icon: props.icon })
})

// ─── Global cached data ───
const {
  allEstimates,
  isLoading,
  isFetched,
  fetchError,
  fetchAllEstimates,
  refreshEstimates,
  isSyncing,
  syncResult,
} = useEstimatesApi()

// Eagerly fetch (uses global cache — instant if already loaded)
fetchAllEstimates()

// ─── Row highlight when coming back from detail ───
const highlightId = ref<string | null>(null)

watch(() => route.query.highlight, (newId) => {
  if (newId && typeof newId === 'string') {
    highlightId.value = newId
    nextTick(() => {
      setTimeout(() => {
        const el = document.querySelector(`[data-estimate-id="${newId}"]`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 200)
    })
    setTimeout(() => {
      highlightId.value = null
      router.replace({ query: { ...route.query, highlight: undefined } })
    }, 3000)
  }
}, { immediate: true })

// ─── UI State ───
const search = ref('')

// ─── Sorting ───
type SortDir = 'asc' | 'desc' | null
const sortKey = ref<string>('estimate')
const sortDir = ref<SortDir>('desc') // Default: newest estimate first

function toggleSort(key: string) {
  if (sortKey.value === key) {
    // Cycle: desc -> asc -> null -> desc
    if (sortDir.value === 'desc') {
      sortDir.value = 'asc'
    }
    else if (sortDir.value === 'asc') {
      sortDir.value = null
      sortKey.value = ''
    }
    else { sortDir.value = 'desc'; sortKey.value = key }
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function getSortIcon(key: string): string {
  if (sortKey.value !== key || !sortDir.value)
    return 'i-lucide-arrow-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function compare(a: any, b: any, key: string, dir: SortDir): number {
  if (!dir)
    return 0
  const av = a[key]
  const bv = b[key]

  // Handle nulls
  if (av == null && bv == null)
    return 0
  if (av == null)
    return 1
  if (bv == null)
    return -1

  let result = 0

  // Smart compare by type
  if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv
  }
  else if (key === 'date' || key === 'createdAt') {
    result = new Date(av).getTime() - new Date(bv).getTime()
  }
  else if (key === 'estimate') {
    // Compare estimate numbers like "26-0117" → split by dash, compare year first then sequence
    const partsA = String(av).split('-')
    const partsB = String(bv).split('-')
    const yearA = Number.parseInt(partsA[0] || '0', 10)
    const yearB = Number.parseInt(partsB[0] || '0', 10)
    if (yearA !== yearB) {
      result = yearA - yearB
    }
    else {
      const seqA = Number.parseInt(partsA[1] || '0', 10)
      const seqB = Number.parseInt(partsB[1] || '0', 10)
      result = seqA - seqB
    }
  }
  else {
    result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
  }

  return dir === 'asc' ? result : -result
}

// ─── Base filtered items ───
const baseFilteredItems = computed(() => allEstimates.value.filter(props.filterFn))

// ─── Client-side filtering with search ───
const filteredItems = computed(() => {
  let result = baseFilteredItems.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      ['estimate', 'projectName', 'contactName', 'customerName', 'proposalWriter', 'status', 'services'].some((key) => {
        const val = item[key]
        if (Array.isArray(val))
          return val.some((v: any) => String(v).toLowerCase().includes(q))
        return String(val ?? '').toLowerCase().includes(q)
      }),
    )
  }

  return result
})

// ─── Sorted items ───
const sortedItems = computed(() => {
  const items = [...filteredItems.value]
  if (sortKey.value && sortDir.value) {
    items.sort((a, b) => compare(a, b, sortKey.value, sortDir.value))
  }
  return items
})

// ─── Infinite scroll (30 per batch) ───
const BATCH_SIZE = 30
const visibleCount = ref(BATCH_SIZE)
const scrollContainerRef = ref<HTMLElement | null>(null)

// Reset visible count on search/sort/filter change
watch([search, sortKey, sortDir, () => props.filterFn], () => {
  visibleCount.value = BATCH_SIZE
})

const visibleItems = computed(() => sortedItems.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedItems.value.length)
const totalFiltered = computed(() => filteredItems.value.length)

function loadMore() {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, sortedItems.value.length)
  }
}

// Scroll handler for infinite loading
function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target)
    return
  const threshold = 200
  if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
    loadMore()
  }
}

// ─── Formatters ───
const badgeClasses: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Won: 'bg-green-600/10 text-green-600 border-green-600/20',
  Lost: 'bg-red-500/10 text-red-600 border-red-500/20',
}

function getBadgeClass(value: string): string {
  return badgeClasses[value] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

function abbreviate(text: string): string {
  return text
    .split(/[\s\-–—/]+/)
    .filter(w => w.length > 0)
    .map(w => w[0].toUpperCase())
    .join('')
}

function formatCurrency(value: any): string {
  if (value === null || value === undefined)
    return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value))
}

function formatDate(value: string): string {
  if (!value)
    return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return value }
}

async function handleRefresh() {
  await refreshEstimates()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} estimates — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
  else {
    toast.success('Estimates refreshed')
  }
}
</script>

<template>
  <ClientOnly>
    <Teleport to="#header-actions">
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search estimates..." class="pl-8 h-8 w-48 text-sm" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ totalFiltered }} estimate{{ totalFiltered !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8" :disabled="isLoading || isSyncing" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isLoading || isSyncing }" />
        {{ isSyncing ? 'Syncing...' : 'Refresh' }}
      </Button>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load estimates
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
    <div v-if="!fetchError" ref="scrollContainerRef" class="flex-1 min-h-0 overflow-auto" @scroll="handleScroll">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
          <TableRow>
            <TableHead
              v-for="col in columns"
              :key="col.key"
              class="text-[10px] h-8 select-none cursor-pointer hover:bg-muted/80 transition-colors group/th"
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
            :key="item.id || item._id"
            :data-estimate-id="item.id || item._id"
            class="group hover:bg-muted/50 transition-all cursor-pointer"
            :class="{
              'ring-2 ring-primary/60 bg-primary/5 animate-highlight-fade': highlightId === (item.id || item._id),
            }"
            @click="navigateTo(`/estimates/${item.id || item._id}/summary`)"
          >
            <TableCell v-for="col in columns" :key="col.key">
              <!-- Avatar -->
              <div v-if="col.type === 'avatar'" class="flex items-center gap-3">
                <Avatar class="size-8 border">
                  <AvatarImage :src="item.proposalWriterAvatar" :alt="item[col.key]" />
                  <AvatarFallback class="text-[8px]">
                    {{ String(item[col.key] || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
                  </AvatarFallback>
                </Avatar>
                <span class="font-medium text-[10px]">{{ item[col.key] || '—' }}</span>
              </div>

              <!-- Avatar Only -->
              <div v-else-if="col.type === 'avatar-only'" class="flex justify-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Avatar class="size-8 border cursor-help">
                        <AvatarImage :src="item.proposalWriterAvatar" :alt="item[col.key]" />
                        <AvatarFallback class="text-[8px]">
                          {{ String(item[col.key] || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{{ item[col.key] || 'Unknown' }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <!-- Badge -->
              <Badge v-else-if="col.type === 'badge'" variant="outline" :class="getBadgeClass(item[col.key])">
                {{ item[col.key] || 'Pending' }}
              </Badge>

              <!-- Currency -->
              <span v-else-if="col.type === 'currency'" class="tabular-nums font-medium text-[10px]">
                {{ formatCurrency(item[col.key]) }}
              </span>

              <!-- Percent -->
              <span v-else-if="col.type === 'percent'" class="tabular-nums text-[10px]">
                {{ item[col.key] ? `${String(item[col.key]).replace('%', '')}%` : '—' }}
              </span>

              <!-- Boolean -->
              <div v-else-if="col.type === 'boolean'" class="flex items-center">
                <Icon v-if="item[col.key]" name="i-lucide-check" class="size-4 text-emerald-500" />
                <span v-else class="text-muted-foreground">—</span>
              </div>

              <!-- Date -->
              <span v-else-if="col.type === 'date'" class="text-muted-foreground text-[10px]">
                {{ formatDate(item[col.key]) }}
              </span>

              <!-- Tags (Services) -->
              <div v-else-if="col.type === 'tags'" class="flex flex-nowrap gap-1 overflow-hidden">
                <Tooltip v-for="tag in (item[col.key] || [])" :key="tag">
                  <TooltipTrigger as-child>
                    <Badge variant="secondary" class="text-[10px] font-semibold bg-muted text-muted-foreground border-transparent whitespace-nowrap shrink-0 px-1.5 py-0 h-5 cursor-default">
                      {{ abbreviate(tag) }}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{{ tag }}</TooltipContent>
                </Tooltip>
              </div>

              <!-- Default -->
              <span v-else class="text-[10px]">{{ item[col.key] || '—' }}</span>
            </TableCell>
          </TableRow>
          <!-- Loading rows -->
          <TableRow v-if="!isFetched && !fetchError">
            <TableCell :colspan="columns.length" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">
                  Loading estimates...
                </p>
              </div>
            </TableCell>
          </TableRow>
          <TableRow v-else-if="visibleItems.length === 0">
            <TableCell :colspan="columns.length" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-inbox" class="size-8" />
                <p>No estimates found</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Loading more indicator -->
      <div v-if="hasMore" class="flex items-center justify-center py-4 text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="size-4 animate-spin mr-2" />
        <span class="text-xs">Scroll for more...</span>
      </div>
    </div>

    <!-- Footer status bar -->
    <div v-if="isFetched && !fetchError" class="shrink-0 border-t bg-muted/30 px-4 lg:px-6 py-2 flex items-center justify-between gap-2">
      <p class="text-xs text-muted-foreground tabular-nums">
        Showing {{ visibleItems.length }} of {{ totalFiltered }} estimates
      </p>
      <p v-if="sortKey && sortDir" class="text-xs text-muted-foreground flex items-center gap-1">
        <Icon :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3" />
        Sorted by {{ columns.find(c => c.key === sortKey)?.label || sortKey }}
      </p>
    </div>
  </div>
</template>
