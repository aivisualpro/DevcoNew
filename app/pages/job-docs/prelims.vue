<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Prelims / Legal / Lien',
  icon: 'i-lucide-scale',
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground">
      <div class="size-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
        <Icon name="i-lucide-scale" class="size-8 text-rose-500" />
      </div>
      <p class="text-sm font-semibold text-foreground">Prelims / Legal / Lien</p>
      <p class="text-xs mt-1">This section is coming soon.</p>
    </div>
  </div>
</template>
