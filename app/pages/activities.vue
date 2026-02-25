<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Activities', icon: 'i-lucide-activity', description: 'Track all system events and actions' })

// ─── Types ───
interface Activity {
  _id: string
  legacy_id?: string
  user: any
  action: string
  type: string
  title: string
  entityId: any
  metadata: any
  createdAt: string
  updatedAt: string
}

// ─── State ───
const activities = ref<Activity[]>([])
const isLoading = ref(true)
const isSyncing = ref(false)
const searchQuery = ref('')
const selectedType = ref('all')

// ─── Fetch from Firebase ───
async function fetchActivities() {
  isLoading.value = true
  try {
    const res = await $fetch<any>('/api/activities')
    activities.value = res.activities || []
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Failed to load activities'
    toast.error('Error', { description: msg })
  }
  finally {
    isLoading.value = false
  }
}

// ─── Sync from MongoDB → Firebase ───
async function syncActivities() {
  if (isSyncing.value)
    return

  isSyncing.value = true
  try {
    const result = await $fetch<any>('/api/activities/sync', { method: 'POST' })
    toast.success(result.message, {
      description: `Created: ${result.stats.created} | Updated: ${result.stats.updated} | Duration: ${result.stats.duration}ms`,
    })
    // Reload from Firebase after sync
    await fetchActivities()
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Sync failed'
    toast.error('Activity sync failed', { description: msg })
  }
  finally {
    isSyncing.value = false
  }
}

// ─── Derived ───
const activityTypes = computed(() => {
  const types = new Set(activities.value.map(a => a.type).filter(Boolean))
  return ['all', ...Array.from(types).sort()]
})

const filteredActivities = computed(() => {
  let result = activities.value

  // Filter by type
  if (selectedType.value !== 'all') {
    result = result.filter(a => a.type === selectedType.value)
  }

  // Filter by search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      (a.title || '').toLowerCase().includes(q)
      || (a.action || '').toLowerCase().includes(q)
      || (a.type || '').toLowerCase().includes(q)
      || (typeof a.user === 'string' && a.user.toLowerCase().includes(q))
      || (a.user?.name && a.user.name.toLowerCase().includes(q)),
    )
  }

  return result
})

// ─── Stats ───
const stats = computed(() => {
  const total = activities.value.length
  const types = new Set(activities.value.map(a => a.type).filter(Boolean)).size
  const actions = new Set(activities.value.map(a => a.action).filter(Boolean)).size
  const today = new Date().toDateString()
  const todayCount = activities.value.filter((a) => {
    try { return new Date(a.createdAt).toDateString() === today }
    catch { return false }
  }).length
  return { total, types, actions, todayCount }
})

// ─── Helpers ───
function getActionConfig(action: string): { icon: string, color: string, bg: string } {
  const map: Record<string, { icon: string, color: string, bg: string }> = {
    create: { icon: 'i-lucide-plus-circle', color: 'text-emerald-500', bg: 'bg-emerald-500' },
    created: { icon: 'i-lucide-plus-circle', color: 'text-emerald-500', bg: 'bg-emerald-500' },
    update: { icon: 'i-lucide-pencil', color: 'text-blue-500', bg: 'bg-blue-500' },
    updated: { icon: 'i-lucide-pencil', color: 'text-blue-500', bg: 'bg-blue-500' },
    delete: { icon: 'i-lucide-trash-2', color: 'text-rose-500', bg: 'bg-rose-500' },
    deleted: { icon: 'i-lucide-trash-2', color: 'text-rose-500', bg: 'bg-rose-500' },
    login: { icon: 'i-lucide-log-in', color: 'text-violet-500', bg: 'bg-violet-500' },
    logout: { icon: 'i-lucide-log-out', color: 'text-amber-500', bg: 'bg-amber-500' },
    view: { icon: 'i-lucide-eye', color: 'text-cyan-500', bg: 'bg-cyan-500' },
    viewed: { icon: 'i-lucide-eye', color: 'text-cyan-500', bg: 'bg-cyan-500' },
    status: { icon: 'i-lucide-badge-check', color: 'text-teal-500', bg: 'bg-teal-500' },
    assign: { icon: 'i-lucide-user-plus', color: 'text-indigo-500', bg: 'bg-indigo-500' },
    assigned: { icon: 'i-lucide-user-plus', color: 'text-indigo-500', bg: 'bg-indigo-500' },
    comment: { icon: 'i-lucide-message-square', color: 'text-pink-500', bg: 'bg-pink-500' },
    upload: { icon: 'i-lucide-upload', color: 'text-orange-500', bg: 'bg-orange-500' },
    sync: { icon: 'i-lucide-refresh-cw', color: 'text-sky-500', bg: 'bg-sky-500' },
    export: { icon: 'i-lucide-download', color: 'text-lime-500', bg: 'bg-lime-500' },
    import: { icon: 'i-lucide-upload', color: 'text-purple-500', bg: 'bg-purple-500' },
  }
  const key = (action || '').toLowerCase()
  return map[key] || { icon: 'i-lucide-zap', color: 'text-gray-400', bg: 'bg-gray-500' }
}

function getTypeConfig(type: string): { icon: string, color: string } {
  const map: Record<string, { icon: string, color: string }> = {
    estimate: { icon: 'i-lucide-scroll-text', color: 'text-violet-400' },
    schedule: { icon: 'i-lucide-calendar-days', color: 'text-cyan-400' },
    task: { icon: 'i-lucide-kanban', color: 'text-amber-400' },
    employee: { icon: 'i-lucide-user-round', color: 'text-emerald-400' },
    client: { icon: 'i-lucide-building-2', color: 'text-blue-400' },
    djt: { icon: 'i-lucide-clipboard-list', color: 'text-orange-400' },
    jha: { icon: 'i-lucide-shield-alert', color: 'text-rose-400' },
    document: { icon: 'i-lucide-file', color: 'text-purple-400' },
    receipt: { icon: 'i-lucide-receipt', color: 'text-lime-400' },
    invoice: { icon: 'i-lucide-receipt', color: 'text-yellow-400' },
    billing: { icon: 'i-lucide-credit-card', color: 'text-pink-400' },
    auth: { icon: 'i-lucide-shield', color: 'text-red-400' },
    system: { icon: 'i-lucide-settings', color: 'text-gray-400' },
  }
  const key = (type || '').toLowerCase()
  return map[key] || { icon: 'i-lucide-box', color: 'text-muted-foreground' }
}

function getUserName(user: any): string {
  if (!user)
    return 'System'
  if (typeof user === 'string')
    return user
  return user.name || user.email || user.displayName || 'Unknown User'
}

function getUserInitials(user: any): string {
  const name = getUserName(user)
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-amber-600',
    'bg-rose-600',
    'bg-cyan-600',
    'bg-indigo-600',
    'bg-pink-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length] ?? 'bg-blue-600'
}

function formatDate(dateStr: string) {
  if (!dateStr)
    return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1)
      return 'Just now'
    if (diffMin < 60)
      return `${diffMin}m ago`
    if (diffHr < 24)
      return `${diffHr}h ago`
    if (diffDay < 7)
      return `${diffDay}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  catch { return dateStr }
}

function formatFullDate(dateStr: string) {
  if (!dateStr)
    return ''
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }
  catch { return dateStr }
}

onMounted(() => fetchActivities())
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Teleport refresh button into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5"
          :disabled="isSyncing"
          @click="syncActivities"
        >
          <Icon
            name="i-lucide-refresh-cw"
            class="size-3.5"
            :class="{ 'animate-spin': isSyncing }"
          />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- ─── Stats Cards ─── -->
    <div class="shrink-0 px-6 pt-5 pb-4">
      <div class="grid grid-cols-4 gap-3">
        <div class="rounded-xl border bg-card p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-2">
              <div class="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Icon name="i-lucide-activity" class="size-4 text-emerald-500" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums">
              {{ stats.total.toLocaleString() }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Total Activities
            </p>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-2">
              <div class="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Icon name="i-lucide-calendar-check" class="size-4 text-blue-500" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums">
              {{ stats.todayCount.toLocaleString() }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Today
            </p>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-2">
              <div class="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Icon name="i-lucide-layers" class="size-4 text-violet-500" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums">
              {{ stats.types }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Entity Types
            </p>
          </div>
        </div>

        <div class="rounded-xl border bg-card p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div class="relative">
            <div class="flex items-center gap-2 mb-2">
              <div class="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Icon name="i-lucide-zap" class="size-4 text-amber-500" />
              </div>
            </div>
            <p class="text-2xl font-bold tabular-nums">
              {{ stats.actions }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Action Types
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Filters ─── -->
    <div class="shrink-0 px-6 pb-4 flex items-center gap-3">
      <div class="relative flex-1 max-w-sm">
        <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search activities..."
          class="h-9 pl-9 text-sm bg-muted/30"
        />
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        <Button
          v-for="t in activityTypes"
          :key="t"
          variant="outline"
          size="sm"
          class="h-7 text-xs px-2.5 transition-all"
          :class="{
            'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground shadow-sm': selectedType === t,
          }"
          @click="selectedType = t"
        >
          <Icon v-if="t !== 'all'" :name="getTypeConfig(t).icon" class="size-3 mr-1" />
          {{ t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) }}
        </Button>
      </div>
      <div class="ml-auto text-xs text-muted-foreground tabular-nums">
        {{ filteredActivities.length }} result{{ filteredActivities.length !== 1 ? 's' : '' }}
      </div>
    </div>

    <!-- ─── Activity Feed ─── -->
    <div class="flex-1 overflow-y-auto px-6 pb-6">
      <!-- Loading -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 gap-3">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-primary/60" />
        <p class="text-sm text-muted-foreground">
          Loading activities...
        </p>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredActivities.length === 0" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="size-20 rounded-2xl bg-muted/40 flex items-center justify-center">
          <Icon name="i-lucide-activity" class="size-10 text-muted-foreground/40" />
        </div>
        <div class="text-center">
          <p class="text-sm font-medium">
            {{ activities.length === 0 ? 'No activities yet' : 'No matching activities' }}
          </p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ activities.length === 0 ? 'Click Refresh to sync activities from the database' : 'Try adjusting your search or filters' }}
          </p>
        </div>
        <Button v-if="activities.length === 0" variant="outline" size="sm" class="gap-1.5" @click="syncActivities">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          Sync Activities
        </Button>
      </div>

      <!-- Timeline Feed -->
      <div v-else class="relative max-w-4xl mx-auto">
        <!-- Vertical line -->
        <div class="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

        <div
          v-for="(activity, idx) in filteredActivities"
          :key="activity._id"
          class="relative pl-12 pb-1 group"
          :style="{ animationDelay: `${Math.min(idx, 20) * 30}ms` }"
        >
          <!-- Timeline Dot -->
          <div
            class="absolute left-[8px] top-3 size-[24px] rounded-full flex items-center justify-center ring-4 ring-background z-10 transition-all duration-200 group-hover:scale-110 group-hover:ring-primary/10"
            :class="getActionConfig(activity.action).bg"
          >
            <Icon :name="getActionConfig(activity.action).icon" class="size-3 text-white" />
          </div>

          <!-- Card -->
          <div class="rounded-xl border bg-card px-4 py-3 transition-all duration-200 group-hover:bg-accent/30 group-hover:shadow-sm group-hover:border-primary/20 mb-2">
            <div class="flex items-start justify-between gap-4">
              <!-- Left Side -->
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <!-- User Avatar -->
                <div
                  class="size-9 shrink-0 rounded-full flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                  :class="getAvatarColor(getUserName(activity.user))"
                >
                  {{ getUserInitials(activity.user) }}
                </div>

                <!-- Content -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium">{{ getUserName(activity.user) }}</span>
                    <Badge variant="outline" class="h-5 px-1.5 text-[10px] font-medium gap-1" :class="getActionConfig(activity.action).color">
                      <Icon :name="getActionConfig(activity.action).icon" class="size-2.5" />
                      {{ activity.action }}
                    </Badge>
                    <Badge v-if="activity.type" variant="secondary" class="h-5 px-1.5 text-[10px] font-medium gap-1">
                      <Icon :name="getTypeConfig(activity.type).icon" class="size-2.5" :class="getTypeConfig(activity.type).color" />
                      {{ activity.type }}
                    </Badge>
                  </div>

                  <p v-if="activity.title" class="text-sm text-foreground/80 mt-1 leading-snug">
                    {{ activity.title }}
                  </p>

                  <!-- Metadata preview -->
                  <div v-if="activity.metadata && typeof activity.metadata === 'object'" class="mt-2 flex flex-wrap gap-1.5">
                    <template v-for="(val, key) in activity.metadata" :key="key">
                      <Badge
                        v-if="val && typeof val !== 'object'"
                        variant="outline"
                        class="h-5 text-[9px] font-normal text-muted-foreground px-1.5"
                      >
                        <span class="font-medium text-foreground/60 mr-1">{{ key }}:</span>
                        {{ String(val).slice(0, 40) }}
                      </Badge>
                    </template>
                  </div>

                  <!-- Entity ID -->
                  <p v-if="activity.entityId" class="text-[10px] text-muted-foreground/60 mt-1.5 font-mono">
                    #{{ typeof activity.entityId === 'string' ? activity.entityId.slice(-8) : activity.entityId }}
                  </p>
                </div>
              </div>

              <!-- Right: Timestamp -->
              <div class="shrink-0 text-right">
                <p class="text-[11px] text-muted-foreground font-medium whitespace-nowrap" :title="formatFullDate(activity.createdAt)">
                  {{ formatDate(activity.createdAt) }}
                </p>
                <p v-if="activity.createdAt" class="text-[9px] text-muted-foreground/50 mt-0.5 whitespace-nowrap">
                  {{ formatFullDate(activity.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
