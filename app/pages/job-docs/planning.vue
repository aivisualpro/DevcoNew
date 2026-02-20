<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Planning',
  icon: 'i-lucide-gantt-chart',
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground">
      <div class="size-16 rounded-2xl bg-sky-500/10 flex items-center justify-center mb-4">
        <Icon name="i-lucide-gantt-chart" class="size-8 text-sky-500" />
      </div>
      <p class="text-sm font-semibold text-foreground">
        Planning
      </p>
      <p class="text-xs mt-1">
        This section is coming soon.
      </p>
    </div>
  </div>
</template>
