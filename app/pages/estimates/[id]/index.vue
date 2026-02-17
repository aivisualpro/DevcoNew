<script setup lang="ts">
import { estimateRouteFilters } from '~/constants/estimates'

const route = useRoute()
const id = route.params.id as string

// Only redirect to summary if this is a detail view (not a category)
if (!estimateRouteFilters[id]) {
  await navigateTo(`/estimates/${id}/summary`, { replace: true })
}
</script>

<template>
  <div />
</template>
