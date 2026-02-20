<script setup lang="ts">
import type { CrudColumn } from '~/composables/useCrud'
import { toast } from 'vue-sonner'

const props = defineProps<{
  title: string
  description: string
  icon: string
  columns: CrudColumn[]
  filterFn: (car: any) => boolean
}>()

const { setHeader } = usePageHeader()
setHeader({ title: props.title, description: props.description, icon: props.icon })

// ─── Global cached data ───
const {
  allCars,
  isLoading,
  isFetched,
  fetchError,
  fetchAllCars,
  refreshCars,
} = useAuctionsApi()

// ─── Highlight on return ───
const highlightedId = ref<string | null>(null)

const router = useRouter()

function navigateToInspection(car: any) {
  if (!car.appointmentId)
    return
  sessionStorage.setItem('auction_last_viewed', car.id || car._id)
  router.push(`/inspection/${car.appointmentId}`)
}

onMounted(async () => {
  fetchAllCars()

  // Check if returning from inspection
  const lastViewed = sessionStorage.getItem('auction_last_viewed')
  if (lastViewed) {
    sessionStorage.removeItem('auction_last_viewed')
    highlightedId.value = lastViewed

    // Wait for data + DOM to render, then scroll into view
    await nextTick()
    setTimeout(() => {
      const el = document.getElementById(`auction-row-${lastViewed}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 300)

    // Clear highlight after 3 seconds
    setTimeout(() => {
      highlightedId.value = null
    }, 3500)
  }
})

// ─── UI State ───
const search = ref('')

// ─── Base filtered items (before search) ───
const baseFilteredItems = computed(() => allCars.value.filter(props.filterFn))

// ─── Client-side filtering with search ───
const filteredItems = computed(() => {
  let result = baseFilteredItems.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      ['make', 'model', 'variant', 'registrationNumber', 'inspectionLocation', 'fuelType', 'appointmentId'].some(key =>
        String(item[key] ?? '').toLowerCase().includes(q),
      ),
    )
  }

  return result
})

// ─── Client-side pagination (30 per page) ───
const PER_PAGE = 30
const currentPage = ref(1)

watch(search, () => { currentPage.value = 1 })

const totalFiltered = computed(() => filteredItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / PER_PAGE)))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * PER_PAGE
  return filteredItems.value.slice(start, start + PER_PAGE)
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value)
    return
  currentPage.value = page
}

const showingFrom = computed(() => totalFiltered.value === 0 ? 0 : ((currentPage.value - 1) * PER_PAGE) + 1)
const showingTo = computed(() => Math.min(currentPage.value * PER_PAGE, totalFiltered.value))

// ─── Formatters ───
const statusBadgeClasses: Record<string, string> = {
  live: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  upcoming: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  otobuy: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  liveAuctionEnded: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  sold: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  removed: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const statusLabels: Record<string, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  otobuy: 'Otobuy',
  liveAuctionEnded: 'Ended',
  sold: 'Sold',
  removed: 'Removed',
}

function getBadgeClass(value: string): string {
  return statusBadgeClasses[value] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

function getStatusLabel(value: string): string {
  return statusLabels[value] || value || '—'
}

function formatCurrency(value: any): string {
  if (value === null || value === undefined || value === 0)
    return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value))
}

function formatDate(value: string): string {
  if (!value)
    return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }
  catch { return value }
}

function formatNumber(value: any): string {
  if (value === null || value === undefined)
    return '—'
  return new Intl.NumberFormat('en-IN').format(Number(value))
}

async function handleRefresh() {
  await refreshCars()
  toast.success('Auction data refreshed')
}

// ─── Pagination with ellipsis ───
const pageNumbers = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | string)[] = [1]
  if (current > 3)
    pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2)
    pages.push('...')
  pages.push(total)
  return pages
})
</script>

<template>
  <!-- Teleport toolbar into the main header -->
  <ClientOnly>
    <Teleport to="#header-actions">
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search auctions..." class="pl-8 h-8 w-48 text-sm" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ totalFiltered }} car{{ totalFiltered !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8" :disabled="isLoading" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isLoading }" />
        Refresh
      </Button>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load auction data
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
          Loading auctions...
        </p>
      </div>
    </div>

    <!-- Table -->
    <div v-else-if="!fetchError" class="flex-1 min-h-0 overflow-auto">
      <Table>
        <TableHeader class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
          <TableRow>
            <TableHead class="w-16" />
            <TableHead>Car</TableHead>
            <TableHead>Reg. No.</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Fuel</TableHead>
            <TableHead>Odometer</TableHead>
            <TableHead>Highest Bid</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Auction End</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="car in paginatedItems"
            :id="`auction-row-${car.id}`"
            :key="car.id"
            class="group cursor-pointer hover:bg-muted/50 transition-all duration-300"
            :class="{ 'auction-row-highlight': highlightedId === car.id }"
            @click="navigateToInspection(car)"
          >
            <!-- Thumbnail -->
            <TableCell class="w-16 pr-0">
              <div class="size-10 rounded-md overflow-hidden bg-muted border">
                <img
                  v-if="car.imageUrl"
                  :src="car.imageUrl"
                  :alt="`${car.make} ${car.model}`"
                  class="size-full object-cover"
                  loading="lazy"
                >
                <div v-else class="size-full flex items-center justify-center">
                  <Icon name="i-lucide-car" class="size-4 text-muted-foreground" />
                </div>
              </div>
            </TableCell>

            <!-- Car Name (Make + Model + Variant) -->
            <TableCell>
              <div class="min-w-0">
                <p class="font-medium text-sm truncate">
                  {{ car.make }} {{ car.model }}
                </p>
                <p class="text-xs text-muted-foreground truncate">
                  {{ car.variant }}
                </p>
              </div>
            </TableCell>

            <!-- Registration -->
            <TableCell>
              <span class="text-sm font-mono">{{ car.registrationNumber || '—' }}</span>
            </TableCell>

            <!-- Location -->
            <TableCell>
              <span class="text-sm">{{ car.inspectionLocation || '—' }}</span>
            </TableCell>

            <!-- Fuel Type -->
            <TableCell>
              <Badge variant="secondary" class="text-xs font-normal">
                {{ car.fuelType || '—' }}
              </Badge>
            </TableCell>

            <!-- Odometer -->
            <TableCell>
              <span class="text-sm tabular-nums">{{ formatNumber(car.odometerReadingInKms) }} km</span>
            </TableCell>

            <!-- Highest Bid -->
            <TableCell>
              <span class="font-semibold text-sm tabular-nums" :class="car.highestBid > 0 ? 'text-emerald-600' : 'text-muted-foreground'">
                {{ formatCurrency(car.highestBid) }}
              </span>
            </TableCell>

            <!-- Auction Status Badge -->
            <TableCell>
              <Badge variant="outline" :class="getBadgeClass(car.auctionStatus)">
                {{ getStatusLabel(car.auctionStatus) }}
              </Badge>
            </TableCell>

            <!-- Auction End Time -->
            <TableCell>
              <span class="text-sm text-muted-foreground">{{ formatDate(car.auctionEndTime) }}</span>
            </TableCell>
          </TableRow>

          <TableRow v-if="paginatedItems.length === 0 && !isLoading">
            <TableCell :colspan="9" class="h-32 text-center">
              <div class="flex flex-col items-center gap-2 text-muted-foreground">
                <Icon name="i-lucide-inbox" class="size-8" />
                <p>No cars found</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="isFetched && !fetchError" class="shrink-0 border-t bg-muted/30 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2">
      <p class="text-xs text-muted-foreground tabular-nums">
        Showing {{ showingFrom }} to {{ showingTo }} out of {{ totalFiltered }} cars
      </p>
      <div v-if="totalPages > 1" class="flex items-center gap-1">
        <Button variant="outline" size="icon" class="size-7" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          <Icon name="i-lucide-chevron-left" class="size-3.5" />
        </Button>
        <template v-for="pg in pageNumbers" :key="pg">
          <Button
            v-if="pg !== '...'"
            :variant="pg === currentPage ? 'default' : 'outline'"
            size="icon"
            class="size-7 text-xs"
            @click="goToPage(pg as number)"
          >
            {{ pg }}
          </Button>
          <span v-else class="px-1 text-xs text-muted-foreground">…</span>
        </template>
        <Button variant="outline" size="icon" class="size-7" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
          <Icon name="i-lucide-chevron-right" class="size-3.5" />
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auction-row-highlight {
  animation: row-glow 3s ease-out forwards;
  position: relative;
  z-index: 1;
}

.auction-row-highlight td {
  border-top: 1px solid oklch(0.65 0.25 265) !important;
  border-bottom: 1px solid oklch(0.65 0.25 265) !important;
}

.auction-row-highlight td:first-child {
  border-left: 2px solid oklch(0.65 0.25 265) !important;
}

.auction-row-highlight td:last-child {
  border-right: 2px solid oklch(0.65 0.25 265) !important;
}

@keyframes row-glow {
  0% {
    background-color: oklch(0.65 0.25 265 / 15%);
    box-shadow: inset 0 0 20px oklch(0.65 0.25 265 / 8%), 0 0 15px oklch(0.65 0.25 265 / 10%);
  }
  30% {
    background-color: oklch(0.65 0.25 265 / 10%);
    box-shadow: inset 0 0 15px oklch(0.65 0.25 265 / 5%), 0 0 10px oklch(0.65 0.25 265 / 6%);
  }
  70% {
    background-color: oklch(0.65 0.25 265 / 5%);
    box-shadow: inset 0 0 8px oklch(0.65 0.25 265 / 2%), 0 0 5px oklch(0.65 0.25 265 / 3%);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}

.dark .auction-row-highlight td {
  border-top-color: oklch(0.7 0.2 265) !important;
  border-bottom-color: oklch(0.7 0.2 265) !important;
}

.dark .auction-row-highlight td:first-child {
  border-left-color: oklch(0.7 0.2 265) !important;
}

.dark .auction-row-highlight td:last-child {
  border-right-color: oklch(0.7 0.2 265) !important;
}
</style>
