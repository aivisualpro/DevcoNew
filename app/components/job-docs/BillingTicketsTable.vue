<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allTickets,
  isLoading,
  isFetched,
  fetchError,
  fetchAllTickets,
  refreshTickets,
  isSyncing,
  syncResult,
} = useBillingTicketsApi()

fetchAllTickets()

// ─── Base items (scoped to estimate if provided) ───
const baseItems = computed(() => {
  if (!props.estimateNumber)
    return allTickets.value
  return allTickets.value.filter(t => t.estimateNumber === props.estimateNumber)
})

// ─── Tabs ───
const tabs = [
  { key: 'all', label: 'All Tickets', icon: 'i-lucide-layers', color: 'text-blue-500' },
  { key: 'net-30', label: 'Net 30', icon: 'i-lucide-calendar-clock', color: 'text-violet-500' },
  { key: 'net-60', label: 'Net 60', icon: 'i-lucide-calendar-range', color: 'text-amber-500' },
  { key: 'other', label: 'Other Terms', icon: 'i-lucide-list-filter', color: 'text-teal-500' },
]

const activeTab = ref('all')
const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value

  if (activeTab.value === 'net-30') {
    items = items.filter(t => (t.billingTerms || '').toLowerCase().includes('net 30'))
  }
  else if (activeTab.value === 'net-60') {
    items = items.filter(t => (t.billingTerms || '').toLowerCase().includes('net 60'))
  }
  else if (activeTab.value === 'other') {
    items = items.filter((t) => {
      const bt = (t.billingTerms || '').toLowerCase()
      return bt && !bt.includes('net 30') && !bt.includes('net 60')
    })
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(t =>
      (t.estimateNumber || '').toLowerCase().includes(q)
      || (t.customerName || '').toLowerCase().includes(q)
      || (t.billingTerms || '').toLowerCase().includes(q)
      || (t.lumpSum || '').toLowerCase().includes(q)
      || (t.fileName || '').toLowerCase().includes(q)
      || (t.createdByName || t.createdBy || '').toLowerCase().includes(q)
      || (t.titleDescriptions || []).some((td: any) =>
        (td.title || '').toLowerCase().includes(q) || (td.description || '').toLowerCase().includes(q),
      ),
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
  const key = sortKey.value
  const dir = sortDir.value

  items.sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null)
      return 0
    if (av == null)
      return 1
    if (bv == null)
      return -1

    let result = 0
    if (key === 'createdAt' || key === 'date') {
      result = new Date(av).getTime() - new Date(bv).getTime()
    }
    else if (key === 'lumpSum') {
      const parseVal = (v: any) => Number.parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0
      result = parseVal(av) - parseVal(bv)
    }
    else {
      result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    }
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

// ─── Tab counts ───
function getTabCount(key: string): number {
  if (!isFetched.value)
    return 0
  if (key === 'all')
    return baseItems.value.length
  if (key === 'net-30')
    return baseItems.value.filter(t => (t.billingTerms || '').toLowerCase().includes('net 30')).length
  if (key === 'net-60')
    return baseItems.value.filter(t => (t.billingTerms || '').toLowerCase().includes('net 60')).length
  if (key === 'other')
    return baseItems.value.filter((t) => { const bt = (t.billingTerms || '').toLowerCase(); return bt && !bt.includes('net 30') && !bt.includes('net 60') }).length
  return 0
}

// ─── Stats ───
const totalAmount = computed(() => filteredItems.value.reduce((sum, t) => {
  return sum + (Number.parseFloat(String(t.lumpSum || '0').replace(/[^0-9.-]/g, '')) || 0)
}, 0))

// ─── Formatters ───
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
}

function parseLumpSum(value: string): number {
  return Number.parseFloat(String(value || '0').replace(/[^0-9.-]/g, '')) || 0
}

function getInitials(name: string): string {
  if (!name)
    return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Expand ───
const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Refresh ───
async function handleRefresh() {
  await refreshTickets()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(`Synced ${s.total} billing tickets — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${(s.duration / 1000).toFixed(1)}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
}

// ─── Scroll ───
const scrollSentinel = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!scrollSentinel.value)
    return
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
          <Input v-model="search" placeholder="Search tickets..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} ticket{{ filteredItems.length !== 1 ? 's' : '' }}
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
          <Input v-model="search" placeholder="Search tickets..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} ticket{{ filteredItems.length !== 1 ? 's' : '' }}
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
          <div class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-md font-bold">
            <Icon name="i-lucide-dollar-sign" class="size-3.5" />
            {{ formatCurrency(totalAmount) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load billing tickets
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
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('estimateNumber')">
              <div class="flex items-center gap-1">
                Estimate
                <Icon v-if="sortKey === 'estimateNumber'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Client
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              File Name
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Billing Terms
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('lumpSum')">
              <div class="flex items-center gap-1">
                Lump Sum
                <Icon v-if="sortKey === 'lumpSum'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Created By
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Items
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="10" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">
                  Loading billing tickets...
                </p>
              </div>
            </td>
          </tr>

          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="10" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-receipt" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">
                  No Billing Tickets
                </h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No tickets match your search.' : estimateNumber ? 'No billing tickets for this estimate.' : 'No billing ticket records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                  Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <template v-for="(ticket, index) in displayedItems" :key="ticket.id">
            <tr class="hover:bg-muted/30 transition-colors cursor-pointer" :class="{ 'bg-muted/20': expandedId === ticket.id }" @click="toggleExpand(ticket.id)">
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-medium">
                {{ ticket.date || '—' }}
              </td>
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="ticket.estimateNumber" variant="outline" class="text-[10px] font-bold tabular-nums">
                  {{ ticket.estimateNumber }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 max-w-[140px]">
                <p class="truncate" :title="ticket.customerName">
                  {{ ticket.customerName || '—' }}
                </p>
              </td>
              <td class="px-3 py-2.5 max-w-[160px]">
                <p class="truncate font-medium" :title="ticket.fileName">
                  {{ ticket.fileName || '—' }}
                </p>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <Badge
                  v-if="ticket.billingTerms" variant="secondary" class="text-[9px]"
                  :class="{
                    'bg-violet-500/10 text-violet-600 border-violet-500/20': ticket.billingTerms.toLowerCase().includes('net 30'),
                    'bg-amber-500/10 text-amber-600 border-amber-500/20': ticket.billingTerms.toLowerCase().includes('net 60'),
                    'bg-teal-500/10 text-teal-600 border-teal-500/20': !ticket.billingTerms.toLowerCase().includes('net 30') && !ticket.billingTerms.toLowerCase().includes('net 60'),
                  }"
                >
                  {{ ticket.billingTerms }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span class="font-bold" :class="parseLumpSum(ticket.lumpSum) > 0 ? 'text-emerald-600' : 'text-muted-foreground'">{{ ticket.lumpSum || '—' }}</span>
              </td>
              <td class="px-3 py-2.5">
                <div v-if="ticket.createdByName" class="flex items-center gap-1.5">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="ticket.createdByAvatar" :src="ticket.createdByAvatar" />
                    <AvatarFallback class="text-[7px]">
                      {{ getInitials(ticket.createdByName) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] font-medium truncate max-w-[90px]">{{ ticket.createdByName }}</span>
                </div>
                <span v-else class="text-muted-foreground">{{ ticket.createdBy || '—' }}</span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1.5">
                  <Badge v-if="ticket.titleDescriptionCount > 0" variant="outline" class="text-[9px] h-4 gap-0.5 tabular-nums">
                    <Icon name="i-lucide-file-text" class="size-2.5" /> {{ ticket.titleDescriptionCount }}
                  </Badge>
                  <Badge v-if="ticket.uploadCount > 0" variant="outline" class="text-[9px] h-4 gap-0.5 tabular-nums">
                    <Icon name="i-lucide-paperclip" class="size-2.5" /> {{ ticket.uploadCount }}
                  </Badge>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <Icon :name="expandedId === ticket.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-muted-foreground" />
              </td>
            </tr>

            <!-- Expanded -->
            <tr v-if="expandedId === ticket.id">
              <td :colspan="10" class="px-0 py-0 bg-muted/10">
                <div class="p-4 space-y-4">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Billing Info -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-receipt" class="size-3.5 text-blue-500" /> Billing Details
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Estimate</span><Badge variant="outline" class="text-[10px] font-bold tabular-nums">
                            {{ ticket.estimateNumber || '—' }}
                          </Badge>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Ticket Date</span><span class="font-medium">{{ ticket.date || '—' }}</span>
                        </div>
                        <div class="flex justify-between items-center">
                          <span class="text-muted-foreground">Billing Terms</span><Badge variant="secondary" class="text-[9px]">
                            {{ ticket.billingTerms || '—' }}
                          </Badge>
                        </div>
                        <div v-if="ticket.otherBillingTerms" class="flex justify-between items-center">
                          <span class="text-muted-foreground">Other Terms</span><span class="font-medium">{{ ticket.otherBillingTerms }}</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t mt-1">
                          <span class="font-bold text-muted-foreground uppercase tracking-wider">Lump Sum</span>
                          <span class="text-base font-bold text-emerald-600">{{ ticket.lumpSum || '—' }}</span>
                        </div>
                      </div>
                      <div v-if="ticket.customerName" class="pt-2 border-t">
                        <div class="flex items-center gap-2">
                          <Icon name="i-lucide-building" class="size-3.5 text-muted-foreground" />
                          <div>
                            <p class="text-[10px] font-semibold">
                              {{ ticket.customerName }}
                            </p>
                            <p class="text-[9px] text-muted-foreground">
                              Client
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Title/Descriptions -->
                    <div class="rounded-lg border bg-card p-3 space-y-2 lg:col-span-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-file-text" class="size-3.5 text-indigo-500" />
                        Work Descriptions ({{ ticket.titleDescriptionCount || 0 }})
                      </h4>
                      <div class="space-y-3 max-h-[300px] overflow-auto">
                        <div v-for="(td, ti) in ticket.titleDescriptions" :key="ti" class="rounded-md border bg-muted/20 p-3">
                          <h5 v-if="td.title" class="text-[10px] font-bold mb-1">
                            {{ td.title }}
                          </h5>
                          <p class="text-[10px] text-foreground/80 whitespace-pre-line leading-relaxed">
                            {{ td.description || 'No description' }}
                          </p>
                        </div>
                        <p v-if="!ticket.titleDescriptions || ticket.titleDescriptions.length === 0" class="text-xs text-muted-foreground italic">
                          No descriptions provided
                        </p>
                      </div>
                    </div>
                  </div>

                  <!-- Uploads -->
                  <div v-if="ticket.uploadCount > 0" class="rounded-lg border bg-card p-3 space-y-2">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon name="i-lucide-paperclip" class="size-3.5 text-orange-500" />
                      Attachments ({{ ticket.uploadCount }})
                    </h4>
                    <div class="flex flex-wrap gap-2">
                      <div v-for="(upload, ui) in ticket.uploads" :key="ui" class="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-muted/20 text-[10px]">
                        <Icon name="i-lucide-file" class="size-3.5 text-muted-foreground" />
                        <span class="font-medium">{{ typeof upload === 'string' ? upload : upload?.name || `File ${ui + 1}` }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="hasMore" ref="scrollSentinel">
            <td :colspan="10" class="py-4 text-center">
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
