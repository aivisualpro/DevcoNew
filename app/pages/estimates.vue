<script setup lang="ts">
import { estimateRouteFilters } from '~/constants/estimates'

const route = useRoute()

// Check if the current route is a category (list) view or a detail view
const isListView = computed(() => {
  // Path is like /estimates/all, /estimates/pending, etc.
  const segments = route.path.split('/').filter(Boolean) // ['estimates', 'all']
  if (segments.length === 1)
    return true // /estimates (index redirect)
  if (segments.length === 2) {
    const category = segments[1] ?? ''
    return !!estimateRouteFilters[category]
  }
  return false
})
</script>

<template>
  <!-- Category/List view gets the full layout with category sidebar -->
  <EstimatesLayout v-if="isListView">
    <NuxtPage />
  </EstimatesLayout>

  <!-- Detail view renders directly (detail layout is handled by [id].vue) -->
  <NuxtPage v-else />
</template>
