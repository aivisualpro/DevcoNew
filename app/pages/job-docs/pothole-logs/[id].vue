<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const potholeId = computed(() => route.params.id as string)

// ─── Fetch detail ───
const potholeLog = ref<any>(null)
const isLoading = ref(true)
const fetchError = ref<string | null>(null)

async function fetchDetail() {
  isLoading.value = true
  fetchError.value = null
  try {
    const res = await $fetch<any>(`/api/pothole-logs/${potholeId.value}`)
    potholeLog.value = res.potholeLog
  }
  catch (err: any) {
    fetchError.value = err?.data?.message || err?.message || 'Failed to load pothole log'
    toast.error('Failed to load pothole log details')
  }
  finally {
    isLoading.value = false
  }
}

fetchDetail()

watchEffect(() => {
  setHeader({
    title: potholeLog.value ? `Pothole Log / ${potholeLog.value.estimate || potholeLog.value.customerName || 'Detail'}` : 'Pothole Log Detail',
    icon: 'i-lucide-construction',
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

function getInitials(name: string): string {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getUtilityColor(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('gas')) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  if (t.includes('water')) return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  if (t.includes('electric') || t.includes('power')) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
  if (t.includes('sewer')) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  if (t.includes('telecom') || t.includes('comm') || t.includes('fiber')) return 'text-violet-500 bg-violet-500/10 border-violet-500/20'
  return 'text-muted-foreground bg-muted border-border/30'
}

function getUtilityIcon(type: string): string {
  const t = (type || '').toLowerCase()
  if (t.includes('gas')) return 'i-lucide-flame'
  if (t.includes('water')) return 'i-lucide-droplets'
  if (t.includes('electric') || t.includes('power')) return 'i-lucide-zap'
  if (t.includes('sewer')) return 'i-lucide-waves'
  if (t.includes('telecom') || t.includes('comm') || t.includes('fiber')) return 'i-lucide-wifi'
  return 'i-lucide-circle'
}

// Computed
const items = computed(() => potholeLog.value?.potholeItems || [])
const activeTab = ref('overview')
const tabs = computed(() => [
  { id: 'overview', label: 'Overview', icon: 'i-lucide-info', count: null },
  { id: 'potholes', label: 'Potholes', icon: 'i-lucide-list', count: items.value.length },
])

// Unique utility types for summary
const utilityTypeSummary = computed(() => {
  const types = new Map<string, number>()
  for (const item of items.value) {
    const t = item.typeOfUtility || 'Unknown'
    types.set(t, (types.get(t) || 0) + 1)
  }
  return [...types.entries()].map(([type, count]) => ({ type, count }))
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
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-amber-500/3 to-transparent" />
        <div class="relative px-4 lg:px-8 py-6 lg:py-8 space-y-4">
          <div class="flex items-center gap-2">
            <div class="h-6 w-28 rounded-full bg-muted-foreground/10" />
            <div class="h-6 w-20 rounded-full bg-muted-foreground/8" />
          </div>
          <div class="h-8 rounded bg-muted-foreground/10" style="width: 40%" />
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
    <div v-else-if="potholeLog" class="pb-8">
      <!-- ═══════ HERO ═══════ -->
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-amber-500/4 to-transparent" />
        <div class="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl" />
        <div class="relative px-4 lg:px-8 py-6 lg:py-8">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-2 flex-wrap">
              <Badge v-if="potholeLog.service" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-bold px-3 py-1 shadow-sm">
                <Icon name="i-lucide-construction" class="size-3 mr-1" />{{ potholeLog.service }}
              </Badge>
              <Badge v-if="potholeLog.item" variant="outline" class="text-[11px] font-medium bg-background/80 backdrop-blur-sm">
                {{ potholeLog.item }}
              </Badge>
            </div>
            <div v-if="potholeLog.estimate" class="shrink-0">
              <div class="rounded-lg bg-amber-500/5 border border-amber-500/15 px-4 py-2 backdrop-blur-sm">
                <p class="text-[9px] font-bold uppercase tracking-widest text-amber-500/70">
                  Estimate
                </p>
                <p class="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                  {{ potholeLog.estimate }}
                </p>
              </div>
            </div>
          </div>

          <h1 class="text-2xl lg:text-3xl font-black text-foreground leading-tight tracking-tight mb-2">
            {{ potholeLog.projectionLocation || potholeLog.scheduleTitle || 'Pothole Log' }}
          </h1>
          <div v-if="potholeLog.customerName" class="flex items-center gap-2 text-muted-foreground mb-6">
            <div class="size-6 rounded-md bg-muted flex items-center justify-center">
              <Icon name="i-lucide-building-2" class="size-3.5" />
            </div>
            <span class="text-sm font-medium">{{ potholeLog.customerName }}</span>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                <Icon name="i-lucide-calendar" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ fmtShortDate(potholeLog.date) }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Log Date
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
                <Icon name="i-lucide-construction" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ items.length }} pothole{{ items.length !== 1 ? 's' : '' }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Total Items
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
                <Icon name="i-lucide-layers" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ utilityTypeSummary.length }} type{{ utilityTypeSummary.length !== 1 ? 's' : '' }}
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Utility Types
                </p>
              </div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Icon name="i-lucide-image" class="size-5 text-white" />
              </div>
              <div>
                <p class="text-xs font-semibold">
                  {{ items.filter((i: any) => i.photo1 || i.photo2).length }} with photos
                </p>
                <p class="text-[10px] text-muted-foreground">
                  Documented
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
            :class="[activeTab === tab.id ? 'text-amber-600 dark:text-amber-400 border-amber-500 bg-amber-500/5' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50']"
            @click="activeTab = tab.id"
          >
            <Icon :name="tab.icon" class="size-3.5" />{{ tab.label }}
            <Badge v-if="tab.count !== null" variant="secondary" class="h-4 min-w-4 justify-center px-1 text-[9px] font-bold tabular-nums" :class="activeTab === tab.id ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : ''">
              {{ tab.count }}
            </Badge>
          </button>
        </div>
      </div>

      <!-- ═══════ TAB CONTENT ═══════ -->
      <div class="px-4 lg:px-8 py-6">
        <!-- ──── OVERVIEW TAB ──── -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Location -->
              <Card v-if="potholeLog.projectionLocation">
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-map-pin" class="size-4 text-amber-500" />Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="rounded-lg bg-amber-500/5 p-4 ring-1 ring-amber-500/15">
                    <p class="text-sm font-semibold">
                      {{ potholeLog.projectionLocation }}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <!-- Utility Breakdown -->
              <Card v-if="utilityTypeSummary.length > 0">
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-layers" class="size-4 text-amber-500" />Utility Type Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div
                      v-for="u in utilityTypeSummary" :key="u.type"
                      class="rounded-lg p-3 ring-1 ring-border/30 hover:shadow-sm transition-shadow flex items-center gap-3"
                      :class="getUtilityColor(u.type)"
                    >
                      <div class="size-9 rounded-lg flex items-center justify-center bg-background/50 shrink-0">
                        <Icon :name="getUtilityIcon(u.type)" class="size-4" />
                      </div>
                      <div>
                        <p class="text-xs font-bold">
                          {{ u.type }}
                        </p>
                        <p class="text-[10px] opacity-70">
                          {{ u.count }} pothole{{ u.count !== 1 ? 's' : '' }}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <!-- Created By -->
              <Card v-if="potholeLog.createdByName">
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-user" class="size-4 text-amber-500" />Created By
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div class="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <Avatar class="size-12 border-2 border-amber-500/20">
                      <AvatarImage v-if="potholeLog.createdByAvatar" :src="potholeLog.createdByAvatar" />
                      <AvatarFallback class="text-sm font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {{ getInitials(potholeLog.createdByName) }}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p class="text-sm font-bold">
                        {{ potholeLog.createdByName }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Author
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <!-- Right: Info Sidebar -->
            <div class="space-y-6">
              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-info" class="size-4 text-amber-500" />Log Info
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Date</span>
                    <span class="text-xs font-semibold">{{ fmtDate(potholeLog.date) }}</span>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Estimate</span>
                    <span class="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{{ potholeLog.estimate || '—' }}</span>
                  </div>
                  <Separator />
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Potholes</span>
                    <Badge variant="secondary" class="text-[10px] font-bold tabular-nums">{{ items.length }}</Badge>
                  </div>
                  <template v-if="potholeLog.scheduleTitle">
                    <Separator />
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">Schedule</span>
                      <NuxtLink
                        v-if="potholeLog.scheduleId"
                        :to="`/scheduled-jobs/detail/${potholeLog.scheduleId}`"
                        class="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline truncate max-w-[150px]"
                      >
                        {{ potholeLog.scheduleTitle }}
                      </NuxtLink>
                      <span v-else class="text-xs font-semibold truncate max-w-[150px]">{{ potholeLog.scheduleTitle }}</span>
                    </div>
                  </template>
                </CardContent>
              </Card>

              <Card>
                <CardHeader class="pb-3">
                  <CardTitle class="text-sm font-bold flex items-center gap-2">
                    <Icon name="i-lucide-clock" class="size-4 text-amber-500" />Timestamps
                  </CardTitle>
                </CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-muted-foreground">Created</span>
                    <span class="text-xs font-semibold">{{ fmtShortDate(potholeLog.createdAt) }}</span>
                  </div>
                  <template v-if="potholeLog.updatedAt">
                    <Separator />
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-muted-foreground">Updated</span>
                      <span class="text-xs font-semibold">{{ fmtShortDate(potholeLog.updatedAt) }}</span>
                    </div>
                  </template>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <!-- ──── POTHOLES TAB ──── -->
        <div v-else-if="activeTab === 'potholes'" class="space-y-4">
          <template v-if="items.length > 0">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="text-[11px]">
                      Pothole #
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Type of Utility
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Soil Type
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Top Depth
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Bottom Depth
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Pin
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Photo 1
                    </TableHead>
                    <TableHead class="text-[11px]">
                      Photo 2
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(item, idx) in items" :key="idx" class="hover:bg-accent/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" class="text-xs font-bold tabular-nums bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        {{ item.potholeNo || String(Number(idx) + 1) }}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        v-if="item.typeOfUtility"
                        variant="secondary"
                        class="text-[10px] font-bold"
                        :class="getUtilityColor(item.typeOfUtility)"
                      >
                        <Icon :name="getUtilityIcon(item.typeOfUtility)" class="size-3 mr-1" />
                        {{ item.typeOfUtility }}
                      </Badge>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell>
                      <Badge v-if="item.soilType" variant="secondary" class="text-[10px] font-normal">
                        {{ item.soilType }}
                      </Badge>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell class="text-xs tabular-nums font-semibold">
                      {{ item.topDepthOfUtility || '—' }}
                    </TableCell>
                    <TableCell class="text-xs tabular-nums font-semibold">
                      {{ item.bottomDepthOfUtility || '—' }}
                    </TableCell>
                    <TableCell class="text-xs">
                      {{ item.pin || '—' }}
                    </TableCell>
                    <TableCell>
                      <a v-if="item.photo1" :href="item.photo1" target="_blank" class="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline">
                        <Icon name="i-lucide-image" class="size-3.5" />
                        View
                      </a>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell>
                      <a v-if="item.photo2" :href="item.photo2" target="_blank" class="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline">
                        <Icon name="i-lucide-image" class="size-3.5" />
                        View
                      </a>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16">
            <div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon name="i-lucide-construction" class="size-7 text-muted-foreground/50" />
            </div>
            <h3 class="text-sm font-bold">
              No Pothole Items
            </h3>
            <p class="text-xs text-muted-foreground mt-1">
              No pothole items recorded for this log.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
