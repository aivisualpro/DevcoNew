<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({ title: 'Time Cards', icon: 'i-lucide-timer' })
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
    <div class="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
      <Icon name="i-lucide-timer" class="size-10 text-primary" />
    </div>
    <h3 class="text-lg font-bold text-foreground">
      Time Cards
    </h3>
    <p class="text-sm mt-1 max-w-xs text-center">
      Select a year, week, employee, and day from the sidebar to view time card details.
    </p>
    <p class="text-xs mt-3 text-muted-foreground/50">
      Click Refresh to sync data from database.
    </p>
  </div>
</template>
