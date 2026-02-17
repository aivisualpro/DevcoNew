<script setup lang="ts">
import { estimateRouteFilters } from '~/constants/estimates'
import { useEstimatesApi } from '~/composables/useEstimatesApi'

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
  if (!isFetched.value) return 0
  const filter = estimateRouteFilters[filterKey]
  if (!filter) return 0
  return allEstimates.value.filter(filter.filterFn).length
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
      <Icon :name="item.icon" class="size-4" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ item.title }}</span>
      <span
        v-if="getCount(item.id) !== null"
        class="text-xs tabular-nums px-1.5 py-0.5 rounded-md"
        :class="currentActiveId === item.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
      >
        {{ getCount(item.id) }}
      </span>
    </NuxtLink>
  </div>
</template>
