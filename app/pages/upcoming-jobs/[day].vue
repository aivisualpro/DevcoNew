<script setup lang="ts">
import { format } from 'date-fns'
import { CalendarDate } from '@internationalized/date'

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
    title: `${dayLabel.value} — Upcoming Jobs`,
    description: `Schedule for ${dayLabel.value}`,
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

// Schema-aligned dummy data generator
const generateDummyJobs = (count: number) => {
  const services = ['Roofing', 'Solar Installation', 'HVAC Repair', 'Window Replacement', 'Gutter Cleaning', 'Electrical Wiring', 'Plumbing', 'Concrete Work']
  const items = ['Premium Shingles', '72-Cell Solar Panel', 'High-Efficiency Furnace', 'Double-Pane Windows', 'Seamless Gutters', 'Commercial Conduit', 'PEX Re-Pipe', 'Foundation Rebar']
  const locations = [
    '123 Maple St, Springfield, IL',
    '456 Oak Ave, Riverdale, NY',
    '789 Pine Rd, Hill Valley, CA',
    '101 Cedar Ln, Twin Peaks, WA',
    '202 Birch Dr, Pawnee, IN',
    '303 Elm Way, Greendale, CO',
    '404 Willow Ct, Scranton, PA',
    '505 Aspen Blvd, Portland, OR',
  ]
  const names = ['John Doe', 'Jane Smith', 'Michael Brown', 'Emily Davis', 'Robert Wilson', 'Sarah Connor', 'David Lee', 'Maria Garcia']
  const projectManagers = ['Alice Johnson', 'Bob Miller', 'Charlie Davis', 'Diana Ross']
  const foremen = ['Dave Wilson', 'Eve Brown', 'Frank Miller', 'Grace Chen']

  return Array.from({ length: count }, (_, i) => ({
    title: `${services[i % services.length]} Project #${1000 + i}`,
    fromDate: new Date(2026, 1, 15, 7 + i, 0),
    toDate: new Date(2026, 1, 15, 9 + i, 30),
    customerId: `CUST-${2000 + i}`,
    customerName: names[i % names.length] ?? '',
    estimate: `$${((i + 1) * 1250 + 500).toLocaleString()}`,
    jobLocation: locations[i % locations.length] ?? '',
    projectManager: projectManagers[i % projectManagers.length] ?? '',
    foremanName: foremen[i % foremen.length] ?? '',
    assignees: ['Alex Turner', 'Sam Rivera', 'Jordan Lee', 'Casey Park', 'Morgan Blake'].slice(0, 2 + (i % 4)),
    description: `Complete ${(services[i % services.length] ?? 'service').toLowerCase()} installation. Site prep includes safety fencing and material staging. Client expects completion within the scheduled window.`,
    service: services[i % services.length] ?? 'General',
    item: items[i % items.length] ?? 'Standard',
    fringe: i % 3 === 0 ? 'Yes' : 'No',
    certifiedPayroll: i % 2 === 0 ? 'Yes' : 'No',
    notifyAssignees: 'Email, SMS',
    perDiem: i % 4 === 0 ? 'Yes' : 'No',
    aerialImage: '',
    siteLayout: '',
    isDayOffApproved: day.value === 'day-offs',
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
}

const dayJobCounts: Record<string, number> = {
  monday: 6,
  tuesday: 5,
  wednesday: 7,
  thursday: 4,
  friday: 5,
  saturday: 3,
  sunday: 2,
  'day-offs': 8,
}

const jobs = computed(() => generateDummyJobs(dayJobCounts[day.value] ?? 4))

const search = ref('')
const filteredJobs = computed(() => {
  if (!search.value) return jobs.value
  const q = search.value.toLowerCase()
  return jobs.value.filter(j =>
    j.title.toLowerCase().includes(q)
    || j.customerName.toLowerCase().includes(q)
    || j.jobLocation.toLowerCase().includes(q)
    || j.service.toLowerCase().includes(q)
    || j.projectManager.toLowerCase().includes(q)
    || j.foremanName.toLowerCase().includes(q),
  )
})

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase()
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

      <!-- Transfer Button (placeholder) -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="outline" size="icon" class="size-7">
              <Icon name="i-lucide-arrow-left-right" class="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Transfer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- Search -->
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search jobs..." class="pl-8 h-7 w-44 text-xs" />
      </div>

      <Button variant="ghost" size="sm" class="h-7 text-xs">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" />
        Refresh
      </Button>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <div class="flex-1 min-h-0 overflow-auto">
      <!-- Grid of Schedule Cards -->
      <div v-if="filteredJobs.length > 0" class="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div
          v-for="(job, index) in filteredJobs"
          :key="index"
          class="group relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30"
        >
          <!-- Top accent bar -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

          <!-- Card Header -->
          <div class="p-4 pb-3">
            <div class="flex items-start justify-between gap-3">
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" class="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                    {{ job.service }}
                  </Badge>
                  <Badge v-if="job.certifiedPayroll === 'Yes'" variant="outline" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] uppercase tracking-wider">
                    Certified
                  </Badge>
                  <Badge v-if="job.isDayOffApproved" variant="outline" class="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] uppercase tracking-wider">
                    Day Off
                  </Badge>
                </div>
                <h3 class="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                  {{ job.title }}
                </h3>
                <p class="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Icon name="i-lucide-building-2" class="size-3.5 shrink-0" />
                  {{ job.customerName }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est.</p>
                <p class="text-lg font-black text-primary tabular-nums">{{ job.estimate }}</p>
              </div>
            </div>
          </div>

          <!-- Time & Location -->
          <div class="mx-4 mb-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 ring-1 ring-border/30">
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Icon name="i-lucide-clock" class="size-3" />
                Schedule
              </p>
              <p class="text-sm font-semibold mt-0.5">{{ formatTime(job.fromDate) }} — {{ formatTime(job.toDate) }}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Icon name="i-lucide-map-pin" class="size-3" />
                Location
              </p>
              <p class="text-sm font-semibold mt-0.5 truncate" :title="job.jobLocation">{{ job.jobLocation }}</p>
            </div>
          </div>

          <!-- People -->
          <div class="mx-4 mb-3 grid grid-cols-2 gap-3">
            <!-- PM & Foreman -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leadership</p>
              <div class="flex items-center gap-2">
                <Avatar class="size-7 border">
                  <AvatarFallback class="text-[10px] bg-primary/10 text-primary font-bold">{{ getInitials(job.projectManager) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="text-xs font-semibold leading-none truncate">{{ job.projectManager }}</p>
                  <p class="text-[10px] text-muted-foreground">PM</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <Avatar class="size-7 border">
                  <AvatarFallback class="text-[10px] bg-secondary/50 font-bold">{{ getInitials(job.foremanName) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="text-xs font-semibold leading-none truncate">{{ job.foremanName }}</p>
                  <p class="text-[10px] text-muted-foreground">Foreman</p>
                </div>
              </div>
            </div>
            <!-- Assignees -->
            <div class="space-y-2">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Crew ({{ job.assignees.length }})</p>
              <div class="flex -space-x-2">
                <TooltipProvider v-for="(assignee, i) in job.assignees.slice(0, 5)" :key="i">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Avatar class="size-8 ring-2 ring-card hover:scale-110 hover:z-10 transition-transform cursor-pointer">
                        <AvatarFallback class="text-[10px] font-bold">{{ getInitials(assignee) }}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{{ assignee }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div v-if="job.assignees.length > 5" class="inline-flex size-8 items-center justify-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-card">
                  +{{ job.assignees.length - 5 }}
                </div>
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="mx-4 mb-3">
            <p class="text-xs text-muted-foreground line-clamp-2 leading-relaxed italic">{{ job.description }}</p>
          </div>

          <!-- Footer -->
          <div class="border-t px-4 py-2 flex items-center justify-between bg-muted/20">
            <div class="flex items-center gap-2">
              <Badge v-if="job.perDiem === 'Yes'" variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                <Icon name="i-lucide-coins" class="size-2.5" />
                Per Diem
              </Badge>
              <Badge v-if="job.fringe === 'Yes'" variant="secondary" class="text-[10px] h-5 gap-0.5 font-bold">
                <Icon name="i-lucide-layers" class="size-2.5" />
                Fringe
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
      <div v-else class="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <div class="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon name="i-lucide-calendar-x" class="size-8 text-muted-foreground/50" />
        </div>
        <h3 class="text-lg font-bold">No Jobs Found</h3>
        <p class="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
          {{ search ? 'No jobs match your search.' : `No jobs scheduled for ${dayLabel}.` }}
        </p>
      </div>
    </div>
  </div>
</template>
