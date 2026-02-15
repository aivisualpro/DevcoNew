<script setup lang="ts">
import { clientColumns, clientTabFilters, type ClientTabFilter } from '~/constants/clients'

const activeTab = inject<Ref<string>>('clientsActiveTab', ref('lte-10'))

const defaultFilter: ClientTabFilter = clientTabFilters[0]!

const currentFilter = computed<ClientTabFilter>(() => {
  return clientTabFilters.find(t => t.id === activeTab.value) || defaultFilter
})
</script>

<template>
  <ClientsLayout>
    <ClientsTablePage
      :key="activeTab"
      :title="currentFilter.label"
      :description="`Clients with ${currentFilter.label.toLowerCase()}`"
      icon="i-lucide-building-2"
      :columns="clientColumns"
      :filter-fn="currentFilter.filterFn"
    />
  </ClientsLayout>
</template>
