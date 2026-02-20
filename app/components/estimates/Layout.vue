<script setup lang="ts">
import { useEstimatesApi } from '~/composables/useEstimatesApi'
import { estimateRouteFilters } from '~/constants/estimates'

const route = useRoute()

const navItems = Object.entries(estimateRouteFilters).map(([key, filter]) => ({
  id: key,
  title: filter.label,
  icon: filter.icon,
  color: filter.color,
  link: `/estimates/${key}`,
}))

const currentActiveId = computed(() => {
  const path = route.path
  return path.split('/').pop() || 'all'
})

// ─── Live counts per tab ───
const { allEstimates, isFetched } = useEstimatesApi()

function getCount(filterKey: string) {
  if (!isFetched.value)
    return 0
  const filter = estimateRouteFilters[filterKey]
  if (!filter)
    return 0
  return allEstimates.value.filter(filter.filterFn).length
}
</script>

<template>
  <div class="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden bg-background">
    <!-- Tab Bar -->
    <div class="shrink-0 border-b bg-muted/30">
      <ScrollArea orientation="horizontal" class="w-full">
        <div class="flex items-center gap-0.5 px-4 py-1.5">
          <NuxtLink
            v-for="item in navItems"
            :key="item.id"
            :to="item.link"
            class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap hover:bg-accent hover:text-accent-foreground"
            :class="[
              currentActiveId === item.id
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground',
            ]"
          >
            <Icon :name="item.icon" class="size-3.5" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
            <span>{{ item.title }}</span>
            <span
              v-if="isFetched"
              class="text-[10px] tabular-nums px-1 py-0.5 rounded"
              :class="currentActiveId === item.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ getCount(item.id) }}
            </span>
          </NuxtLink>
        </div>
      </ScrollArea>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <slot />
    </div>
  </div>
</template>
