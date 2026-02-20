<script setup lang="ts">
const _props = defineProps<{
  estimate: any
  isLoading: boolean
}>()
</script>

<template>
  <div class="p-6">
    <div v-if="isLoading && !estimate" class="flex items-center justify-center h-64">
      <div class="flex flex-col items-center gap-3 text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
        <p class="text-sm">
          Loading details...
        </p>
      </div>
    </div>

    <div v-else-if="estimate" class="space-y-6">
      <div class="rounded-xl border bg-card p-6 shadow-sm">
        <h3 class="text-sm font-semibold mb-4 flex items-center gap-2">
          <Icon name="i-lucide-info" class="size-4 text-indigo-500" />
          Estimate Details
        </h3>
        <p class="text-sm text-muted-foreground">
          Details content coming soon...
        </p>
      </div>
    </div>

    <div v-else class="flex items-center justify-center h-64">
      <p class="text-sm text-muted-foreground">
        Estimate not found
      </p>
    </div>
  </div>
</template>
