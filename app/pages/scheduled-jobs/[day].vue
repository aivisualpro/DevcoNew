<script setup lang="ts">
import { format } from 'date-fns'
import { CalendarDate } from '@internationalized/date'
import { toast } from 'vue-sonner'

const route = useRoute()
const day = computed(() => (route.params.day as string) || 'monday')

const dayLabel = computed(() => {
  if (day.value === 'day-offs') return 'Day Offs'
  return day.value.charAt(0).toUpperCase() + day.value.slice(1)
})

const { setHeader } = usePageHeader()
const { weekLabel, weekStart, weekEnd, prevWeek, nextWeek, goToCurrentWeek, setWeekFromDate, getDateForDay } = useSelectedWeek()

watchEffect(() => {
  setHeader({
    title: `Scheduled Jobs / ${dayLabel.value}`,
    icon: 'i-lucide-calendar-days',
  })
})

// ── Week picker popover ──
const weekPickerOpen = ref(false)

// Convert JS Date to CalendarDate for reka-ui RangeCalendar
function toCalendarDate(d: Date) {
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const calendarValue = computed(() => ({
  start: toCalendarDate(weekStart.value),
  end: toCalendarDate(weekEnd.value),
}))

function handleCalendarUpdate(val: any) {
  if (val?.start) {
    const d = new Date(val.start.year, val.start.month - 1, val.start.day)
    setWeekFromDate(d)
    weekPickerOpen.value = false
  }
}

// Current day date label
const currentDayDate = computed(() => {
  if (day.value === 'day-offs') return ''
  return format(getDateForDay(day.value), 'EEEE, MMMM d, yyyy')
})

// ─── Real data from Firebase ───
const {
  allSchedules,
  isLoading,
  isFetched,
  fetchError,
  fetchAllSchedules,
  refreshSchedules,
  isSyncing,
  syncResult,
} = useScheduledJobsApi()

// Eagerly fetch (uses global cache)
fetchAllSchedules()

// ─── Filter schedules for the selected day ───
const daySchedules = computed(() => {
  if (!isFetched.value) return []

  const targetDate = getDateForDay(day.value)
  const targetDateStr = format(targetDate, 'yyyy-MM-dd')

  return allSchedules.value.filter((s) => {
    if (day.value === 'day-offs') {
      // Show schedules where title contains "Day Off" or similar
      return (s.title || '').toLowerCase().includes('day off')
    }

    // Match schedules whose fromDate falls on the target day
    // Dates are stored as-is (timezone-agnostic), so we compare date portion only
    const fromDate = s.fromDate || ''
    if (!fromDate) return false

    // Extract just the date portion (YYYY-MM-DD) regardless of format
    let scheduleDateStr = ''
    if (fromDate.includes('T')) {
      // ISO format: "2026-02-17T08:00:00.000Z" → take the date part
      scheduleDateStr = fromDate.split('T')[0] || ''
    }
    else if (fromDate.includes('-') && fromDate.length >= 10) {
      scheduleDateStr = fromDate.substring(0, 10)
    }
    else {
      // Try parsing
      try {
        scheduleDateStr = format(new Date(fromDate), 'yyyy-MM-dd')
      }
      catch {
        return false
      }
    }

    return scheduleDateStr === targetDateStr
  })
})

// ─── Search ───
const search = ref('')
const filteredJobs = computed(() => {
  if (!search.value) return daySchedules.value
  const q = search.value.toLowerCase()
  return daySchedules.value.filter(j =>
    (j.title || '').toLowerCase().includes(q)
    || (j.customerName || '').toLowerCase().includes(q)
    || (j.service || '').toLowerCase().includes(q)
    || (j.projectManagerName || '').toLowerCase().includes(q)
    || (j.foremanDisplayName || '').toLowerCase().includes(q)
    || (j.estimate || '').toLowerCase().includes(q)
    || (j.description || '').toLowerCase().includes(q),
  )
})

// ─── Formatters ───
function formatTime(dateStr: string) {
  if (!dateStr) return '—'
  try {
    // Extract time portion as-is (no timezone conversion)
    if (dateStr.includes('T')) {
      const timePart = dateStr.split('T')[1]
      if (timePart) {
        const [h, m] = timePart.split(':')
        const hour = parseInt(h || '0', 10)
        const min = m || '00'
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
        return `${h12}:${min} ${ampm}`
      }
    }
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  catch {
    return dateStr
  }
}

function getInitials(name: string) {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

async function handleRefresh() {
  await refreshSchedules()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} schedules — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
  else {
    toast.success('Schedules refreshed')
  }
}
</script>

<template>
  <!-- Teleport toolbar into the main header -->
  <ClientOnly>
    <Teleport to="#header-actions">
      <!-- Week Navigator -->
      <div class="flex items-center gap-1">
        <Button variant="outline" size="icon" class="size-7" @click="prevWeek">
          <Icon name="i-lucide-chevron-left" class="size-3.5" />
        </Button>

        <Popover v-model:open="weekPickerOpen">
          <PopoverTrigger as-child>
            <Button variant="outline" size="sm" class="h-7 gap-1.5 text-xs font-semibold px-2.5">
              <Icon name="i-lucide-calendar" class="size-3" />
              {{ weekLabel }}
            </Button>
          </PopoverTrigger>
          <PopoverContent class="w-auto p-0" align="start">
            <RangeCalendar
              :model-value="calendarValue"
              :number-of-months="2"
              :week-starts-on="1"
              @update:model-value="handleCalendarUpdate"
            />
            <div class="border-t p-2">
              <Button variant="ghost" size="sm" class="w-full text-xs" @click="goToCurrentWeek(); weekPickerOpen = false">
                Go to current week
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="icon" class="size-7" @click="nextWeek">
          <Icon name="i-lucide-chevron-right" class="size-3.5" />
        </Button>
      </div>

      <!-- Search -->
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search jobs..." class="pl-8 h-7 w-44 text-xs" />
      </div>

      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ daySchedules.length }} job{{ daySchedules.length !== 1 ? 's' : '' }}
      </p>

      <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isLoading || isSyncing" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isLoading || isSyncing }" />
        {{ isSyncing ? 'Syncing...' : 'Refresh' }}
      </Button>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <!-- Date label -->
    <div v-if="currentDayDate" class="shrink-0 px-4 lg:px-6 py-2 border-b bg-muted/20">
      <p class="text-xs text-muted-foreground font-medium">{{ currentDayDate }}</p>
    </div>

    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">Failed to load schedules</p>
        <p class="text-xs text-muted-foreground mt-0.5">{{ fetchError }}</p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">Retry</Button>
    </div>

    <div class="flex-1 min-h-0 overflow-auto">
      <!-- Loading -->
      <div v-if="!isFetched && !fetchError" class="flex items-center justify-center h-64">
        <div class="flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
          <p class="text-sm">Loading schedules...</p>
        </div>
      </div>

      <!-- Grid of Schedule Cards -->
      <div v-else-if="filteredJobs.length > 0" class="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div
          v-for="(job, index) in filteredJobs"
          :key="job.id || index"
          class="group relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
        >
          <!-- Top accent bar -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

          <!-- Card Header -->
          <div class="p-4 pb-3">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge v-if="job.service" variant="outline" class="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                    {{ job.service }}
                  </Badge>
                  <Badge v-if="job.item" variant="outline" class="bg-muted text-muted-foreground border-border text-[10px]">
                    {{ job.item }}
                  </Badge>
                </div>
                <h3 class="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                  {{ job.title || 'Untitled Schedule' }}
                </h3>
                <p v-if="job.customerName" class="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Icon name="i-lucide-building-2" class="size-3.5 shrink-0" />
                  {{ job.customerName }}
                </p>
              </div>
              <div v-if="job.estimate" class="text-right shrink-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est.</p>
                <p class="text-sm font-bold text-primary tabular-nums">{{ job.estimate }}</p>
              </div>
            </div>
          </div>

          <!-- Time -->
          <div class="mx-4 mb-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-border/30">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Icon name="i-lucide-clock" class="size-3" />
                From
              </p>
              <p class="text-sm font-semibold mt-0.5">{{ formatTime(job.fromDate) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Icon name="i-lucide-clock" class="size-3" />
                To
              </p>
              <p class="text-sm font-semibold mt-0.5">{{ formatTime(job.toDate) }}</p>
            </div>
          </div>

          <!-- People -->
          <div class="mx-4 mb-3 grid grid-cols-2 gap-3">
            <!-- PM & Foreman -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leadership</p>
              <div v-if="job.projectManagerName" class="flex items-center gap-2">
                <Avatar class="size-7 border">
                  <AvatarImage v-if="job.projectManagerAvatar" :src="job.projectManagerAvatar" :alt="job.projectManagerName" />
                  <AvatarFallback class="text-[10px] bg-primary/10 text-primary font-bold">{{ getInitials(job.projectManagerName) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="text-xs font-semibold leading-none truncate">{{ job.projectManagerName }}</p>
                  <p class="text-[10px] text-muted-foreground">PM</p>
                </div>
              </div>
              <div v-if="job.foremanDisplayName" class="flex items-center gap-2">
                <Avatar class="size-7 border">
                  <AvatarImage v-if="job.foremanAvatar" :src="job.foremanAvatar" :alt="job.foremanDisplayName" />
                  <AvatarFallback class="text-[10px] bg-secondary/50 font-bold">{{ getInitials(job.foremanDisplayName) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="text-xs font-semibold leading-none truncate">{{ job.foremanDisplayName }}</p>
                  <p class="text-[10px] text-muted-foreground">Foreman</p>
                </div>
              </div>
            </div>
            <!-- Assignees -->
            <div v-if="job.assigneeDetails && job.assigneeDetails.length > 0" class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Crew ({{ job.assigneeDetails.length }})</p>
              <div class="flex -space-x-2">
                <TooltipProvider v-for="(assignee, i) in job.assigneeDetails.slice(0, 5)" :key="i">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Avatar class="size-8 ring-2 ring-card hover:scale-110 hover:z-10 transition-transform cursor-pointer">
                        <AvatarImage v-if="assignee.avatar" :src="assignee.avatar" :alt="assignee.name" />
                        <AvatarFallback class="text-[10px] font-bold">{{ getInitials(assignee.name) }}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{{ assignee.name }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div v-if="job.assigneeDetails.length > 5" class="inline-flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-card">
                  +{{ job.assigneeDetails.length - 5 }}
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div v-if="job.description" class="mx-4 mb-3">
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">{{ job.description }}</p>
          </div>

          <!-- Footer -->
          <div class="border-t px-4 py-2 flex items-center justify-between bg-muted/20">
            <div class="flex items-center gap-2">
              <Badge v-if="job.perDiem" variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                <Icon name="i-lucide-coins" class="size-2.5" />
                Per Diem
              </Badge>
              <Badge v-if="job.notifyAssignees" variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                <Icon name="i-lucide-bell" class="size-2.5" />
                Notify
              </Badge>
            </div>
            <Button variant="ghost" size="sm" class="h-7 text-xs font-bold gap-1 hover:text-primary">
              Details
              <Icon name="i-lucide-arrow-up-right" class="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="isFetched" class="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon name="i-lucide-calendar-x" class="size-8 text-muted-foreground/50" />
        </div>
        <h3 class="text-lg font-bold">No Jobs Found</h3>
        <p class="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
          {{ search ? 'No jobs match your search.' : `No jobs scheduled for ${dayLabel}.` }}
        </p>
        <Button v-if="!search" variant="outline" size="sm" class="mt-4" :disabled="isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isSyncing }" />
          Sync from MongoDB
        </Button>
      </div>
    </div>
  </div>
</template>
