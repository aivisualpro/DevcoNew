<script setup lang="ts">
import { format } from 'date-fns'

const route = useRoute()
const { getDateForDay } = useSelectedWeek()

const navItems = [
  { id: 'monday', title: 'Monday', icon: 'i-lucide-calendar', color: 'text-blue-500', link: '/upcoming-jobs/monday', count: 6 },
  { id: 'tuesday', title: 'Tuesday', icon: 'i-lucide-calendar', color: 'text-indigo-500', link: '/upcoming-jobs/tuesday', count: 5 },
  { id: 'wednesday', title: 'Wednesday', icon: 'i-lucide-calendar', color: 'text-purple-500', link: '/upcoming-jobs/wednesday', count: 7 },
  { id: 'thursday', title: 'Thursday', icon: 'i-lucide-calendar', color: 'text-orange-500', link: '/upcoming-jobs/thursday', count: 4 },
  { id: 'friday', title: 'Friday', icon: 'i-lucide-calendar', color: 'text-emerald-500', link: '/upcoming-jobs/friday', count: 5 },
  { id: 'saturday', title: 'Saturday', icon: 'i-lucide-calendar', color: 'text-amber-500', link: '/upcoming-jobs/saturday', count: 3 },
  { id: 'sunday', title: 'Sunday', icon: 'i-lucide-calendar', color: 'text-rose-500', link: '/upcoming-jobs/sunday', count: 2 },
]

const bottomItems = [
  { id: 'day-offs', title: 'Day Offs', icon: 'i-lucide-calendar-off', color: 'text-muted-foreground', link: '/upcoming-jobs/day-offs', count: 8 },
]

const currentActiveId = computed(() => {
  const path = route.path
  return path.split('/').pop() || 'monday'
})

function dayDate(dayId: string) {
  return format(getDateForDay(dayId), 'MMM d')
}
</script>

<template>
  <div class="flex flex-col gap-1 p-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.id"
      :to="item.link"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
      :class="[
        currentActiveId === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ]"
    >
      <Icon :name="item.icon" class="size-4 shrink-0" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ item.title }}</span>
      <span class="text-[10px] text-muted-foreground tabular-nums">{{ dayDate(item.id) }}</span>
      <Badge variant="secondary" class="h-5 min-w-5 justify-center px-1.5 text-[10px] font-bold tabular-nums">
        {{ item.count }}
      </Badge>
    </NuxtLink>

    <!-- Separator -->
    <div class="my-2 h-px bg-border mx-2" />

    <NuxtLink
      v-for="item in bottomItems"
      :key="item.id"
      :to="item.link"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
      :class="[
        currentActiveId === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ]"
    >
      <Icon :name="item.icon" class="size-4 shrink-0" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ item.title }}</span>
      <Badge variant="secondary" class="h-5 min-w-5 justify-center px-1.5 text-[10px] font-bold tabular-nums">
        {{ item.count }}
      </Badge>
    </NuxtLink>
  </div>
</template>
