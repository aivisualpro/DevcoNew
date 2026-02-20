<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allRecords,
  isLoading,
  isFetched,
  fetchError,
  fetchAll,
  refresh,
  isSyncing,
  syncResult,
} = useReceiptsCostsApi()

fetchAll()

// ─── Base items ───
const baseItems = computed(() => {
  if (!props.estimateNumber)
    return allRecords.value
  return allRecords.value.filter(r => r.estimateNumber === props.estimateNumber)
})

// ─── Tabs ───
const tabs = [
  { key: 'all', label: 'All', icon: 'i-lucide-layers', color: 'text-blue-500' },
  { key: 'invoice', label: 'Invoices', icon: 'i-lucide-file-text', color: 'text-violet-500' },
  { key: 'receipt', label: 'Receipts', icon: 'i-lucide-receipt', color: 'text-teal-500' },
  { key: 'approved', label: 'Approved', icon: 'i-lucide-check-circle-2', color: 'text-emerald-500' },
  { key: 'not-approved', label: 'Not Approved', icon: 'i-lucide-x-circle', color: 'text-red-500' },
]

const activeTab = ref('all')
const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value

  if (activeTab.value === 'invoice')
    items = items.filter(r => (r.type || '').toLowerCase() === 'invoice')
  else if (activeTab.value === 'receipt')
    items = items.filter(r => (r.type || '').toLowerCase() === 'receipt')
  else if (activeTab.value === 'approved')
    items = items.filter(r => (r.approvalStatus || '').toLowerCase() === 'approved')
  else if (activeTab.value === 'not-approved')
    items = items.filter(r => (r.approvalStatus || '').toLowerCase() === 'not approved')

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(r =>
      (r.estimateNumber || '').toLowerCase().includes(q)
      || (r.vendor || '').toLowerCase().includes(q)
      || (r.customerName || '').toLowerCase().includes(q)
      || (r.type || '').toLowerCase().includes(q)
      || (r.remarks || '').toLowerCase().includes(q)
      || (r.createdByName || r.createdBy || '').toLowerCase().includes(q)
      || (r.status || '').toLowerCase().includes(q),
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
    if (key === 'createdAt' || key === 'date' || key === 'dueDate')
      result = new Date(av).getTime() - new Date(bv).getTime()
    else if (typeof av === 'number' && typeof bv === 'number')
      result = av - bv
    else result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
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
  const all = baseItems.value
  if (key === 'all')
    return all.length
  if (key === 'invoice')
    return all.filter(r => (r.type || '').toLowerCase() === 'invoice').length
  if (key === 'receipt')
    return all.filter(r => (r.type || '').toLowerCase() === 'receipt').length
  if (key === 'approved')
    return all.filter(r => (r.approvalStatus || '').toLowerCase() === 'approved').length
  if (key === 'not-approved')
    return all.filter(r => (r.approvalStatus || '').toLowerCase() === 'not approved').length
  return 0
}

// ─── Stats ───
const totalAmount = computed(() => filteredItems.value.reduce((s, r) => s + (r.amount || 0), 0))

// ─── Formatters ───
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)
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
  await refresh()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(`Synced ${s.total} records — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${(s.duration / 1000).toFixed(1)}s`)
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
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMore.value && !isLoading.value)
      loadMore()
  }, { threshold: 0.1 })
  observer.observe(scrollSentinel.value)
  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Inline header for embedded -->
    <div v-if="embedded" class="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-background">
      <div class="flex items-center gap-2">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} record{{ filteredItems.length !== 1 ? 's' : '' }}
        </p>
      </div>
      <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
        {{ isSyncing ? 'Syncing...' : 'Refresh' }}
      </Button>
    </div>

    <!-- Teleport for standalone -->
    <ClientOnly v-if="!embedded">
      <Teleport to="#header-actions">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search..." class="pl-8 h-7 w-44 text-xs" />
        </div>
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ filteredItems.length.toLocaleString() }} record{{ filteredItems.length !== 1 ? 's' : '' }}
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Tabs -->
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
            <Badge variant="secondary" class="text-[9px] h-4 min-w-[1.25rem] px-1 tabular-nums" :class="{ 'bg-red-500/15 text-red-600': tab.key === 'not-approved' && getTabCount(tab.key) > 0 }">
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
          Failed to load records
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
                Date <Icon v-if="sortKey === 'date'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('estimateNumber')">
              <div class="flex items-center gap-1">
                Estimate <Icon v-if="sortKey === 'estimateNumber'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('vendor')">
              <div class="flex items-center gap-1">
                Vendor <Icon v-if="sortKey === 'vendor'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none" @click="toggleSort('amount')">
              <div class="flex items-center gap-1">
                Amount <Icon v-if="sortKey === 'amount'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Approval
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Payment Status
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Created By
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">
              Files
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="11" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" /><p class="text-sm">
                  Loading records...
                </p>
              </div>
            </td>
          </tr>

          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="11" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-wallet" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">
                  No Receipts & Costs
                </h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No records match your search.' : estimateNumber ? 'No records for this estimate.' : 'No receipt/cost records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" /> Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <template v-for="(rc, index) in displayedItems" :key="rc.id">
            <tr class="hover:bg-muted/30 transition-colors cursor-pointer" :class="{ 'bg-muted/20': expandedId === rc.id }" @click="toggleExpand(rc.id)">
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-medium">
                {{ rc.date || '—' }}
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <Badge variant="secondary" class="text-[9px]" :class="{ 'bg-violet-500/10 text-violet-600 border-violet-500/20': (rc.type || '').toLowerCase() === 'invoice', 'bg-teal-500/10 text-teal-600 border-teal-500/20': (rc.type || '').toLowerCase() === 'receipt' }">
                  {{ rc.type || '—' }}
                </Badge>
              </td>
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="rc.estimateNumber" variant="outline" class="text-[10px] font-bold tabular-nums">
                  {{ rc.estimateNumber }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 max-w-[150px]">
                <p class="truncate font-medium" :title="rc.vendor">
                  {{ rc.vendor || '—' }}
                </p>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span class="font-bold" :class="rc.amount > 0 ? 'text-emerald-600' : 'text-muted-foreground'">{{ rc.amount > 0 ? formatCurrency(rc.amount) : '—' }}</span>
              </td>
              <td class="px-3 py-2.5 text-center">
                <Badge class="text-[9px] h-4 px-1.5" :class="(rc.approvalStatus || '').toLowerCase() === 'approved' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15'">
                  {{ rc.approvalStatus || '—' }}
                </Badge>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="rc.status" variant="secondary" class="text-[9px]" :class="{ 'bg-emerald-500/10 text-emerald-600': rc.status.toLowerCase().includes('paid') }">
                  {{ rc.status }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5">
                <div v-if="rc.createdByName" class="flex items-center gap-1.5">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="rc.createdByAvatar" :src="rc.createdByAvatar" /><AvatarFallback class="text-[7px]">
                      {{ getInitials(rc.createdByName) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] font-medium truncate max-w-[90px]">{{ rc.createdByName }}</span>
                </div>
                <span v-else class="text-muted-foreground">{{ rc.createdBy || '—' }}</span>
              </td>
              <td class="px-3 py-2.5">
                <Badge v-if="rc.uploadCount > 0" variant="outline" class="text-[9px] h-4 gap-0.5 tabular-nums">
                  <Icon name="i-lucide-paperclip" class="size-2.5" /> {{ rc.uploadCount }}
                </Badge>
              </td>
              <td class="px-3 py-2.5">
                <Icon :name="expandedId === rc.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-muted-foreground" />
              </td>
            </tr>

            <!-- Expanded -->
            <tr v-if="expandedId === rc.id">
              <td :colspan="11" class="px-0 py-0 bg-muted/10">
                <div class="p-4 space-y-4">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Details -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-info" class="size-3.5 text-blue-500" /> Details
                      </h4>
                      <div class="grid gap-2 text-[11px]">
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Estimate</span><Badge variant="outline" class="text-[10px] font-bold tabular-nums">
                            {{ rc.estimateNumber || '—' }}
                          </Badge>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Type</span><span class="font-medium">{{ rc.type }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Vendor</span><span class="font-medium">{{ rc.vendor || '—' }}</span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-muted-foreground">Date</span><span class="font-medium">{{ rc.date || '—' }}</span>
                        </div>
                        <div v-if="rc.dueDate" class="flex justify-between">
                          <span class="text-muted-foreground">Due Date</span><span class="font-medium">{{ rc.dueDate }}</span>
                        </div>
                        <div class="flex justify-between items-center pt-2 border-t mt-1">
                          <span class="font-bold text-muted-foreground uppercase tracking-wider">Amount</span><span class="text-base font-bold text-emerald-600">{{ formatCurrency(rc.amount) }}</span>
                        </div>
                      </div>
                      <div v-if="rc.customerName" class="pt-2 border-t">
                        <div class="flex items-center gap-2">
                          <Icon name="i-lucide-building" class="size-3.5 text-muted-foreground" /><div>
                            <p class="text-[10px] font-semibold">
                              {{ rc.customerName }}
                            </p><p class="text-[9px] text-muted-foreground">
                              Client
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Status & Payment -->
                    <div class="rounded-lg border bg-card p-3 space-y-3">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500" /> Payment & Approval
                      </h4>
                      <div class="space-y-3">
                        <div class="flex items-center gap-3 p-2 rounded-md" :class="(rc.approvalStatus || '').toLowerCase() === 'approved' ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-red-500/5 border border-red-500/20'">
                          <Icon :name="(rc.approvalStatus || '').toLowerCase() === 'approved' ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'" class="size-4" :class="(rc.approvalStatus || '').toLowerCase() === 'approved' ? 'text-emerald-500' : 'text-red-500'" />
                          <div>
                            <p class="text-[10px] font-semibold">
                              {{ rc.approvalStatus || 'Pending' }}
                            </p><p class="text-[9px] text-muted-foreground">
                              Approval Status
                            </p>
                          </div>
                        </div>
                        <div class="flex items-center gap-3 p-2 rounded-md bg-muted/30 border">
                          <Icon name="i-lucide-credit-card" class="size-4 text-muted-foreground" />
                          <div>
                            <p class="text-[10px] font-semibold">
                              {{ rc.status || 'Unknown' }}
                            </p><p class="text-[9px] text-muted-foreground">
                              Payment Status
                            </p>
                          </div>
                        </div>
                        <div v-if="rc.paidByName || rc.paidBy" class="text-[10px]">
                          <span class="text-muted-foreground">Paid By:</span> <span class="font-medium">{{ rc.paidByName || rc.paidBy }}</span>
                        </div>
                        <div v-if="rc.paymentDate" class="text-[10px]">
                          <span class="text-muted-foreground">Payment Date:</span> <span class="font-medium">{{ rc.paymentDate }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Tags & Uploads -->
                    <div class="space-y-4">
                      <div v-if="rc.tagCount > 0" class="rounded-lg border bg-card p-3 space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Icon name="i-lucide-tag" class="size-3.5 text-orange-500" /> Tagged ({{ rc.tagCount }})
                        </h4>
                        <div class="flex flex-wrap gap-1.5">
                          <div v-for="(tag, ti) in rc.tags" :key="ti" class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/50 border text-[10px]">
                            <Avatar class="size-4 border">
                              <AvatarImage v-if="tag.avatar" :src="tag.avatar" /><AvatarFallback class="text-[6px]">
                                {{ getInitials(tag.name) }}
                              </AvatarFallback>
                            </Avatar>
                            <span class="font-medium">{{ tag.name }}</span>
                          </div>
                        </div>
                      </div>
                      <div v-if="rc.uploadCount > 0" class="rounded-lg border bg-card p-3 space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Icon name="i-lucide-paperclip" class="size-3.5 text-indigo-500" /> Attachments ({{ rc.uploadCount }})
                        </h4>
                        <div class="space-y-1.5">
                          <a v-for="(file, fi) in rc.upload" :key="fi" :href="file?.url || file" target="_blank" class="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-muted/20 text-[10px] hover:bg-muted/50 transition-colors" @click.stop>
                            <Icon :name="(file?.type || '').includes('pdf') ? 'i-lucide-file-text' : 'i-lucide-file'" class="size-3.5 text-muted-foreground shrink-0" />
                            <span class="font-medium truncate">{{ file?.name || `File ${fi + 1}` }}</span>
                            <Icon name="i-lucide-external-link" class="size-3 text-muted-foreground ml-auto shrink-0" />
                          </a>
                        </div>
                      </div>
                      <div v-if="rc.remarks" class="rounded-lg border bg-card p-3 space-y-2">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Icon name="i-lucide-message-square" class="size-3.5 text-gray-500" /> Remarks
                        </h4>
                        <p class="text-[10px] text-foreground/80 whitespace-pre-line">
                          {{ rc.remarks }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="hasMore" ref="scrollSentinel">
            <td :colspan="11" class="py-4 text-center">
              <div class="flex items-center justify-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-4 animate-spin" /><span class="text-xs">Loading more...</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
