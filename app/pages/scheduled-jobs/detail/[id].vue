<script setup lang="ts">
import { format } from 'date-fns'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const { setHeader } = usePageHeader()

const scheduleId = computed(() => route.params.id as string)

// ─── Fetch schedule detail ───
const schedule = ref<any>(null)
const timeCards = ref<any[]>([])
const djt = ref<any>(null)
const jha = ref<any>(null)
const tasks = ref<any[]>([])
const chats = ref<any[]>([])
const isLoading = ref(true)
const fetchError = ref<string | null>(null)

async function fetchScheduleDetail() {
  isLoading.value = true
  fetchError.value = null
  try {
    const res = await $fetch<any>(`/api/schedules/${scheduleId.value}`)
    schedule.value = res.schedule
    timeCards.value = res.timeCards || []
    djt.value = res.djt || null
    jha.value = res.jha || null
    tasks.value = res.tasks || []
    chats.value = res.chats || []
  }
  catch (err: any) {
    fetchError.value = err?.data?.message || err?.message || 'Failed to load schedule'
    toast.error('Failed to load schedule details')
  }
  finally {
    isLoading.value = false
  }
}

fetchScheduleDetail()

watchEffect(() => {
  setHeader({
    title: schedule.value?.title || 'Schedule Detail',
    icon: 'i-lucide-calendar-check',
  })
})

const activeTab = ref('overview')

// ─── Helpers ───
function fmtTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    if (dateStr.includes('T')) {
      const tp = dateStr.split('T')[1]
      if (tp) {
        const [h, m] = tp.split(':')
        const hr = parseInt(h || '0', 10)
        const ampm = hr >= 12 ? 'PM' : 'AM'
        const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
        return `${h12}:${m} ${ampm}`
      }
    }
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  catch { return dateStr }
}

function fmtShortDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    if (dateStr.includes('T')) return format(new Date(dateStr), 'MM/dd/yyyy')
    const [y, m, d] = dateStr.split('-').map(Number)
    return format(new Date(y!, m! - 1, d!), 'MM/dd/yyyy')
  }
  catch { return dateStr }
}

function fmtLongDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    if (dateStr.includes('T')) return format(new Date(dateStr), 'MMM d, yyyy')
    const [y, m, d] = dateStr.split('-').map(Number)
    return format(new Date(y!, m! - 1, d!), 'MMM d, yyyy')
  }
  catch { return dateStr }
}

function extractDateStr(dateStr: string | null): string {
  if (!dateStr) return ''
  if (dateStr.includes('T')) return dateStr.split('T')[0] || ''
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10)
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) {
    const [, mm, dd, yyyy] = usMatch
    return `${yyyy}-${mm!.padStart(2, '0')}-${dd!.padStart(2, '0')}`
  }
  return dateStr
}

function getInitials(name: string) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length] ?? 'bg-blue-500'
}

function toNum(val: any): number {
  if (val == null) return 0
  if (typeof val === 'number') return val
  return Number(String(val).replace(/[^0-9.\-]/g, '')) || 0
}

function fmtNum(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtMoney(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return fmtLongDate(dateStr)
  }
  catch { return dateStr }
}

// ─── Computed stats ───
const totalCrewSize = computed(() => schedule.value?.assigneeDetails?.length || 0)
const totalTimeCardHours = computed(() => timeCards.value.reduce((s, tc) => s + toNum(tc.hours), 0))
const totalSiteHours = computed(() => timeCards.value.filter(tc => (tc.type || '').toUpperCase() === 'SITE TIME').reduce((s, tc) => s + toNum(tc.hours), 0))
const totalDriveHours = computed(() => timeCards.value.filter(tc => (tc.type || '').toUpperCase() === 'DRIVE TIME').reduce((s, tc) => s + toNum(tc.hours), 0))
const totalDistance = computed(() => timeCards.value.filter(tc => (tc.type || '').toUpperCase() === 'DRIVE TIME').reduce((s, tc) => s + toNum(tc.distance), 0))

const scheduleDurationHours = computed(() => {
  const s = schedule.value
  if (!s?.fromDate || !s?.toDate) return null
  try {
    const from = new Date(s.fromDate).getTime()
    const to = new Date(s.toDate).getTime()
    if (isNaN(from) || isNaN(to)) return null
    return ((to - from) / (1000 * 60 * 60)).toFixed(1)
  }
  catch { return null }
})

// JHA analysis
const jhaSignedCount = computed(() => jha.value?.signatures?.length || 0)
const jhaAssigneeCount = computed(() => jha.value?.assigneeCount || 0)

// Tasks status breakdown
const todoTasks = computed(() => tasks.value.filter(t => (t.status || 'todo').toLowerCase() === 'todo'))
const doneTasks = computed(() => tasks.value.filter(t => (t.status || '').toLowerCase() === 'done'))

// Chat messages sorted by date
const sortedChats = computed(() => {
  return [...chats.value].sort((a, b) => {
    const da = new Date(a.createdAt || a.timestamp || 0).getTime()
    const db = new Date(b.createdAt || b.timestamp || 0).getTime()
    return da - db
  })
})

// Tabs
const tabs = computed(() => [
  { id: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard', count: null },
  { id: 'crew', label: 'Crew', icon: 'i-lucide-users', count: totalCrewSize.value },
  { id: 'timecards', label: 'Time Cards', icon: 'i-lucide-timer', count: timeCards.value.length },
  { id: 'djt', label: 'Job Ticket', icon: 'i-lucide-clipboard-list', count: djt.value ? 1 : 0 },
  { id: 'jha', label: 'JHA', icon: 'i-lucide-shield-alert', count: jha.value ? 1 : 0 },
  { id: 'tasks', label: 'Tasks', icon: 'i-lucide-check-square', count: tasks.value.length },
  { id: 'chats', label: 'Chats', icon: 'i-lucide-message-circle', count: chats.value.length },
])
</script>

<template>
  <div class="min-h-full">
    <ClientOnly>
      <Teleport to="#header-actions">
        <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="size-3" />
          Back
        </Button>
        <Button variant="ghost" size="sm" class="h-7 text-xs gap-1" :disabled="isLoading" @click="fetchScheduleDetail()">
          <Icon name="i-lucide-refresh-cw" class="size-3" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center h-96">
      <div class="flex flex-col items-center gap-4">
        <div class="relative">
          <div class="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <div class="absolute inset-0 flex items-center justify-center">
            <Icon name="i-lucide-calendar-check" class="size-6 text-primary/60" />
          </div>
        </div>
        <p class="text-sm text-muted-foreground animate-pulse">Loading schedule details...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="flex items-center justify-center h-96">
      <div class="flex flex-col items-center gap-4 text-center max-w-sm">
        <div class="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <Icon name="i-lucide-alert-triangle" class="size-8 text-destructive" />
        </div>
        <div>
          <h3 class="text-lg font-bold">Failed to Load</h3>
          <p class="text-sm text-muted-foreground mt-1">{{ fetchError }}</p>
        </div>
        <Button variant="outline" @click="fetchScheduleDetail()">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-4" />
          Try Again
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="schedule" class="pb-8">
      <!-- ═══════ HERO ═══════ -->
      <div class="relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent" />
        <div class="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
        <div class="relative px-4 lg:px-8 py-6 lg:py-8">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div class="flex items-center gap-2 flex-wrap">
              <Badge v-if="schedule.service" class="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1 shadow-sm">
                <Icon name="i-lucide-hard-hat" class="size-3 mr-1" />{{ schedule.service }}
              </Badge>
              <Badge v-if="schedule.item" variant="outline" class="text-[11px] font-medium bg-background/80 backdrop-blur-sm">{{ schedule.item }}</Badge>
              <Badge v-if="schedule.perDiem" variant="secondary" class="text-[10px] h-6 gap-1 font-bold"><Icon name="i-lucide-coins" class="size-3" />Per Diem</Badge>
              <Badge v-if="schedule.notifyAssignees" variant="secondary" class="text-[10px] h-6 gap-1 font-bold"><Icon name="i-lucide-bell" class="size-3" />Notify</Badge>
            </div>
            <div v-if="schedule.estimate" class="shrink-0">
              <div class="rounded-lg bg-primary/5 border border-primary/15 px-4 py-2 backdrop-blur-sm">
                <p class="text-[9px] font-bold uppercase tracking-widest text-primary/70">Estimate</p>
                <p class="text-lg font-black text-primary tabular-nums tracking-tight">{{ schedule.estimate }}</p>
              </div>
            </div>
          </div>
          <h1 class="text-2xl lg:text-3xl font-black text-foreground leading-tight tracking-tight mb-2">{{ schedule.title || 'Untitled' }}</h1>
          <div v-if="schedule.customerName" class="flex items-center gap-2 text-muted-foreground mb-6">
            <div class="size-6 rounded-md bg-muted flex items-center justify-center"><Icon name="i-lucide-building-2" class="size-3.5" /></div>
            <span class="text-sm font-medium">{{ schedule.customerName }}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20"><Icon name="i-lucide-calendar" class="size-5 text-white" /></div>
              <div><p class="text-xs font-semibold">{{ fmtLongDate(schedule.fromDate) }}</p><p class="text-[10px] text-muted-foreground">Schedule Date</p></div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20"><Icon name="i-lucide-clock" class="size-5 text-white" /></div>
              <div><p class="text-xs font-semibold">{{ fmtTime(schedule.fromDate) }} – {{ fmtTime(schedule.toDate) }}</p><p class="text-[10px] text-muted-foreground">{{ scheduleDurationHours ? `${scheduleDurationHours} hrs` : 'Work Hours' }}</p></div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20"><Icon name="i-lucide-users" class="size-5 text-white" /></div>
              <div><p class="text-xs font-semibold">{{ totalCrewSize }} members</p><p class="text-[10px] text-muted-foreground">Crew Size</p></div>
            </div>
            <div class="rounded-xl bg-card/80 backdrop-blur-sm border shadow-sm p-4 flex items-center gap-3">
              <div class="size-11 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20"><Icon name="i-lucide-timer" class="size-5 text-white" /></div>
              <div><p class="text-xs font-semibold">{{ fmtNum(totalTimeCardHours) }} hrs</p><p class="text-[10px] text-muted-foreground">Time Logged</p></div>
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
            :class="[activeTab === tab.id ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-accent/50']"
            @click="activeTab = tab.id"
          >
            <Icon :name="tab.icon" class="size-3.5" />{{ tab.label }}
            <Badge v-if="tab.count !== null" variant="secondary" class="h-4 min-w-4 justify-center px-1 text-[9px] font-bold tabular-nums" :class="activeTab === tab.id ? 'bg-primary/15 text-primary' : ''">{{ tab.count }}</Badge>
          </button>
        </div>
      </div>

      <!-- ═══════ TAB CONTENT ═══════ -->
      <div class="px-4 lg:px-8 py-6">

        <!-- ──── OVERVIEW ──── -->
        <div v-if="activeTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6">
              <!-- Leadership -->
              <Card>
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-shield-check" class="size-4 text-primary" />Leadership</CardTitle></CardHeader>
                <CardContent class="space-y-4">
                  <div v-if="schedule.projectManagerName" class="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar class="size-12 border-2 border-primary/20"><AvatarImage v-if="schedule.projectManagerAvatar" :src="schedule.projectManagerAvatar" /><AvatarFallback class="text-sm font-bold bg-primary/10 text-primary">{{ getInitials(schedule.projectManagerName) }}</AvatarFallback></Avatar>
                    <div class="flex-1 min-w-0"><p class="text-sm font-bold">{{ schedule.projectManagerName }}</p><p class="text-xs text-muted-foreground">Project Manager</p></div>
                    <Badge variant="outline" class="text-[10px] font-bold bg-primary/5 text-primary border-primary/20 shrink-0">PM</Badge>
                  </div>
                  <div v-if="schedule.foremanDisplayName" class="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <Avatar class="size-12 border-2 border-amber-500/20"><AvatarImage v-if="schedule.foremanAvatar" :src="schedule.foremanAvatar" /><AvatarFallback class="text-sm font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">{{ getInitials(schedule.foremanDisplayName) }}</AvatarFallback></Avatar>
                    <div class="flex-1 min-w-0"><p class="text-sm font-bold">{{ schedule.foremanDisplayName }}</p><p class="text-xs text-muted-foreground">Foreman</p></div>
                    <Badge variant="outline" class="text-[10px] font-bold bg-amber-500/5 text-amber-600 border-amber-500/20 dark:text-amber-400 shrink-0">Foreman</Badge>
                  </div>
                  <div v-if="!schedule.projectManagerName && !schedule.foremanDisplayName" class="text-xs text-muted-foreground italic py-4 text-center">No leadership assigned</div>
                </CardContent>
              </Card>
              <!-- Description -->
              <Card v-if="schedule.description">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-file-text" class="size-4 text-primary" />Job Description</CardTitle></CardHeader>
                <CardContent><p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ schedule.description }}</p></CardContent>
              </Card>
              <!-- Hours Breakdown -->
              <Card v-if="timeCards.length > 0">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-bar-chart-3" class="size-4 text-primary" />Hours Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div class="grid grid-cols-3 gap-4">
                    <div class="rounded-lg bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 ring-1 ring-emerald-500/15">
                      <div class="flex items-center gap-2 mb-2"><div class="size-7 rounded-md bg-emerald-500/15 flex items-center justify-center"><Icon name="i-lucide-map-pin" class="size-3.5 text-emerald-500" /></div><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Site</p></div>
                      <p class="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{{ fmtNum(totalSiteHours) }}</p><p class="text-[10px] text-muted-foreground">hours</p>
                    </div>
                    <div class="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 ring-1 ring-blue-500/15">
                      <div class="flex items-center gap-2 mb-2"><div class="size-7 rounded-md bg-blue-500/15 flex items-center justify-center"><Icon name="i-lucide-car" class="size-3.5 text-blue-500" /></div><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Drive</p></div>
                      <p class="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{{ fmtNum(totalDriveHours) }}</p><p class="text-[10px] text-muted-foreground">hours</p>
                    </div>
                    <div class="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-4 ring-1 ring-amber-500/15">
                      <div class="flex items-center gap-2 mb-2"><div class="size-7 rounded-md bg-amber-500/15 flex items-center justify-center"><Icon name="i-lucide-route" class="size-3.5 text-amber-500" /></div><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p></div>
                      <p class="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{{ fmtNum(totalDistance, 1) }}</p><p class="text-[10px] text-muted-foreground">miles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <!-- Right sidebar -->
            <div class="space-y-6">
              <Card>
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-info" class="size-4 text-primary" />Schedule Info</CardTitle></CardHeader>
                <CardContent class="space-y-3">
                  <div v-if="schedule.status" class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Status</span><Badge variant="outline" class="text-[10px] font-bold">{{ schedule.status }}</Badge></div>
                  <Separator /><div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Date</span><span class="text-xs font-semibold">{{ fmtLongDate(schedule.fromDate) }}</span></div>
                  <Separator /><div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Start</span><span class="text-xs font-semibold">{{ fmtTime(schedule.fromDate) }}</span></div>
                  <Separator /><div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">End</span><span class="text-xs font-semibold">{{ fmtTime(schedule.toDate) }}</span></div>
                  <template v-if="scheduleDurationHours"><Separator /><div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Duration</span><span class="text-xs font-semibold tabular-nums">{{ scheduleDurationHours }} hrs</span></div></template>
                  <template v-if="schedule.estimate"><Separator /><div class="flex items-center justify-between"><span class="text-xs text-muted-foreground">Estimate</span><span class="text-xs font-bold text-primary tabular-nums">{{ schedule.estimate }}</span></div></template>
                </CardContent>
              </Card>
              <Card>
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-flag" class="size-4 text-primary" />Flags</CardTitle></CardHeader>
                <CardContent class="space-y-3">
                  <div class="flex items-center justify-between"><div class="flex items-center gap-2"><Icon name="i-lucide-coins" class="size-4 text-amber-500" /><span class="text-xs">Per Diem</span></div><Badge :variant="schedule.perDiem ? 'default' : 'secondary'" class="text-[10px] font-bold">{{ schedule.perDiem ? 'Yes' : 'No' }}</Badge></div>
                  <Separator /><div class="flex items-center justify-between"><div class="flex items-center gap-2"><Icon name="i-lucide-bell" class="size-4 text-blue-500" /><span class="text-xs">Notify</span></div><Badge :variant="schedule.notifyAssignees ? 'default' : 'secondary'" class="text-[10px] font-bold">{{ schedule.notifyAssignees ? 'Yes' : 'No' }}</Badge></div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <!-- ──── CREW ──── -->
        <div v-else-if="activeTab === 'crew'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="schedule.projectManagerName" class="group rounded-xl border bg-card/80 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div class="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />
              <div class="p-5 flex items-center gap-4">
                <Avatar class="size-14 border-2 border-primary/20 ring-4 ring-primary/10"><AvatarImage v-if="schedule.projectManagerAvatar" :src="schedule.projectManagerAvatar" /><AvatarFallback class="text-lg font-bold bg-primary/10 text-primary">{{ getInitials(schedule.projectManagerName) }}</AvatarFallback></Avatar>
                <div class="flex-1 min-w-0"><p class="text-base font-bold group-hover:text-primary transition-colors">{{ schedule.projectManagerName }}</p><p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Icon name="i-lucide-shield-check" class="size-3 text-primary" />Project Manager</p></div>
              </div>
            </div>
            <div v-if="schedule.foremanDisplayName" class="group rounded-xl border bg-card/80 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div class="h-1.5 bg-gradient-to-r from-amber-500 via-amber-500/70 to-amber-500/30" />
              <div class="p-5 flex items-center gap-4">
                <Avatar class="size-14 border-2 border-amber-500/20 ring-4 ring-amber-500/10"><AvatarImage v-if="schedule.foremanAvatar" :src="schedule.foremanAvatar" /><AvatarFallback class="text-lg font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">{{ getInitials(schedule.foremanDisplayName) }}</AvatarFallback></Avatar>
                <div class="flex-1 min-w-0"><p class="text-base font-bold group-hover:text-amber-500 transition-colors">{{ schedule.foremanDisplayName }}</p><p class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Icon name="i-lucide-hard-hat" class="size-3 text-amber-500" />Foreman</p></div>
              </div>
            </div>
          </div>
          <Card v-if="schedule.assigneeDetails?.length > 0">
            <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-users" class="size-4 text-primary" />Crew Members<Badge variant="secondary" class="text-[10px] font-bold ml-auto">{{ schedule.assigneeDetails.length }}</Badge></CardTitle></CardHeader>
            <CardContent>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div v-for="(member, idx) in schedule.assigneeDetails" :key="member.id || idx" class="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all duration-200 hover:shadow-sm group cursor-default">
                  <Avatar class="size-10 border group-hover:border-primary/30 transition-colors"><AvatarImage v-if="member.avatar" :src="member.avatar" /><AvatarFallback class="text-xs font-bold text-white" :class="getAvatarColor(member.name)">{{ getInitials(member.name) }}</AvatarFallback></Avatar>
                  <div class="flex-1 min-w-0"><p class="text-sm font-semibold truncate group-hover:text-primary transition-colors">{{ member.name }}</p><p class="text-[10px] text-muted-foreground">Crew Member</p></div>
                  <div class="size-6 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">{{ Number(idx) + 1 }}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div v-if="!schedule.assigneeDetails?.length" class="flex flex-col items-center justify-center py-16"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-users" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No Crew Assigned</h3></div>
        </div>

        <!-- ──── TIME CARDS (same table as main time cards view) ──── -->
        <div v-else-if="activeTab === 'timecards'" class="space-y-4">
          <template v-if="timeCards.length > 0">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</p><p class="text-lg font-black tabular-nums">{{ timeCards.length }}</p></div>
              <div class="rounded-lg bg-emerald-500/5 p-3 ring-1 ring-emerald-500/15"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Site Hours</p><p class="text-lg font-black tabular-nums text-emerald-600 dark:text-emerald-400">{{ fmtNum(totalSiteHours) }}</p></div>
              <div class="rounded-lg bg-blue-500/5 p-3 ring-1 ring-blue-500/15"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Drive Hours</p><p class="text-lg font-black tabular-nums text-blue-600 dark:text-blue-400">{{ fmtNum(totalDriveHours) }}</p></div>
              <div class="rounded-lg bg-amber-500/5 p-3 ring-1 ring-amber-500/15"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Distance</p><p class="text-lg font-black tabular-nums text-amber-600 dark:text-amber-400">{{ fmtNum(totalDistance, 1) }} mi</p></div>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead class="text-[11px]">Employee</TableHead>
                    <TableHead class="text-[11px]">Date</TableHead>
                    <TableHead class="text-[11px]">Type</TableHead>
                    <TableHead class="text-[11px]">In / Dump</TableHead>
                    <TableHead class="text-[11px]">Out / Shop</TableHead>
                    <TableHead class="text-[11px] text-right">Hours</TableHead>
                    <TableHead class="text-[11px] text-right">Distance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="(tc, idx) in timeCards" :key="tc._id || idx" class="hover:bg-accent/50 transition-colors">
                    <TableCell>
                      <div class="flex items-center gap-2">
                        <div class="size-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" :class="getAvatarColor(tc.employeeName || '')">{{ getInitials(tc.employeeName || '?') }}</div>
                        <span class="text-xs font-medium truncate max-w-[120px]">{{ tc.employeeName || '—' }}</span>
                      </div>
                    </TableCell>
                    <TableCell class="text-xs tabular-nums">{{ fmtShortDate(extractDateStr(tc.clockIn) || extractDateStr(tc.scheduleDate) || extractDateStr(tc.createdAt)) }}</TableCell>
                    <TableCell>
                      <Badge v-if="tc.type" variant="outline" class="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">{{ (tc.type || '').toUpperCase() }}</Badge>
                      <span v-else class="text-xs text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell class="text-xs tabular-nums">
                      <template v-if="(tc.type || '').toUpperCase() === 'DRIVE TIME'">
                        <span class="flex items-center gap-1"><Icon name="i-lucide-droplets" class="size-3 text-amber-500" />{{ tc.dumpQty || 0 }}</span>
                      </template>
                      <template v-else>{{ fmtTime(tc.clockIn) }}</template>
                    </TableCell>
                    <TableCell class="text-xs tabular-nums">
                      <template v-if="(tc.type || '').toUpperCase() === 'DRIVE TIME'">
                        <span class="flex items-center gap-1"><Icon name="i-lucide-wrench" class="size-3 text-blue-500" />{{ tc.shopQty || 0 }}</span>
                      </template>
                      <template v-else>{{ fmtTime(tc.clockOut) }}</template>
                    </TableCell>
                    <TableCell class="text-right text-xs font-semibold tabular-nums text-primary">{{ fmtNum(toNum(tc.hours)) }}</TableCell>
                    <TableCell class="text-right text-xs tabular-nums" :class="(tc.type || '').toUpperCase() === 'SITE TIME' ? '' : 'text-muted-foreground'">
                      {{ (tc.type || '').toUpperCase() === 'SITE TIME' ? '—' : fmtNum(toNum(tc.distance), 1) }}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16 text-center"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-timer" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No Time Cards</h3><p class="text-xs text-muted-foreground mt-1">No time cards logged for this schedule.</p></div>
        </div>

        <!-- ──── JOB TICKET (single DJT detail) ──── -->
        <div v-else-if="activeTab === 'djt'">
          <template v-if="djt">
            <div class="space-y-6">
              <!-- DJT Header -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20"><Icon name="i-lucide-clipboard-list" class="size-5 text-white" /></div>
                  <div><h2 class="text-base font-bold">Daily Job Ticket</h2><p class="text-xs text-muted-foreground">{{ djt.scheduleTitle || schedule.title }}</p></div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge v-if="djt.hasCustomerSignature" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"><Icon name="i-lucide-check-circle" class="size-3 mr-1" />Customer Signed</Badge>
                  <Badge v-else variant="secondary" class="text-[10px] font-bold"><Icon name="i-lucide-alert-circle" class="size-3 mr-1" />Unsigned</Badge>
                </div>
              </div>
              <!-- DJT Stats -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</p><p class="text-lg font-black tabular-nums">{{ fmtMoney(toNum(djt.djtCost)) }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signatures</p><p class="text-lg font-black tabular-nums">{{ djt.signatureCount || 0 }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Images</p><p class="text-lg font-black tabular-nums">{{ djt.imageCount || 0 }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Equipment</p><p class="text-lg font-black tabular-nums">{{ djt.equipmentCount || 0 }}</p></div>
              </div>
              <!-- Daily Job Description -->
              <Card v-if="djt.dailyJobDescription">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-file-text" class="size-4 text-orange-500" />Daily Job Description</CardTitle></CardHeader>
                <CardContent><p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ djt.dailyJobDescription }}</p></CardContent>
              </Card>
              <!-- Equipment -->
              <Card v-if="djt.equipmentUsed?.length > 0">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-truck" class="size-4 text-blue-500" />Equipment Used<Badge variant="secondary" class="text-[10px] font-bold ml-auto">{{ djt.equipmentUsed.length }}</Badge></CardTitle></CardHeader>
                <CardContent>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div v-for="(eq, idx) in djt.equipmentUsed" :key="idx" class="flex items-center gap-2 p-2 rounded-md bg-muted/30"><Icon name="i-lucide-wrench" class="size-3.5 text-blue-500 shrink-0" /><span class="text-xs font-medium">{{ eq.name || eq.equipment || eq }}</span></div>
                  </div>
                </CardContent>
              </Card>
              <!-- Signatures -->
              <Card v-if="djt.signatures?.length > 0">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-pen-tool" class="size-4 text-violet-500" />Signatures<Badge variant="secondary" class="text-[10px] font-bold ml-auto">{{ djt.signatures.length }}</Badge></CardTitle></CardHeader>
                <CardContent>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="(sig, idx) in djt.signatures" :key="idx" class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Avatar class="size-9 border"><AvatarImage v-if="sig.employeeAvatar" :src="sig.employeeAvatar" /><AvatarFallback class="text-[10px] font-bold" :class="getAvatarColor(sig.employeeName || '')">{{ getInitials(sig.employeeName || '?') }}</AvatarFallback></Avatar>
                      <div class="flex-1 min-w-0"><p class="text-xs font-semibold truncate">{{ sig.employeeName || 'Unknown' }}</p><p class="text-[10px] text-muted-foreground">{{ sig.clockOut ? fmtTime(sig.clockOut) : 'Signed' }}</p></div>
                      <Icon name="i-lucide-check-circle" class="size-4 text-emerald-500 shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16 text-center"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-clipboard-list" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No Job Ticket</h3><p class="text-xs text-muted-foreground mt-1">No daily job ticket has been created for this schedule.</p></div>
        </div>

        <!-- ──── JHA (single JHA detail) ──── -->
        <div v-else-if="activeTab === 'jha'">
          <template v-if="jha">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="size-10 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20"><Icon name="i-lucide-shield-alert" class="size-5 text-white" /></div>
                  <div><h2 class="text-base font-bold">Job Hazard Analysis</h2><p class="text-xs text-muted-foreground">{{ jha.scheduleTitle || schedule.title }}</p></div>
                </div>
                <div class="flex items-center gap-2">
                  <Badge v-if="jha.hasAllAssigneeSigns" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold"><Icon name="i-lucide-check-circle" class="size-3 mr-1" />All Signed</Badge>
                  <Badge v-else variant="secondary" class="text-[10px] font-bold"><Icon name="i-lucide-alert-circle" class="size-3 mr-1" />{{ jha.unsignedAssigneeCount || 0 }} Unsigned</Badge>
                  <Badge v-if="jha.hasClientSign" class="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] font-bold"><Icon name="i-lucide-user-check" class="size-3 mr-1" />Client Signed</Badge>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Signatures</p><p class="text-lg font-black tabular-nums">{{ jhaSignedCount }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignees</p><p class="text-lg font-black tabular-nums">{{ jhaAssigneeCount }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</p><p class="text-sm font-bold truncate">{{ jha.service || '—' }}</p></div>
                <div class="rounded-lg bg-muted/30 p-3 ring-1 ring-border/30"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client Sign</p><p class="text-sm font-bold">{{ jha.hasClientSign ? 'Yes' : 'No' }}</p></div>
              </div>
              <!-- JHA Hazards / Content -->
              <Card v-if="jha.hazards || jha.controls || jha.ppe">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-alert-triangle" class="size-4 text-amber-500" />Hazard Assessment</CardTitle></CardHeader>
                <CardContent class="space-y-4">
                  <div v-if="jha.hazards"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Hazards</p><p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ jha.hazards }}</p></div>
                  <div v-if="jha.controls"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Controls</p><p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ jha.controls }}</p></div>
                  <div v-if="jha.ppe"><p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">PPE Required</p><p class="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{{ jha.ppe }}</p></div>
                </CardContent>
              </Card>
              <!-- JHA Signatures -->
              <Card v-if="jha.signatures?.length > 0">
                <CardHeader class="pb-3"><CardTitle class="text-sm font-bold flex items-center gap-2"><Icon name="i-lucide-pen-tool" class="size-4 text-violet-500" />Signatures<Badge variant="secondary" class="text-[10px] font-bold ml-auto">{{ jha.signatures.length }} / {{ jhaAssigneeCount }}</Badge></CardTitle></CardHeader>
                <CardContent>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="(sig, idx) in jha.signatures" :key="idx" class="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <Avatar class="size-9 border"><AvatarImage v-if="sig.employeeAvatar" :src="sig.employeeAvatar" /><AvatarFallback class="text-[10px] font-bold" :class="getAvatarColor(sig.employeeName || '')">{{ getInitials(sig.employeeName || '?') }}</AvatarFallback></Avatar>
                      <div class="flex-1 min-w-0"><p class="text-xs font-semibold truncate">{{ sig.employeeName || 'Unknown' }}</p><p class="text-[10px] text-muted-foreground">Signed</p></div>
                      <Icon name="i-lucide-check-circle" class="size-4 text-emerald-500 shrink-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16 text-center"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-shield-alert" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No JHA</h3><p class="text-xs text-muted-foreground mt-1">No Job Hazard Analysis has been created for this schedule.</p></div>
        </div>

        <!-- ──── TASKS (by estimate) ──── -->
        <div v-else-if="activeTab === 'tasks'" class="space-y-4">
          <template v-if="tasks.length > 0">
            <div class="flex items-center gap-3 mb-4">
              <Badge variant="secondary" class="text-[10px] font-bold">{{ tasks.length }} total</Badge>
              <Badge v-if="todoTasks.length" class="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-bold">{{ todoTasks.length }} todo</Badge>
              <Badge v-if="doneTasks.length" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">{{ doneTasks.length }} done</Badge>
              <p class="text-[10px] text-muted-foreground ml-auto">Tasks for estimate {{ schedule.estimate }}</p>
            </div>
            <div class="space-y-2">
              <div v-for="(task, idx) in tasks" :key="task._id || idx" class="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors group">
                <div class="size-7 rounded-md flex items-center justify-center shrink-0" :class="(task.status || '').toLowerCase() === 'done' ? 'bg-emerald-500/15' : 'bg-muted'">
                  <Icon :name="(task.status || '').toLowerCase() === 'done' ? 'i-lucide-check-circle' : 'i-lucide-circle'" class="size-4" :class="(task.status || '').toLowerCase() === 'done' ? 'text-emerald-500' : 'text-muted-foreground'" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium" :class="(task.status || '').toLowerCase() === 'done' ? 'line-through text-muted-foreground' : ''">{{ task.task || 'Untitled Task' }}</p>
                  <div v-if="task.createdAt" class="text-[10px] text-muted-foreground mt-0.5">{{ timeAgo(task.createdAt) }}</div>
                </div>
                <Badge variant="outline" class="text-[9px] font-bold shrink-0" :class="(task.status || '').toLowerCase() === 'done' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/5 text-amber-600 border-amber-500/20'">
                  {{ (task.status || 'todo').toUpperCase() }}
                </Badge>
              </div>
            </div>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16 text-center"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-check-square" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No Tasks</h3><p class="text-xs text-muted-foreground mt-1">No tasks found for estimate {{ schedule.estimate || '—' }}.</p></div>
        </div>

        <!-- ──── CHATS ──── -->
        <div v-else-if="activeTab === 'chats'" class="space-y-4">
          <template v-if="sortedChats.length > 0">
            <div class="space-y-3">
              <div v-for="(chat, idx) in sortedChats" :key="chat._id || idx" class="flex gap-3 group">
                <Avatar class="size-8 border shrink-0 mt-0.5">
                  <AvatarImage v-if="chat.senderAvatar || chat.avatar" :src="chat.senderAvatar || chat.avatar" />
                  <AvatarFallback class="text-[10px] font-bold" :class="getAvatarColor(chat.senderName || chat.user || 'U')">{{ getInitials(chat.senderName || chat.user || 'U') }}</AvatarFallback>
                </Avatar>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <p class="text-xs font-bold">{{ chat.senderName || chat.user || 'Unknown' }}</p>
                    <p class="text-[10px] text-muted-foreground">{{ timeAgo(chat.createdAt || chat.timestamp) }}</p>
                  </div>
                  <div class="rounded-lg bg-muted/40 px-3 py-2 text-sm leading-relaxed max-w-xl">
                    {{ chat.message || chat.text || chat.content || '' }}
                  </div>
                </div>
              </div>
            </div>
          </template>
          <div v-else class="flex flex-col items-center justify-center py-16 text-center"><div class="size-14 rounded-full bg-muted flex items-center justify-center mb-3"><Icon name="i-lucide-message-circle" class="size-7 text-muted-foreground/50" /></div><h3 class="text-sm font-bold">No Chats</h3><p class="text-xs text-muted-foreground mt-1">No chat messages for this schedule.</p></div>
        </div>
      </div>
    </div>
  </div>
</template>
