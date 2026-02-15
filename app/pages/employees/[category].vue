<script setup lang="ts">
import { employeeColumns, employeeRouteFilters } from '~/constants/employees'

const route = useRoute()
const categoryKey = computed(() => route.params.category as string)
const filter = computed(() => employeeRouteFilters[categoryKey.value])
</script>

<template>
  <EmployeesTablePage
    v-if="filter"
    :title="filter.label"
    :description="`Viewing ${filter.label} users`"
    icon="i-lucide-user-round-check"
    entity-name="Employee"
    :columns="employeeColumns"
    :filter-fn="filter.filterFn"
    :show-status-counts="filter.showStatusCounts"
  />
  <div v-else class="flex items-center justify-center h-64 text-muted-foreground">
    <p>Unknown category: {{ categoryKey }}</p>
  </div>
</template>
