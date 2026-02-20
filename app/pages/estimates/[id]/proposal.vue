<script setup lang="ts">
const _props = defineProps<{
  estimate: any
  isLoading: boolean
}>()
</script>

<template>
  <div class="p-6">
    <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <div class="size-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
        <Icon name="i-lucide-file-text" class="size-8 text-rose-500" />
      </div>
      <p class="text-sm font-semibold text-foreground">
        Proposal
      </p>
      <p class="text-xs mt-1">
        Proposal generation for this estimate coming soon.
      </p>
    </div>
  </div>
</template>
