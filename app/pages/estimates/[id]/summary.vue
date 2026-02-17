<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

// ─── Formatters ───
function formatCurrency(value: any): string {
  if (value === null || value === undefined || isNaN(value)) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value))
}

function formatDate(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })
  }
  catch { return value }
}

// ─── Cost Breakdown Colors ───
const costCategories = [
  { key: 'labor', label: 'Labor', color: '#3B82F6' },
  { key: 'subcontractor', label: 'Subcontractor', color: '#8B5CF6' },
  { key: 'equipment', label: 'Equipment', color: '#F59E0B' },
  { key: 'overhead', label: 'Overhead', color: '#10B981' },
  { key: 'disposal', label: 'Disposal', color: '#EF4444' },
  { key: 'miscellaneous', label: 'Miscellaneous', color: '#EC4899' },
  { key: 'material', label: 'Material', color: '#06B6D4' },
]

// Compute cost breakdown from estimate line items
const costBreakdown = computed(() => {
  if (!props.estimate) return []
  const est = props.estimate

  return costCategories.map((cat) => {
    const subTotal = Number(est[`${cat.key}SubTotal`] || est[`${cat.key}Total`] || est[cat.key] || 0)
    const markupTotal = Number(est[`${cat.key}MarkupTotal`] || est[`${cat.key}Markup`] || 0)
    return {
      ...cat,
      subTotal,
      markupTotal,
    }
  }).filter(c => c.subTotal > 0 || c.markupTotal > 0)
})

const totalSubTotal = computed(() => Number(props.estimate?.subTotal || 0))
const totalGrandTotal = computed(() => Number(props.estimate?.grandTotal || 0))

// Percentage for each cost category
function getCostPercent(subTotal: number): string {
  if (!totalSubTotal.value || totalSubTotal.value === 0) return '0'
  return ((subTotal / totalSubTotal.value) * 100).toFixed(1)
}

// Semi-circle gauge segments
const gaugeSegments = computed(() => {
  if (!costBreakdown.value.length) return []
  const total = costBreakdown.value.reduce((sum, c) => sum + c.subTotal, 0)
  // Semi-circle arc: radius=16, circumference of half circle = π * r ≈ 50.27
  const arcLength = Math.PI * 16 // ~50.27
  let cumulative = 0
  return costBreakdown.value.map((cat) => {
    const pct = total > 0 ? (cat.subTotal / total) * 100 : 0
    const segLength = (pct / 100) * arcLength
    const seg = {
      ...cat,
      percentage: pct,
      dashArray: `${segLength} ${arcLength - segLength}`,
      dashOffset: -cumulative,
    }
    cumulative += segLength
    return seg
  })
})

// Get services count
const servicesCount = computed(() => {
  if (!props.estimate?.services) return 0
  return Array.isArray(props.estimate.services) ? props.estimate.services.length : 0
})

// Version info placeholder
const versions = computed(() => {
  if (!props.estimate) return []
  return [{
    version: 'V1',
    estimate: props.estimate.estimate || '—',
    date: formatDate(props.estimate.date),
    status: props.estimate.status || 'Pending',
    total: formatCurrency(props.estimate.grandTotal),
  }]
})
</script>

<template>
  <div class="p-6">
    <!-- Loading State -->
    <div v-if="isLoading && !estimate" class="flex items-center justify-center h-64">
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
        <p class="text-sm">Loading estimate...</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="estimate" class="space-y-6">
      <!-- Top 4 Cards Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

        <!-- Card 1: Customer & Details -->
        <div class="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
          <div class="space-y-3">
            <div>
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Customer</label>
              <p class="text-sm font-semibold mt-0.5 flex items-center gap-2">
                <Icon name="i-lucide-building-2" class="size-3.5 text-blue-500" />
                {{ estimate.customerName || '—' }}
              </p>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Contact</label>
              <p class="text-sm mt-0.5">{{ estimate.contactName || '—' }}</p>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Job Address</label>
              <p class="text-sm mt-0.5 text-muted-foreground">{{ estimate.jobAddress || 'No address' }}</p>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Project Name</label>
              <p class="text-sm mt-0.5">{{ estimate.projectName || '—' }}</p>
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">USA Number</label>
              <p class="text-sm mt-0.5 text-muted-foreground">{{ estimate.usaNumber || '—' }}</p>
            </div>
          </div>
        </div>

        <!-- Card 2: Key Metrics -->
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Date</label>
              <p class="text-lg font-bold mt-1 tabular-nums">{{ formatDate(estimate.date) }}</p>
            </div>
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Estimate No.</label>
              <p class="text-lg font-bold mt-1 text-blue-600">{{ estimate.estimate || '—' }}</p>
            </div>
          </div>

          <div class="border-t my-4" />

          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Fringe Rate</label>
              <div class="mt-2 flex justify-center">
                <Badge
                  variant="outline"
                  class="text-xs px-3 py-1"
                  :class="estimate.fringe ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'"
                >
                  {{ estimate.fringe || 'No' }}
                </Badge>
              </div>
            </div>
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Cert-Pay</label>
              <div class="mt-2 flex justify-center">
                <Badge
                  variant="outline"
                  class="text-xs px-3 py-1"
                  :class="estimate.certifiedPayroll ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'"
                >
                  {{ estimate.certifiedPayroll ? 'Yes' : 'No' }}
                </Badge>
              </div>
            </div>
          </div>

          <div class="border-t my-4" />

          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Services</label>
              <div class="mt-2 flex justify-center">
                <div class="size-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <span class="text-sm font-bold text-blue-600">{{ servicesCount }}</span>
                </div>
              </div>
            </div>
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Markup %</label>
              <p class="text-xl font-bold mt-1 tabular-nums text-foreground">
                {{ estimate.bidMarkUp ? String(estimate.bidMarkUp).replace('%', '') + '%' : '—' }}
              </p>
            </div>
          </div>

          <div class="border-t my-4" />

          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Proposal Writer</label>
              <div class="mt-2 flex justify-center">
                <Avatar class="size-10 border-2 border-blue-500/20">
                  <AvatarImage :src="estimate.proposalWriterAvatar" :alt="estimate.proposalWriterName" />
                  <AvatarFallback class="text-xs bg-blue-500/10 text-blue-600">
                    {{ (estimate.proposalWriterName || '??').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) }}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p class="text-[10px] text-muted-foreground mt-1">{{ estimate.proposalWriterName || '—' }}</p>
            </div>
            <div class="text-center">
              <label class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</label>
              <div class="mt-2 flex justify-center">
                <Badge
                  variant="outline"
                  class="text-xs px-3 py-1"
                  :class="{
                    'bg-amber-500/10 text-amber-600 border-amber-500/20': estimate.status === 'Pending',
                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20': estimate.status === 'Completed',
                    'bg-green-600/10 text-green-600 border-green-600/20': estimate.status === 'Won',
                    'bg-red-500/10 text-red-600 border-red-500/20': estimate.status === 'Lost',
                  }"
                >
                  {{ estimate.status || 'Pending' }}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Cost Breakdown with Semi-circle Gauge -->
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <h4 class="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-5 text-center">Cost Breakdown</h4>

          <!-- Semi-circle Gauge -->
          <div class="flex justify-center mb-5">
            <div class="relative w-48 h-28">
              <svg viewBox="0 0 42 24" class="w-full h-full" overflow="visible">
                <!-- Background arc (gray) -->
                <circle
                  cx="21" cy="21" r="16"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="`${Math.PI * 16} ${Math.PI * 16}`"
                  transform="rotate(180, 21, 21)"
                />
                <!-- Colored segments -->
                <circle
                  v-for="(seg, idx) in gaugeSegments"
                  :key="idx"
                  cx="21" cy="21" r="16"
                  fill="none"
                  :stroke="seg.color"
                  stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="seg.dashArray"
                  :stroke-dashoffset="seg.dashOffset"
                  transform="rotate(180, 21, 21)"
                  class="transition-all duration-500"
                />
              </svg>
              <!-- Center text -->
              <div class="absolute inset-0 flex flex-col items-center justify-end pb-0">
                <p class="text-2xl font-bold tabular-nums tracking-tight">{{ formatCurrency(totalGrandTotal) }}</p>
                <p class="text-xs text-muted-foreground tabular-nums">{{ formatCurrency(totalSubTotal) }}</p>
              </div>
            </div>
          </div>

          <!-- Legend -->
          <div class="space-y-2.5 mt-2">
            <div
              v-for="cat in costBreakdown"
              :key="cat.key"
              class="flex items-center gap-3 text-xs"
            >
              <div class="size-3 shrink-0 rounded-full" :style="{ backgroundColor: cat.color }" />
              <span class="flex-1 font-medium text-foreground">{{ cat.label }}</span>
              <span class="tabular-nums text-muted-foreground w-12 text-right">{{ getCostPercent(cat.subTotal) }}%</span>
              <span class="tabular-nums text-muted-foreground w-16 text-right">{{ formatCurrency(cat.subTotal) }}</span>
              <span class="tabular-nums w-16 text-right font-bold text-foreground">{{ formatCurrency(cat.markupTotal) }}</span>
            </div>
          </div>
        </div>

        <!-- Card 4: Version History & Change Orders -->
        <div class="rounded-xl border bg-card p-5 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <div class="w-1 h-4 bg-blue-500 rounded-full" />
              Version History
            </h4>
            <Badge variant="secondary" class="text-[10px] h-5">{{ versions.length }}</Badge>
          </div>

          <div class="space-y-2">
            <div
              v-for="(ver, idx) in versions"
              :key="idx"
              class="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-transparent hover:border-border transition-colors"
            >
              <div class="shrink-0 size-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span class="text-[10px] font-bold text-blue-600">{{ ver.version }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold">{{ ver.estimate }}</p>
                <p class="text-[10px] text-muted-foreground">{{ ver.date }}</p>
              </div>
              <div class="text-right shrink-0">
                <Badge
                  variant="outline"
                  class="text-[9px] px-1.5 py-0.5"
                  :class="{
                    'bg-amber-500/10 text-amber-600 border-amber-500/20': ver.status === 'Pending',
                    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20': ver.status === 'Completed',
                    'bg-green-600/10 text-green-600 border-green-600/20': ver.status === 'Won',
                    'bg-red-500/10 text-red-600 border-red-500/20': ver.status === 'Lost',
                  }"
                >
                  {{ ver.status }}
                </Badge>
                <p class="text-xs font-semibold mt-0.5 tabular-nums">{{ ver.total }}</p>
              </div>
            </div>
          </div>

          <div class="border-t mt-4 pt-4">
            <h4 class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
              <div class="w-1 h-4 bg-amber-500 rounded-full" />
              Change Orders
            </h4>
            <p class="text-xs text-muted-foreground mt-3 italic">No change orders found</p>
          </div>
        </div>
      </div>

      <!-- Services Tags -->
      <div v-if="estimate.services?.length" class="rounded-xl border bg-card p-5 shadow-sm">
        <h4 class="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-3">Services</h4>
        <div class="flex flex-wrap gap-2">
          <Badge
            v-for="service in estimate.services"
            :key="service"
            variant="secondary"
            class="text-xs font-normal bg-blue-500/5 text-blue-700 border border-blue-500/20 dark:text-blue-400"
          >
            {{ service }}
          </Badge>
        </div>
      </div>
    </div>
  </div>
</template>
