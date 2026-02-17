<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimateNumber?: string
  embedded?: boolean
}>()

// ─── Data ───
const {
  allJha,
  isLoading,
  isFetched,
  fetchError,
  fetchAllJha,
  refreshJha,
  isSyncing,
  syncResult,
} = useJhaApi()

// Eagerly fetch
fetchAllJha()

// ─── Base items (scoped to estimate if provided) ───
const baseItems = computed(() => {
  if (!props.estimateNumber) return allJha.value
  return allJha.value.filter(j => j.estimate === props.estimateNumber)
})

// ─── Tabs ───
const tabs = [
  { key: 'all', label: 'All JHA', icon: 'i-lucide-layers', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { key: 'missing-client', label: 'Missing Client Sign', icon: 'i-lucide-pen-off', color: 'text-amber-500', bgColor: 'bg-amber-500' },
  { key: 'missing-assignee', label: 'Missing Assignee Sign', icon: 'i-lucide-user-x', color: 'text-red-500', bgColor: 'bg-red-500' },
]

const activeTab = ref('all')

// ─── Filtering ───
const search = ref('')

const filteredItems = computed(() => {
  let items = baseItems.value

  // Tab filter
  if (activeTab.value === 'missing-client') {
    items = items.filter(j => !j.hasClientSign)
  }
  else if (activeTab.value === 'missing-assignee') {
    items = items.filter(j => !j.hasAllAssigneeSigns)
  }

  // Search filter
  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(j =>
      (j.scheduleTitle || '').toLowerCase().includes(q)
      || (j.customerName || '').toLowerCase().includes(q)
      || (j.estimate || '').toLowerCase().includes(q)
      || (j.service || '').toLowerCase().includes(q)
      || (j.createdByName || j.createdBy || '').toLowerCase().includes(q)
      || (j.nameOfHospital || '').toLowerCase().includes(q),
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
    if (key === 'date' || key === 'createdAt') {
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

// ─── Pagination (infinite scroll) ───
const PAGE_SIZE = 30
const displayCount = ref(PAGE_SIZE)

const displayedItems = computed(() => sortedItems.value.slice(0, displayCount.value))
const hasMore = computed(() => displayCount.value < sortedItems.value.length)

function loadMore() {
  displayCount.value += PAGE_SIZE
}

// Reset display count when tab or search changes
watch([activeTab, search], () => {
  displayCount.value = PAGE_SIZE
})

// ─── Tab counts ───
function getTabCount(key: string): number {
  if (!isFetched.value) return 0
  if (key === 'all') return baseItems.value.length
  if (key === 'missing-client') return baseItems.value.filter(j => !j.hasClientSign).length
  if (key === 'missing-assignee') return baseItems.value.filter(j => !j.hasAllAssigneeSigns).length
  return 0
}

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

function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  try {
    const parts = timeStr.split(':')
    const h = parseInt(parts[0] || '0', 10)
    const m = parts[1] || '00'
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m} ${ampm}`
  }
  catch { return timeStr }
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Hazard summary ───
const hazardFields = [
  { key: 'excavatingTrenching', label: 'Excavating/Trenching', icon: 'i-lucide-pickaxe' },
  { key: 'trafficControl', label: 'Traffic Control', icon: 'i-lucide-traffic-cone' },
  { key: 'trippingHazards', label: 'Tripping Hazards', icon: 'i-lucide-footprints' },
  { key: 'heavyLifting', label: 'Heavy Lifting', icon: 'i-lucide-dumbbell' },
  { key: 'highNoise', label: 'High Noise', icon: 'i-lucide-volume-2' },
  { key: 'sharpObjects', label: 'Sharp Objects', icon: 'i-lucide-swords' },
  { key: 'confinedSpace', label: 'Confined Space', icon: 'i-lucide-box' },
  { key: 'heatAwareness', label: 'Heat Awareness', icon: 'i-lucide-thermometer-sun' },
  { key: 'roadHazards', label: 'Road Hazards', icon: 'i-lucide-alert-triangle' },
  { key: 'overheadLifting', label: 'Overhead Lifting', icon: 'i-lucide-arrow-up' },
  { key: 'materialHandling', label: 'Material Handling', icon: 'i-lucide-package' },
  { key: 'operatingHdd', label: 'Operating HDD', icon: 'i-lucide-hard-drive' },
  { key: 'operatingMiniEx', label: 'Operating Mini-Ex', icon: 'i-lucide-tractor' },
  { key: 'operatingBackhoe', label: 'Operating Backhoe', icon: 'i-lucide-tractor' },
  { key: 'operatingAVacuumTruck', label: 'Vacuum Truck', icon: 'i-lucide-truck' },
  { key: 'workingInATrench', label: 'Working in Trench', icon: 'i-lucide-layers' },
  { key: 'ladderWork', label: 'Ladder Work', icon: 'i-lucide-move-vertical' },
  { key: 'pinchPoints', label: 'Pinch Points', icon: 'i-lucide-hand' },
  { key: 'roadWork', label: 'Road Work', icon: 'i-lucide-hard-hat' },
  { key: 'acConcWork', label: 'AC/Conc Work', icon: 'i-lucide-hammer' },
]

function getActiveHazards(jha: any): typeof hazardFields {
  return hazardFields.filter(h => jha[h.key] === true || jha[h.key] === 'TRUE' || jha[h.key] === 'true')
}

// ─── Expandable rows ───
const expandedId = ref<string | null>(null)
function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

// ─── Refresh ───
async function handleRefresh() {
  await refreshJha()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} JHA records — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
}

// ─── Scroll observer (infinite scroll) ───
const scrollSentinel = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!scrollSentinel.value) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value && !isLoading.value) {
        loadMore()
      }
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
          <Input v-model="search" placeholder="Search JHA..." class="pl-8 h-7 w-44 text-xs" />
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

    <!-- Teleport actions to header (standalone mode) -->
    <ClientOnly v-if="!embedded">
      <Teleport to="#header-actions">
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input v-model="search" placeholder="Search JHA..." class="pl-8 h-7 w-44 text-xs" />
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

    <!-- Tab Bar -->
    <div class="shrink-0 border-b bg-muted/30">
      <div class="flex items-center gap-0.5 px-4 overflow-x-auto">
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
          <Icon
            :name="tab.icon"
            class="size-3.5"
            :class="activeTab === tab.key ? tab.color : ''"
          />
          <span>{{ tab.label }}</span>
          <Badge
            variant="secondary"
            class="text-[9px] h-4 min-w-[1.25rem] px-1 tabular-nums"
            :class="{
              'bg-amber-500/15 text-amber-600': tab.key === 'missing-client' && getTabCount(tab.key) > 0,
              'bg-red-500/15 text-red-600': tab.key === 'missing-assignee' && getTabCount(tab.key) > 0,
            }"
          >
            {{ getTabCount(tab.key).toLocaleString() }}
          </Badge>
        </button>
      </div>
    </div>

    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">Failed to load JHA records</p>
        <p class="text-xs text-muted-foreground mt-0.5">{{ fetchError }}</p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">Retry</Button>
    </div>

    <!-- Main content -->
    <div class="flex-1 min-h-0 overflow-auto">
      <!-- Table -->
      <table class="w-full text-[11px]">
        <thead class="sticky top-0 z-10 bg-background border-b">
          <tr>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('date')"
            >
              <div class="flex items-center gap-1">
                Date
                <Icon
                  v-if="sortKey === 'date'"
                  :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3 text-primary"
                />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Time</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('scheduleTitle')"
            >
              <div class="flex items-center gap-1">
                Schedule
                <Icon
                  v-if="sortKey === 'scheduleTitle'"
                  :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3 text-primary"
                />
              </div>
            </th>
            <th v-if="!estimateNumber" class="px-3 py-2 text-left font-medium text-muted-foreground">Estimate</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Client</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Service</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Created By</th>
            <th
              class="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
              @click="toggleSort('signatureCount')"
            >
              <div class="flex items-center gap-1">
                Signatures
                <Icon
                  v-if="sortKey === 'signatureCount'"
                  :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
                  class="size-3 text-primary"
                />
              </div>
            </th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Client Sign</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground">Hazards</th>
            <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8" />
          </tr>
        </thead>
        <tbody class="divide-y divide-border/50">
          <!-- Loading -->
          <tr v-if="!isFetched && !fetchError">
            <td :colspan="12" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                <p class="text-sm">Loading JHA records...</p>
              </div>
            </td>
          </tr>

          <!-- Empty State -->
          <tr v-else-if="isFetched && sortedItems.length === 0">
            <td :colspan="12" class="py-16">
              <div class="flex flex-col items-center text-center">
                <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Icon name="i-lucide-shield-off" class="size-8 text-muted-foreground/50" />
                </div>
                <h3 class="text-lg font-bold">No JHA Records</h3>
                <p class="text-sm text-muted-foreground max-w-xs mt-1">
                  {{ search ? 'No records match your search.' : estimateNumber ? 'No JHA records for this estimate.' : 'No Job Hazard Analysis records found.' }}
                </p>
                <Button v-if="!search && !estimateNumber" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
                  <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
                  Sync from MongoDB
                </Button>
              </div>
            </td>
          </tr>

          <!-- Data rows -->
          <template v-for="(jha, index) in displayedItems" :key="jha.id">
            <tr
              class="hover:bg-muted/30 transition-colors cursor-pointer"
              :class="{ 'bg-muted/20': expandedId === jha.id }"
              @click="toggleExpand(jha.id)"
            >
              <!-- # -->
              <td class="px-3 py-2.5 text-muted-foreground tabular-nums">{{ index + 1 }}</td>

              <!-- Date -->
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums font-medium">
                {{ formatDate(jha.date) }}
              </td>

              <!-- Time -->
              <td class="px-3 py-2.5 whitespace-nowrap tabular-nums text-muted-foreground">
                {{ formatTime(jha.jhaTime) }}
              </td>

              <!-- Schedule Title -->
              <td class="px-3 py-2.5 max-w-[200px]">
                <p class="font-medium truncate" :title="jha.scheduleTitle">{{ jha.scheduleTitle || '—' }}</p>
              </td>

              <!-- Estimate (hidden in scoped mode) -->
              <td v-if="!estimateNumber" class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="jha.estimate" variant="outline" class="text-[10px] font-bold tabular-nums">
                  {{ jha.estimate }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>

              <!-- Client -->
              <td class="px-3 py-2.5 max-w-[150px]">
                <p class="truncate" :title="jha.customerName">{{ jha.customerName || '—' }}</p>
              </td>

              <!-- Service -->
              <td class="px-3 py-2.5 whitespace-nowrap">
                <Badge v-if="jha.service" variant="secondary" class="text-[10px]">
                  {{ jha.service }}
                </Badge>
                <span v-else class="text-muted-foreground">—</span>
              </td>

              <!-- Created By -->
              <td class="px-3 py-2.5">
                <div v-if="jha.createdByName" class="flex items-center gap-1.5">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="jha.createdByAvatar" :src="jha.createdByAvatar" />
                    <AvatarFallback class="text-[7px]">{{ getInitials(jha.createdByName) }}</AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] font-medium truncate max-w-[100px]">{{ jha.createdByName }}</span>
                </div>
                <span v-else class="text-muted-foreground">{{ jha.createdBy || '—' }}</span>
              </td>

              <!-- Signatures -->
              <td class="px-3 py-2.5 tabular-nums">
                <div class="flex items-center gap-1">
                  <span class="font-semibold" :class="jha.signatureCount > 0 ? 'text-emerald-600' : 'text-muted-foreground'">
                    {{ jha.signatureCount || 0 }}
                  </span>
                  <span class="text-muted-foreground">/</span>
                  <span class="text-muted-foreground">{{ jha.assigneeCount || 0 }}</span>
                </div>
              </td>

              <!-- Client Sign -->
              <td class="px-3 py-2.5 text-center">
                <Badge
                  :variant="jha.hasClientSign ? 'default' : 'destructive'"
                  class="text-[9px] h-4 px-1.5"
                  :class="jha.hasClientSign
                    ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/15'"
                >
                  {{ jha.hasClientSign ? 'Signed' : 'Missing' }}
                </Badge>
              </td>

              <!-- Hazards count -->
              <td class="px-3 py-2.5 tabular-nums">
                <Badge variant="outline" class="text-[9px] tabular-nums">
                  {{ getActiveHazards(jha).length }}
                </Badge>
              </td>

              <!-- Expand arrow -->
              <td class="px-3 py-2.5">
                <Icon
                  :name="expandedId === jha.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                  class="size-3.5 text-muted-foreground"
                />
              </td>
            </tr>

            <!-- Expanded Details -->
            <tr v-if="expandedId === jha.id">
              <td :colspan="12" class="px-0 py-0 bg-muted/10">
                <div class="p-4 space-y-4">
                  <!-- Three-column layout -->
                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Hazards Identified -->
                    <div class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-alert-triangle" class="size-3.5 text-amber-500" />
                        Hazards Identified
                      </h4>
                      <div class="flex flex-wrap gap-1.5">
                        <Badge
                          v-for="h in getActiveHazards(jha)"
                          :key="h.key"
                          variant="outline"
                          class="text-[10px] gap-1 bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        >
                          {{ h.label }}
                        </Badge>
                        <p v-if="getActiveHazards(jha).length === 0" class="text-xs text-muted-foreground italic">No hazards identified</p>
                      </div>
                    </div>

                    <!-- Safety Checks -->
                    <div class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-shield-check" class="size-3.5 text-emerald-500" />
                        Safety Checks
                      </h4>
                      <div class="grid grid-cols-1 gap-1 text-[11px]">
                        <div class="flex items-center gap-2">
                          <Icon :name="jha.emergencyContactNumberWillBe911 ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5" :class="jha.emergencyContactNumberWillBe911 ? 'text-emerald-500' : 'text-muted-foreground'" />
                          <span>Emergency 911 Contact</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <Icon :name="jha.closestHospitalDiscussed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5" :class="jha.closestHospitalDiscussed ? 'text-emerald-500' : 'text-muted-foreground'" />
                          <span>Hospital Discussed</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <Icon :name="jha.stagingAreaDiscussed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5" :class="jha.stagingAreaDiscussed ? 'text-emerald-500' : 'text-muted-foreground'" />
                          <span>Staging Area Discussed</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <Icon :name="jha.rescueProceduresDiscussed ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5" :class="jha.rescueProceduresDiscussed ? 'text-emerald-500' : 'text-muted-foreground'" />
                          <span>Rescue Procedures</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <Icon :name="jha.firstAidAndCPREquipmentOnsite ? 'i-lucide-check-circle-2' : 'i-lucide-circle'" class="size-3.5" :class="jha.firstAidAndCPREquipmentOnsite ? 'text-emerald-500' : 'text-muted-foreground'" />
                          <span>First Aid & CPR Onsite</span>
                        </div>
                      </div>
                      <div v-if="jha.nameOfHospital" class="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                        <span class="font-semibold">Hospital:</span> {{ jha.nameOfHospital }}
                        <br v-if="jha.addressOfHospital" />
                        <span v-if="jha.addressOfHospital">{{ jha.addressOfHospital }}</span>
                      </div>
                    </div>

                    <!-- Signatures -->
                    <div class="rounded-lg border bg-card p-3 space-y-2">
                      <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Icon name="i-lucide-pen-tool" class="size-3.5 text-blue-500" />
                        Signatures ({{ jha.signatureCount || 0 }}/{{ jha.assigneeCount || 0 }})
                      </h4>
                      <div class="space-y-1.5">
                        <div
                          v-for="(sig, si) in (jha.signatures || []).slice(0, 10)"
                          :key="si"
                          class="flex items-center gap-2 p-1.5 rounded-md bg-muted/30"
                        >
                          <Avatar class="size-6 border">
                            <AvatarImage v-if="sig.employeeAvatar" :src="sig.employeeAvatar" />
                            <AvatarFallback class="text-[8px]">{{ getInitials(sig.employeeName || sig.employee || '') }}</AvatarFallback>
                          </Avatar>
                          <div class="flex-1 min-w-0">
                            <p class="text-[10px] font-semibold truncate">{{ sig.employeeName || sig.employee || 'Unknown' }}</p>
                            <p v-if="sig.location" class="text-[9px] text-muted-foreground truncate">
                              <Icon name="i-lucide-map-pin" class="inline size-2.5" /> {{ sig.location }}
                            </p>
                          </div>
                          <Icon name="i-lucide-check-circle-2" class="size-3.5 text-emerald-500 shrink-0" />
                        </div>

                        <!-- Missing assignee signatures -->
                        <template v-if="jha.unsignedAssigneeCount > 0 && jha.assigneeDetails">
                          <div class="mt-1 pt-1 border-t border-dashed">
                            <p class="text-[9px] font-bold text-red-500 mb-1 uppercase tracking-wider">Missing Signatures</p>
                            <div
                              v-for="(a, ai) in jha.assigneeDetails.filter((ad: any) =>
                                !(jha.signatures || []).some((s: any) => (s.employee || '').toLowerCase() === (ad.email || '').toLowerCase())
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

                      <!-- Client Sign Status -->
                      <div class="mt-2 pt-2 border-t flex items-center gap-2 text-[10px]">
                        <Icon
                          :name="jha.hasClientSign ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
                          class="size-3.5"
                          :class="jha.hasClientSign ? 'text-emerald-500' : 'text-red-500'"
                        />
                        <span :class="jha.hasClientSign ? 'text-emerald-600' : 'text-red-500'">
                          {{ jha.hasClientSign ? `Client: ${jha.clientEmail}` : 'Client signature missing' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Notes -->
                  <div v-if="jha.anySpecificNotes" class="rounded-lg border bg-card p-3">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Notes</h4>
                    <p class="text-xs text-foreground">{{ jha.anySpecificNotes }}</p>
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
