<script setup lang="ts">
import { clientTabFilters } from '~/constants/clients'

const { allClients, isFetched, fetchAllClients } = useClientsApi()

const activeTab = inject<Ref<string>>('clientsActiveTab', ref('lte-10'))

onMounted(() => {
  fetchAllClients()
})

function getCount(tabId: string): number {
  if (!isFetched.value)
    return 0
  const filter = clientTabFilters.find(t => t.id === tabId)
  if (!filter)
    return 0
  return allClients.value.filter(filter.filterFn).length
}
</script>

<template>
  <div class="flex flex-col gap-1 p-2">
    <button
      v-for="tab in clientTabFilters"
      :key="tab.id"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground text-left w-full"
      :class="[
        activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ]"
      @click="activeTab = tab.id"
    >
      <Icon :name="tab.icon" class="size-4 shrink-0" :class="activeTab === tab.id ? tab.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ tab.label }}</span>
      <Badge v-if="isFetched" variant="secondary" class="h-5 min-w-5 justify-center px-1.5 text-[10px] font-bold tabular-nums">
        {{ getCount(tab.id) }}
      </Badge>
    </button>
  </div>
</template>
