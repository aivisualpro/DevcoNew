<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allDjt,
  isLoading,
  isFetched,
  fetchError,
  fetchAllDjt,
  refreshDjt,
  isSyncing,
  syncResult,
} = useDjtApi()

// Eagerly fetch
fetchAllDjt()

// ─── Base items (scoped to estimate if provided) ───
const baseItems = computed(() => {
  if (!props.estimateNumber) return allDjt.value
  return allDjt.value.filter(d => d.estimate === props.estimateNumber)
})

// ─── Tabs ───
const tabs = [
  { key: 'all', label: 'All DJT', icon: 'i-lucide-layers', color: 'text-blue-500' },
  { key: 'missing-customer-sign', label: 'Missing Customer Sign', icon: 'i-lucide-pen-off', color: 'text-amber-500' },
  { key: 'missing-assignee-sign', label: 'Missing Assignee Sign', icon: 'i-lucide-user-x', color: 'text-red-500' },
]

const activeTab = ref('all')

// ─── Filtering ───
const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value

  if (activeTab.value === 'missing-customer-sign') {
    items = items.filter(d => !d.hasCustomerSignature)
  }
  else if (activeTab.value === 'missing-assignee-sign') {
    items = items.filter(d => !d.hasAllAssigneeSigns)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(d =>
      (d.scheduleTitle || '').toLowerCase().includes(q)
      || (d.customerName || '').toLowerCase().includes(q)
      || (d.estimate || '').toLowerCase().includes(q)
      || (d.service || '').toLowerCase().includes(q)
      || (d.dailyJobDescription || '').toLowerCase().includes(q)
      || (d.createdByName || d.createdBy || '').toLowerCase().includes(q)
      || (d.customerPrintName || '').toLowerCase().includes(q),
    )
  }

  return items
})

// ─── Sorting ───
type SortDir = 'desc' | 'asc' | null
const sortKey = ref('createdAt')
const sortDir = ref<SortDir>('desc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : sortDir.value === 'asc' ? null : 'desc'
    if (sortDir.value === null) sortKey.value = ''
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

const sortedItems = computed(() => {
  if (!sortKey.value || !sortDir.value) return filteredItems.value
  const items = [...filteredItems.value]
  const key = sortKey.value
  const dir = sortDir.value

  items.sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1

    let result = 0
    if (key === 'createdAt' || key === 'fromDate') {
      result = new Date(av).getTime() - new Date(bv).getTime()
    }
    else if (typeof av === 'number' && typeof bv === 'number') {
      result = av - bv
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
  if (!isFetched.value) return 0
  if (key === 'all') return baseItems.value.length
  if (key === 'missing-customer-sign') return baseItems.value.filter(d => !d.hasCustomerSignature).length
  if (key === 'missing-assignee-sign') return baseItems.value.filter(d => !d.hasAllAssigneeSigns).length
  return 0
}

// ─── Stats ───
const totalCost = computed(() => filteredItems.value.reduce((sum, d) => sum + (d.djtCost || 0), 0))

// ─── Formatters ───
function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0] || ''
      const [y, m, d] = datePart.split('-')
      return `${m}/${d}/${y}`
    }
    return dateStr
  }
  catch { return dateStr }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '—'
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

// ─── Expandable rows ───
const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Refresh ───
async function handleRefresh() {
  await refreshDjt()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(`Synced ${s.total} DJT records — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${(s.duration / 1000).toFixed(1)}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
}

// ─── Scroll observer ───
const scrollSentinel = ref<HTMLElement | null>(null)
onMounted(() => {
  if (!scrollSentinel.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoading.value) loadMore()
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
          <Input v-model="search" placeholder="Search DJT..." class="pl-8 h-7 w-44 text-xs" />
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

    <!-- Teleport actions to header (standalone mode) -->
    <ClientOnly v-if="!embedded">
      <Teleport to="#header-actions">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search DJT..." class="pl-8 h-7 w-44 text-xs" />
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
            :class="[
              activeTab === tab.key
                ? 'text-foreground bg-background border border-b-0 border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            ]"
            @click="activeTab = tab.key"
          >
            <Icon :name="tab.icon" class="size-3.5" :class="activeTab === tab.key ? tab.color : ''" />
            <span>{{ tab.label }}</span>
            <Badge
              variant="secondary"
              class="text-[9px] h-4 min-w-[1.25rem] px-1 tabular-nums"
              :class="{
                'bg-amber-500/15 text-amber-600': tab.key === 'missing-customer-sign' && getTabCount(tab.key) > 0,
                'bg-red-500/15 text-red-600': tab.key === 'missing-assignee-sign' && getTabCount(tab.key) > 0,
              }"
            >
              {{ getTabCount(tab.key).toLocaleString() }}
            </Badge>
          </button>
        </div>
        <!-- Total cost mini stat -->
        <div v-if="isFetched" class="hidden md:flex items-center gap-3 text-[11px]">
          <div class="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-md font-bold">
            <Icon name="i-lucide-dollar-sign" class="size-3.5" />
            {{ formatCurrency(totalCost) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">Failed to load DJT records</p>
        <p class="text-xs text-muted-foreground mt-0.5">{{ fetchError }}</p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">Retry</Button>
    </div>

    <!-- Main content -->
    <div class="flex-1 min-h-0 overflow-auto">
      <table class="w-full text-[11px]">
        <thead class="sticky top-0 z-10 bg-background border-b">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('createdAt')"
            >
              <div class="flex items-center gap-1">
                Date
                <Icon v-if="sortKey === 'createdAt'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('scheduleTitle')"
            >
              <div class="flex items-center gap-1">
                Schedule / Job
                <Icon v-if="sortKey === 'scheduleTitle'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground">Estimate</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Client</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('djtCost')"
            >
              <div class="flex items-center gap-1">
                Cost
                <Icon v-if="sortKey === 'djtCost'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Created By</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('signatureCount')"
            >
              <div class="flex items-center gap-1">
                Crew Signs
                <Icon v-if="sortKey === 'signatureCount'" :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3 text-primary" />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Customer Sign</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Extras</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <!-- Loading -->
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="12" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">Loading DJT records...</p>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="12" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-clipboard-x" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">No Daily Job Tickets</h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No tickets match your search.' : estimateNumber ? 'No DJT records for this estimate.' : 'No DJT records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                  Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <!-- Data rows -->
          <template v-for="(djt, index) in displayedItems" :key="djt.id">
            <tr
              class="hover:bg-muted/30 transition-colors cursor-pointer"
              :class="{ 'bg-muted/20': expandedId === djt.id }"
              @click="toggleExpand(djt.id)"
            >
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">{{ index + 1 }}</td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-medium">{{ formatDate(djt.createdAt || djt.fromDate) }}</td>
              <td class="px-3 py-2.5 max-w-[200px]">
                <p class="font-medium truncate" :title="djt.scheduleTitle">{{ djt.scheduleTitle || '—' }}</p>
                <p v-if="djt.service" class="text-[9px] text-muted-foreground">{{ djt.service }}</p>
              </td>
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="djt.estimate" variant="outline" class="text-[10px] font-bold tabular-nums">{{ djt.estimate }}</Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>
              <td class="px-3 py-2.5 max-w-[140px]">
                <p class="truncate" :title="djt.customerName">{{ djt.customerName || '—' }}</p>
              </td>
              <td class="px-3 py-2.5 max-w-[220px]">
                <p class="text-muted-foreground truncate" :title="djt.dailyJobDescription">{{ truncateText(djt.dailyJobDescription, 60) }}</p>
              </td>
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums">
                <span class="font-bold" :class="djt.djtCost > 0 ? 'text-emerald-600' : 'text-muted-foreground'">
                  {{ djt.djtCost > 0 ? formatCurrency(djt.djtCost) : '—' }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div v-if="djt.createdByName" class="flex items-center gap-1.5">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="djt.createdByAvatar" :src="djt.createdByAvatar" />
                    <AvatarFallback class="text-[7px]">{{ getInitials(djt.createdByName) }}</AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] font-medium truncate max-w-[90px]">{{ djt.createdByName }}</span>
                </div>
                <span v-else class="text-muted-foreground">{{ djt.createdBy || '—' }}</span>
              </td>
              <td class="px-3 py-2.5 tabular-nums">
                <div class="flex items-center gap-1">
                  <span class="font-semibold" :class="djt.signatureCount > 0 ? 'text-emerald-600' : 'text-muted-foreground'">{{ djt.signatureCount || 0 }}</span>
                  <span class="text-muted-foreground">/</span>
                  <span class="text-muted-foreground">{{ djt.assigneeCount || 0 }}</span>
                </div>
              </td>
              <td class="px-3 py-2.5 text-center">
                <Badge
                  :variant="djt.hasCustomerSignature ? 'default' : 'destructive'"
                  class="text-[9px] h-4 px-1.5"
                  :class="djt.hasCustomerSignature
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15'"
                >
                  {{ djt.hasCustomerSignature ? 'Signed' : 'Missing' }}
                </Badge>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1.5">
                  <Badge v-if="djt.imageCount > 0" variant="outline" class="text-[9px] h-4 gap-0.5 tabular-nums">
                    <Icon name="i-lucide-image" class="size-2.5" />
                    {{ djt.imageCount }}
                  </Badge>
                  <Badge v-if="djt.equipmentCount > 0" variant="outline" class="text-[9px] h-4 gap-0.5 tabular-nums">
                    <Icon name="i-lucide-wrench" class="size-2.5" />
                    {{ djt.equipmentCount }}
                  </Badge>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <Icon :name="expandedId === djt.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="size-3.5 text-muted-foreground" />
              </td>
            </tr>

            <!-- Expanded Details -->
            <tr v-if="expandedId === djt.id">
              <td :colspan="12" class="px-0 py-0 bg-muted/10">
                <div class="p-4 space-y-4">
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Job Description -->
                    <div class="rounded-lg border bg-card p-3 space-y-2 lg:col-span-1">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-file-text" class="size-3.5 text-blue-500" />
                        Daily Job Description
                      </h4>
                      <p class="text-xs text-foreground whitespace-pre-line leading-relaxed">
                        {{ djt.dailyJobDescription || 'No description provided.' }}
                      </p>
                      <div v-if="djt.djtCost > 0" class="pt-2 border-t">
                        <div class="flex items-center justify-between">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">DJT Cost</span>
                          <span class="text-sm font-bold text-emerald-600">{{ formatCurrency(djt.djtCost) }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Customer Signature -->
                    <div class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-pen-tool" class="size-3.5 text-purple-500" />
                        Customer Signature
                      </h4>
                      <div v-if="djt.hasCustomerSignature" class="space-y-2">
                        <div class="flex items-center gap-2 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
                          <Icon name="i-lucide-check-circle-2" class="size-4 text-emerald-500 shrink-0" />
                          <div>
                            <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{{ djt.customerPrintName || 'Customer' }}</p>
                            <p v-if="djt.clientEmail" class="text-[9px] text-muted-foreground">{{ djt.clientEmail }}</p>
                          </div>
                        </div>
                        <div v-if="djt.customerSignature" class="border rounded-md overflow-hidden bg-white">
                          <img :src="djt.customerSignature" :alt="`${djt.customerPrintName || 'Customer'} signature`" class="w-full h-16 object-contain" loading="lazy" />
                        </div>
                      </div>
                      <div v-else class="flex items-center gap-2 p-3 rounded-md bg-red-500/5 border border-red-500/20">
                        <Icon name="i-lucide-x-circle" class="size-4 text-red-500 shrink-0" />
                        <p class="text-xs text-red-600 dark:text-red-400 font-medium">Customer signature missing</p>
                      </div>
                    </div>

                    <!-- Crew Signatures -->
                    <div class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-users" class="size-3.5 text-blue-500" />
                        Crew Signatures ({{ djt.signatureCount || 0 }}/{{ djt.assigneeCount || 0 }})
                      </h4>
                      <div class="space-y-1.5">
                        <div
                          v-for="(sig, si) in (djt.signatures || []).slice(0, 10)"
                          :key="si"
                          class="flex items-center gap-2 p-1.5 rounded-md bg-muted/30"
                        >
                          <Avatar class="size-6 border">
                            <AvatarImage v-if="sig.employeeAvatar" :src="sig.employeeAvatar" />
                            <AvatarFallback class="text-[8px]">{{ getInitials(sig.employeeName || sig.employee || '') }}</AvatarFallback>
                          </Avatar>
                          <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-semibold truncate">{{ sig.employeeName || sig.employee || 'Unknown' }}</p>
                            <p v-if="sig.location && sig.location !== '0.000000, 0.000000'" class="text-[9px] text-muted-foreground truncate">
                              <Icon name="i-lucide-map-pin" class="inline size-2.5" /> {{ sig.location }}
                            </p>
                          </div>
                          <Icon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500 shrink-0" />
                        </div>

                        <template v-if="djt.unsignedAssigneeCount > 0 && djt.assigneeDetails">
                          <div class="mt-1 pt-1 border-t border-dashed">
                            <p class="text-[9px] font-bold text-red-500 mb-1 uppercase tracking-wider">Missing Signatures</p>
                            <div
                              v-for="(a, ai) in djt.assigneeDetails.filter((ad: any) =>
                                !(djt.signatures || []).some((s: any) => (s.employee || '').toLowerCase() === (ad.email || '').toLowerCase())
                              ).slice(0, 5)"
                              :key="ai"
                              class="flex items-center gap-2 p-1 text-[10px] text-red-500/80"
                            >
                              <Avatar class="size-5 border border-red-500/20">
                                <AvatarFallback class="text-[7px] bg-red-500/10">{{ getInitials(a.name) }}</AvatarFallback>
                              </Avatar>
                              <span class="truncate">{{ a.name }}</span>
                              <Icon name="i-lucide-x-circle" class="size-3 shrink-0" />
                            </div>
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>

                  <!-- Images & Equipment Row -->
                  <div v-if="djt.imageCount > 0 || djt.equipmentCount > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div v-if="djt.imageCount > 0" class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-image" class="size-3.5 text-indigo-500" />
                        Photos ({{ djt.imageCount }})
                      </h4>
                      <div class="flex gap-2 overflow-x-auto">
                        <div v-for="(img, ii) in djt.djtimages" :key="ii" class="shrink-0 size-20 rounded-md overflow-hidden border bg-muted">
                          <img :src="img" alt="DJT photo" class="w-full h-full object-cover" loading="lazy" />
                        </div>
                      </div>
                    </div>
                    <div v-if="djt.equipmentCount > 0" class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-wrench" class="size-3.5 text-orange-500" />
                        Equipment Used ({{ djt.equipmentCount }})
                      </h4>
                      <div class="divide-y divide-border/50">
                        <div v-for="(eq, ei) in djt.equipmentUsed" :key="ei" class="flex items-center justify-between py-1 text-[10px]">
                          <div class="flex items-center gap-2">
                            <Badge variant="outline" class="text-[9px] h-4 capitalize">{{ eq.type }}</Badge>
                            <span class="font-medium">{{ eq.equipment }}</span>
                          </div>
                          <div class="flex items-center gap-3 text-muted-foreground">
                            <span>Qty: <strong class="text-foreground">{{ eq.qty }}</strong></span>
                            <span>{{ formatCurrency(eq.cost || 0) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <!-- Infinite scroll sentinel -->
          <tr v-if="hasMore" ref="scrollSentinel">
            <td :colspan="12" class="py-4 text-center">
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
