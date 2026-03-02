<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const preBoreId = computed(() => route.params.id as string)

// ─── Fetch detail ───
const preBore = ref<any>(null)
const isLoading = ref(true)
const fetchError = ref<string | null>(null)

async function fetchDetail() {
  isLoading.value = true
  fetchError.value = null
  try {
    const res = await $fetch<any>(`/api/pre-bore/${preBoreId.value}`)
    preBore.value = res.preBore
  }
  catch (err: any) {
    fetchError.value = err?.data?.message || err?.message || 'Failed to load pre-bore record'
    toast.error('Failed to load pre-bore details')
  }
  finally {
    isLoading.value = false
  }
}

fetchDetail()

watchEffect(() => {
  setHeader({
    title: preBore.value ? `Pre-Bore Log / ${preBore.value.customerName || preBore.value.scheduleTitle || 'Detail'}` : 'Pre-Bore Log Detail',
    icon: 'i-lucide-drill',
  })
})

// ─── Formatters ───
function fmtDate(val: string): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  catch { return val }
}

function fmtShortDate(val: string): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return val }
}

function fmtTime(val: string): string {
  if (!val) return '—'
  try {
    // Handle "1/12/2026 13:29:00" format
    if (val.includes('/') && val.includes(':')) {
      const [, timePart] = val.split(' ')
      if (timePart) {
        const [h, m] = timePart.split(':')
        const hour = Number.parseInt(h || '0', 10)
        const min = m || '00'
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${h12}:${min} ${ampm}`
      }
    }
    // Handle ISO format
    if (val.includes('T')) {
      const timePart = val.split('T')[1]
      if (timePart) {
        const [h, m] = timePart.split(':')
        const hour = Number.parseInt(h || '0', 10)
        const min = m || '00'
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${h12}:${min} ${ampm}`
      }
    }
    return val
  }
  catch { return val }
}

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ─── Computed ───
const logs = computed(() => preBore.value?.preBoreLogs || [])

const activeTab = ref('details')
const tabs = computed(() => [
  { id: 'details', label: 'Details', icon: 'i-lucide-info', count: null },
  { id: 'bore-logs', label: 'Bore Logs', icon: 'i-lucide-list', count: logs.value.length },
  { id: 'signatures', label: 'Signatures', icon: 'i-lucide-pen-tool', count: (preBore.value?.hasForemanSignature ? 1 : 0) + (preBore.value?.hasCustomerSignature ? 1 : 0) },
])

// Drill spec sections
const drillSpecs = computed(() => {
  if (!preBore.value) return []
  const specs = [
    { label: 'Drill Size', value: preBore.value.drillSize, icon: 'i-lucide-circle-dot' },
    { label: 'Pilot Bore Size', value: preBore.value.pilotBoreSize, icon: 'i-lucide-target' },
    { label: 'Bore Length', value: preBore.value.boreLength, icon: 'i-lucide-ruler' },
    { label: 'Pipe Size', value: preBore.value.pipeSize, icon: 'i-lucide-pipeline' },
  ]
  return specs.filter(s => s.value)
})

const reamerSizes = computed(() => {
  if (!preBore.value) return []
  const sizes = [
    { label: '6"', value: preBore.value.reamerSize6 },
    { label: '8"', value: preBore.value.reamerSize8 },
    { label: '10"', value: preBore.value.reamerSize10 },
    { label: '12"', value: preBore.value.reamerSize12 },
  ]
  return sizes.filter(s => s.value)
})
</script>

<template>
  <div class="min-h-full">
    <!-- Header Actions -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="size-3" />
          Back
        </Button>
        <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" :disabled="isLoading" @click="fetchDetail()">
          <Icon name="i-lucide-refresh-cw" class="size-3" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="animate-pulse">
      <!-- Hero skeleton -->
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-sky-500/3 to-transparent" />
        <div class="relative px-4 lg:px-8 py-6 lg:py-8 space-y-4">
          <div class="flex items-center gap-2">
            <div class="h-6 w-28 rounded-full bg-muted-foreground/10" />
            <div class="h-6 w-20 rounded-full bg-muted-foreground/8" />
          </div>
          <div class="h-8 rounded bg-muted-foreground/10" style="width: 40%" />
          <div class="flex items-center gap-2">
            <div class="size-6 rounded-md bg-muted-foreground/10" />
            <div class="h-4 w-32 rounded bg-muted-foreground/8" />
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div v-for="i in 4" :key="i" class="rounded-xl bg-card border p-4 space-y-2">
              <div class="flex items-center gap-3">
                <div class="size-11 rounded-lg bg-muted-foreground/10" />
                <div class="space-y-1.5 flex-1">
                  <div class="h-3.5 rounded bg-muted-foreground/10" style="width: 60%" />
                  <div class="h-2.5 rounded bg-muted-foreground/8" style="width: 40%" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="flex items-center justify-center h-96">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="i-lucide-alert-triangle" class="size-8 text-destructive" />
        </div>
        <div>
          <h3 class="text-lg font-bold">
            Failed to Load
          </h3>
          <p class="text-sm text-muted-foreground mt-1">
            {{ fetchError }}
          </p>
        </div>
        <Button variant="outline" @click="fetchDetail()">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
          Try Again
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="preBore" class="pb-8">
      <!-- ═══════ HERO ═══════ -->
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-sky-500/8 via-sky-500/4 to-transparent" />
        <div class="absolute -top-20 -right-20 w-60 h-60 bg-sky-500/5 rounded-full blur-3xl" />
        <div class="relative px-4 lg:px-8 py-6 lg:py-8">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-2 flex-wrap">
              <Badge v-if="preBore.service" class="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs font-bold px-3 py-1 shadow-sm">
                <Icon name="i-lucide-drill" class="size-3 mr-1" />{{ preBore.service }}
              </Badge>
              <Badge v-if="preBore.item" variant="outline" class="text-[11px] font-medium bg-background/80 backdrop-blur-sm">
                {{ preBore.item }}
              </Badge>
              <Badge v-if="preBore.soilType" variant="secondary" class="text-[10px] font-bold">
                <Icon name="i-lucide-mountain" class="size-3 mr-1" />{{ preBore.soilType }}
              </Badge>
            </div>
            <div v-if="preBore.estimate" class="shrink-0">
              <div class="rounded-lg bg-sky-500/5 border border-sky-500/15 px-4 py-2 backdrop-blur-sm">
                <p class="text-[9px] font-bold uppercase tracking-widest text-sky-500/70">
                  Estimate
                </p>
                <p class="text-lg font-black text-sky-600 dark:text-sky-400 tabular-nums tracking-tight">
                  {{ preBore.estimate }}
                </p>
              </div>
            </div>
          </div>

          <h1 class="text-2xl lg:text-3xl font-black text-foreground leading-tight tracking-tight mb-2">
            {{ preBore.scheduleTitle || preBore.customerName || 'Pre-Bore Log' }}
          </h1>
          <div v-if="preBore.customerName" class="flex items-center gap-2 text-muted-foreground mb-6">
            <div class="size-6 rounded-md bg-muted flex items-center justify-center">
              <Icon name="i-lucide-building-2" class="size-3.5" />
            </div>
            <span class="text-sm font-medium">{{ preBore.customerName }}</span>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Icon name="i-lucide-calendar" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ fmtShortDate(preBore.date) }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Bore Date
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Icon name="i-lucide-ruler" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ preBore.boreLength || '—' }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Bore Length
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Icon name="i-lucide-list" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ logs.length }} rod{{ logs.length !== 1 ? 's' : '' }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Bore Logs
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Icon name="i-lucide-pen-tool" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ (preBore.hasForemanSignature ? 1 : 0) + (preBore.hasCustomerSignature ? 1 : 0) }} / 2
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Signatures
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════ TABS ═══════ -->
      <div class="px-4 lg:px-8 border-b">
        <div class="flex gap-0.5 -mb-px overflow-x-auto">
          <button
            v-for="tab in tabs" :key="tab.id"
            class="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-all duration-200 border-b-2 whitespace-nowrap shrink-0"
            :class="[activeTab === tab.id ? 'text-sky-600 dark:text-sky-400 border-sky-500 bg-sky-500/5' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50']"
            @click="activeTab = tab.id"
          >
            <Icon :name="tab.icon" class="size-3.5" />{{ tab.label }}
            <Badge v-if="tab.count !== null" variant="secondary" class="h-4 min-w-4 justify-center px-1 text-[9px] font-bold tabular-nums" :class="activeTab === tab.id ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' : ''">
              {{ tab.count }}
            </Badge>
          </button>
        </div>
      </div>

      <!-- ═══════ TAB CONTENT ═══════ -->
      <div class="px-4 lg:px-8 py-6">
        <!-- ──── DETAILS TAB ──── -->
        <div v-if="activeTab === 'details'" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Bore Info + People -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Location -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-map-pin" class="size-4 text-sky-500" />Location
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="rounded-lg bg-emerald-500/5 p-4 ring-1 ring-emerald-500/15">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="size-6 rounded-md bg-emerald-500/15 flex items-center justify-center">
                          <Icon name="i-lucide-map-pin" class="size-3 text-emerald-500" />
                        </div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Bore Start
                        </p>
                      </div>
                      <p class="text-sm font-semibold">
                        {{ preBore.addressBoreStart || '—' }}
                      </p>
                    </div>
                    <div class="rounded-lg bg-rose-500/5 p-4 ring-1 ring-rose-500/15">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="size-6 rounded-md bg-rose-500/15 flex items-center justify-center">
                          <Icon name="i-lucide-map-pin" class="size-3 text-rose-500" />
                        </div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Bore End
                        </p>
                      </div>
                      <p class="text-sm font-semibold">
                        {{ preBore.addressBoreEnd || '—' }}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- Drill Specifications -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-settings-2" class="size-4 text-sky-500" />Drill Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div v-for="spec in drillSpecs" :key="spec.label" class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30 hover:bg-muted/50 transition-colors">
                      <div class="flex items-center gap-1.5 mb-1.5">
                        <Icon :name="spec.icon" class="size-3 text-muted-foreground" />
                        <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {{ spec.label }}
                        </p>
                      </div>
                      <p class="text-base font-black tabular-nums">
                        {{ spec.value }}
                      </p>
                    </div>
                  </div>
                  <!-- Reamer Sizes -->
                  <div v-if="reamerSizes.length > 0" class="mt-4">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Reamer Sizes
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <Badge v-for="reamer in reamerSizes" :key="reamer.label" variant="outline" class="text-xs font-semibold px-3 py-1 gap-1.5">
                        <span class="text-muted-foreground">{{ reamer.label }}:</span>
                        <span class="font-bold">{{ reamer.value }}</span>
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- People -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-users" class="size-4 text-sky-500" />People
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div v-if="preBore.devcoOperatorName || preBore.devcoOperator" class="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar class="size-12 border-2 border-sky-500/20">
                      <AvatarImage v-if="preBore.devcoOperatorAvatar" :src="preBore.devcoOperatorAvatar" />
                      <AvatarFallback class="text-sm font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        {{ getInitials(preBore.devcoOperatorName || preBore.devcoOperator) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold">
                        {{ preBore.devcoOperatorName || preBore.devcoOperator }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        DEVCO Operator
                      </p>
                    </div>
                    <Badge variant="outline" class="text-[10px] font-bold bg-sky-500/5 text-sky-600 border-sky-500/20 shrink-0">
                      Operator
                    </Badge>
                  </div>
                  <div v-if="preBore.customerForeman" class="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar class="size-12 border-2 border-amber-500/20">
                      <AvatarFallback class="text-sm font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {{ getInitials(preBore.customerForeman) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold">
                        {{ preBore.customerForeman }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Customer Foreman
                      </p>
                    </div>
                    <Badge variant="outline" class="text-[10px] font-bold bg-amber-500/5 text-amber-600 border-amber-500/20 shrink-0">
                      Foreman
                    </Badge>
                  </div>
                  <div v-if="preBore.createdByName" class="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar class="size-12 border-2 border-muted">
                      <AvatarImage v-if="preBore.createdByAvatar" :src="preBore.createdByAvatar" />
                      <AvatarFallback class="text-sm font-bold">
                        {{ getInitials(preBore.createdByName) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold">
                        {{ preBore.createdByName }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Created By
                      </p>
                    </div>
                    <Badge variant="secondary" class="text-[10px] font-bold shrink-0">
                      Author
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <!-- Right: Info Sidebar -->
            <div class="space-y-6">
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-info" class="size-4 text-sky-500" />Bore Info
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Date</span>
                    <span class="text-xs font-semibold">{{ fmtDate(preBore.date) }}</span>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Start Time</span>
                    <span class="text-xs font-semibold">{{ fmtTime(preBore.startTime) }}</span>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Soil Type</span>
                    <Badge variant="secondary" class="text-[10px] font-bold">{{ preBore.soilType || '—' }}</Badge>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Bore Length</span>
                    <span class="text-xs font-bold tabular-nums">{{ preBore.boreLength || '—' }}</span>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Pipe Size</span>
                    <span class="text-xs font-semibold tabular-nums">{{ preBore.pipeSize || '—' }}</span>
                  </div>
                  <template v-if="preBore.customerWorkRequestNumber">
                    <Separator />
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">Work Request #</span>
                      <span class="text-xs font-semibold">{{ preBore.customerWorkRequestNumber }}</span>
                    </div>
                  </template>
                  <template v-if="preBore.estimate">
                    <Separator />
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">Estimate</span>
                      <span class="text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums">{{ preBore.estimate }}</span>
                    </div>
                  </template>
                </CardContent>
              </Card>

              <!-- Signature Status -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-pen-tool" class="size-4 text-sky-500" />Signature Status
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Icon name="i-lucide-hard-hat" class="size-4 text-sky-500" />
                      <span class="text-xs">Foreman</span>
                    </div>
                    <Badge :variant="preBore.hasForemanSignature ? 'default' : 'secondary'" class="text-[10px] font-bold">
                      {{ preBore.hasForemanSignature ? 'Signed' : 'Pending' }}
                    </Badge>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <Icon name="i-lucide-user" class="size-4 text-amber-500" />
                      <span class="text-xs">Customer</span>
                    </div>
                    <Badge :variant="preBore.hasCustomerSignature ? 'default' : 'secondary'" class="text-[10px] font-bold">
                      {{ preBore.hasCustomerSignature ? 'Signed' : 'Pending' }}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <!-- Metadata -->
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-clock" class="size-4 text-sky-500" />Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Created</span>
                    <span class="text-xs font-semibold">{{ fmtShortDate(preBore.createdAt) }}</span>
                  </div>
                  <template v-if="preBore.scheduleTitle">
                    <Separator />
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">Schedule</span>
                      <NuxtLink
                        v-if="preBore.scheduleId"
                        :to="`/scheduled-jobs/detail/${preBore.scheduleId}`"
                        class="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline truncate max-w-[150px]"
                      >
                        {{ preBore.scheduleTitle }}
                      </NuxtLink>
                      <span v-else class="text-xs font-semibold truncate max-w-[150px]">{{ preBore.scheduleTitle }}</span>
                    </div>
                  </template>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <!-- ──── BORE LOGS TAB ──── -->
        <div v-else-if="activeTab === 'bore-logs'" class="space-y-4">
          <template v-if="logs.length > 0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="text-[11px]">
                      Rod #
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Distance
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Top Depth
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Bottom Depth
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Over/Under
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Existing Utilities
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Picture
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Created By
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(log, idx) in logs" :key="log.legacy_id || idx" class="hover:bg-accent/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" class="text-xs font-bold tabular-nums bg-sky-500/5 text-sky-600 dark:text-sky-400 border-sky-500/20">
                        {{ log.rodNumber || Number(idx) + 1 }}
                      </Badge>
                    </TableCell>
                    <TableCell class="text-xs font-semibold tabular-nums">
                      {{ log.distance || '—' }}
                    </TableCell>
                    <TableCell class="text-xs tabular-nums">
                      {{ log.topDepth || '—' }}
                    </TableCell>
                    <TableCell class="text-xs tabular-nums">
                      {{ log.bottomDepth || '—' }}
                    </TableCell>
                    <TableCell>
                      <Badge
                        v-if="log.overOrUnder"
                        variant="secondary"
                        class="text-[10px] font-bold"
                        :class="log.overOrUnder === 'O' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'"
                      >
                        {{ log.overOrUnder === 'O' ? 'Over' : log.overOrUnder === 'U' ? 'Under' : log.overOrUnder }}
                      </Badge>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell class="text-xs">
                      {{ log.existingUtilities || '—' }}
                    </TableCell>
                    <TableCell>
                      <a v-if="log.picture" :href="log.picture" target="_blank" class="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline">
                        <Icon name="i-lucide-image" class="size-3.5" />
                        View
                      </a>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell>
                      <span class="text-xs">{{ log.createdByName || '—' }}</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16">
            <div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon name="i-lucide-list" class="size-7 text-muted-foreground/50" />
            </div>
            <h3 class="text-sm font-bold">
              No Bore Logs
            </h3>
            <p class="text-xs text-muted-foreground mt-1">
              No bore log entries recorded for this pre-bore.
            </p>
          </div>
        </div>

        <!-- ──── SIGNATURES TAB ──── -->
        <div v-else-if="activeTab === 'signatures'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Foreman Signature -->
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-sm font-bold flex items-center gap-2">
                  <Icon name="i-lucide-hard-hat" class="size-4 text-sky-500" />Foreman Signature
                  <Badge :variant="preBore.hasForemanSignature ? 'default' : 'secondary'" class="text-[10px] font-bold ml-auto">
                    {{ preBore.hasForemanSignature ? 'Signed' : 'Pending' }}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="preBore.foremanSignature && preBore.foremanSignature !== '[signature]'" class="rounded-lg border bg-white dark:bg-muted/20 p-4 flex items-center justify-center min-h-[120px]">
                  <img :src="preBore.foremanSignature" alt="Foreman Signature" class="max-h-32 object-contain" />
                </div>
                <div v-else-if="preBore.hasForemanSignature" class="rounded-lg border bg-muted/20 p-4 flex items-center justify-center min-h-[120px]">
                  <div class="text-center text-muted-foreground">
                    <Icon name="i-lucide-check-circle" class="size-8 text-emerald-500 mx-auto mb-2" />
                    <p class="text-xs font-medium">
                      Signature on file
                    </p>
                  </div>
                </div>
                <div v-else class="rounded-lg border border-dashed bg-muted/10 p-4 flex items-center justify-center min-h-[120px]">
                  <div class="text-center text-muted-foreground">
                    <Icon name="i-lucide-pen-tool" class="size-8 opacity-30 mx-auto mb-2" />
                    <p class="text-xs">
                      No signature yet
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Customer Signature -->
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-sm font-bold flex items-center gap-2">
                  <Icon name="i-lucide-user" class="size-4 text-amber-500" />Customer Signature
                  <Badge :variant="preBore.hasCustomerSignature ? 'default' : 'secondary'" class="text-[10px] font-bold ml-auto">
                    {{ preBore.hasCustomerSignature ? 'Signed' : 'Pending' }}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="preBore.customerSignature && preBore.customerSignature !== '[signature]'" class="rounded-lg border bg-white dark:bg-muted/20 p-4 flex items-center justify-center min-h-[120px]">
                  <img :src="preBore.customerSignature" alt="Customer Signature" class="max-h-32 object-contain" />
                </div>
                <div v-else-if="preBore.hasCustomerSignature" class="rounded-lg border bg-muted/20 p-4 flex items-center justify-center min-h-[120px]">
                  <div class="text-center text-muted-foreground">
                    <Icon name="i-lucide-check-circle" class="size-8 text-emerald-500 mx-auto mb-2" />
                    <p class="text-xs font-medium">
                      Signature on file
                    </p>
                  </div>
                </div>
                <div v-else class="rounded-lg border border-dashed bg-muted/10 p-4 flex items-center justify-center min-h-[120px]">
                  <div class="text-center text-muted-foreground">
                    <Icon name="i-lucide-pen-tool" class="size-8 opacity-30 mx-auto mb-2" />
                    <p class="text-xs">
                      No signature yet
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
