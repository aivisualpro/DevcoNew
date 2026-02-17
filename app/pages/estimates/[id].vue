<script setup lang="ts">
import { estimateColumns, estimateRouteFilters } from '~/constants/estimates'

const route = useRoute()
const idOrCategory = computed(() => route.params.id as string)

// Determine if this is a category (table view) or a detail (estimate detail)
const isCategory = computed(() => !!estimateRouteFilters[idOrCategory.value])
const filter = computed(() => estimateRouteFilters[idOrCategory.value])

// Breadcrumb-style header: "Estimates / All Estimates"
const headerTitle = computed(() => filter.value ? `Estimates / ${filter.value.label}` : 'Estimates')
</script>

<template>
  <!-- Category view (e.g., /estimates/all, /estimates/pending) -->
  <EstimatesTablePage
    v-if="isCategory && filter"
    :title="headerTitle"
    :description="filter.label"
    :icon="filter.icon"
    :columns="estimateColumns"
    :filter-fn="filter.filterFn"
  />

  <!-- Detail view (e.g., /estimates/abc123/summary) -->
  <EstimatesDetailLayout v-else v-slot="{ estimate, isLoading }">
    <NuxtPage :estimate="estimate" :is-loading="isLoading" />
  </EstimatesDetailLayout>
</template>
