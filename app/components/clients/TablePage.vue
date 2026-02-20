<script setup lang="ts">
import type { CrudColumn } from '~/composables/useCrud'
import { toast } from 'vue-sonner'

const props = defineProps<{
  title: string
  description: string
  icon: string
  columns: CrudColumn[]
  filterFn: (client: any) => boolean
}>()

const { setHeader } = usePageHeader()
setHeader({ title: props.title, description: props.description, icon: props.icon })

// ─── Global cached data ───
const {
  allClients,
  isLoading,
  isFetched,
  fetchError,
  fetchAllClients,
  refreshClients,
  isSyncing,
  syncResult,
} = useClientsApi()

// Eagerly fetch (uses global cache — instant if already loaded)
fetchAllClients()

// ─── UI State ───
const search = ref('')

// ─── Sorting ───
type SortDir = 'asc' | 'desc' | null
const sortKey = ref<string>('name')
const sortDir = ref<SortDir>('asc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    if (sortDir.value === 'desc') {
      sortDir.value = 'asc'
    }
    else if (sortDir.value === 'asc') {
      sortDir.value = null
      sortKey.value = ''
    }
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

// ─── Base filtered list ───
const baseFilteredItems = computed(() => allClients.value.filter(props.filterFn))

// ─── Status counts ───
const activeCount = computed(() => baseFilteredItems.value.filter(c => c.status === 'Active').length)
const inactiveCount = computed(() => baseFilteredItems.value.filter(c => c.status !== 'Active').length)

// ─── Client-side search filtering ───
const filteredItems = computed(() => {
  let result = baseFilteredItems.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      props.columns.some(col =>
        String(item[col.key] ?? '').toLowerCase().includes(q),
      ),
    )
  }

  return result
})

// ─── Sorting logic ───
function compare(a: any, b: any, key: string, dir: SortDir): number {
  const valA = a[key] ?? ''
  const valB = b[key] ?? ''

  if (typeof valA === 'number' && typeof valB === 'number') {
    return dir === 'asc' ? valA - valB : valB - valA
  }

  const strA = String(valA).toLowerCase()
  const strB = String(valB).toLowerCase()
  const cmp = strA.localeCompare(strB)
  return dir === 'asc' ? cmp : -cmp
}

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
  if (!target) return
  const nearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 200
  if (nearBottom && hasMore.value) {
    loadMore()
  }
}

// ─── Formatters ───
const badgeClasses: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Inactive: 'bg-red-500/10 text-red-600 border-red-500/20',
}

function getBadgeClass(value: string): string {
  return badgeClasses[value] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
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
  await refreshClients()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} clients — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
  else {
    toast.success('Data refreshed from server')
  }
}
</script>

<template>
  <!-- Teleport toolbar into the main header -->
  <ClientOnly>
    <Teleport to="#header-actions">
      <div v-if="isFetched" class="hidden sm:flex items-center gap-1.5">
        <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs tabular-nums gap-1">
          <Icon name="i-lucide-check-circle" class="size-3" />
          {{ activeCount }} Active
        </Badge>
        <Badge variant="outline" class="bg-gray-500/10 text-gray-600 border-gray-500/20 text-xs tabular-nums gap-1">
          <Icon name="i-lucide-x-circle" class="size-3" />
          {{ inactiveCount }} Inactive
        </Badge>
      </div>
      <Separator v-if="isFetched" orientation="vertical" class="h-5 hidden sm:block" />
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search clients..." class="pl-8 h-8 w-48 text-sm" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ totalFiltered }} record{{ totalFiltered !== 1 ? 's' : '' }}
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
          Failed to load clients
        </p>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ fetchError }}
        </p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">
        Retry
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="!isFetched && !fetchError" class="flex-1 min-h-0 flex items-center justify-center">
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
        <p class="text-sm">
          Loading clients...
        </p>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="!fetchError" ref="scrollContainerRef" class="flex-1 min-h-0 overflow-auto" @scroll="handleScroll">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
          <TableRow>
            <TableHead
              v-for="col in columns"
              :key="col.key"
              class="cursor-pointer select-none hover:text-foreground transition-colors"
              @click="toggleSort(col.key)"
            >
              <div class="flex items-center gap-1">
                {{ col.label }}
                <Icon
                  v-if="sortKey === col.key && sortDir"
                  :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3 text-primary"
                />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="item in visibleItems"
            :key="item.id || item._id"
            class="group cursor-pointer hover:bg-muted/50 transition-colors"
            @click="navigateTo(`/clients/detail/${item.id || item._id}`)"
          >
            <TableCell v-for="col in columns" :key="col.key">
              <!-- Badge -->
              <Badge v-if="col.type === 'badge'" variant="outline" :class="getBadgeClass(item[col.key])">
                {{ item[col.key] || '—' }}
              </Badge>
              <!-- Date -->
              <span v-else-if="col.type === 'date'" class="text-muted-foreground text-sm">
                {{ formatDate(item[col.key]) }}
              </span>
              <!-- Address (first from array) -->
              <span v-else-if="col.key === 'address'" class="text-sm truncate max-w-[250px] block">
                {{ (item.addresses && item.addresses[0]) || '—' }}
              </span>
              <!-- Project count with badge -->
              <span v-else-if="col.key === 'projectCount'" class="text-sm font-medium tabular-nums">
                <Badge variant="secondary" class="text-xs tabular-nums">
                  {{ item.projectCount || 0 }}
                </Badge>
              </span>
              <!-- Default text -->
              <span v-else class="text-sm">{{ item[col.key] ?? '—' }}</span>
            </TableCell>
          </TableRow>
          <TableRow v-if="visibleItems.length === 0 && !isLoading">
            <TableCell :colspan="columns.length" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-inbox" class="size-8" />
                <p>No clients found</p>
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
        Showing {{ visibleItems.length }} of {{ totalFiltered }} records
      </p>
      <p v-if="sortKey && sortDir" class="text-xs text-muted-foreground flex items-center gap-1">
        <Icon :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3" />
        Sorted by {{ columns.find(c => c.key === sortKey)?.label || sortKey }}
      </p>
    </div>
  </div>
</template>
