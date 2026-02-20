<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Signed Contracts',
  icon: 'i-lucide-file-signature',
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-col items-center justify-center flex-1 text-muted-foreground">
      <div class="size-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
        <Icon name="i-lucide-file-signature" class="size-8 text-indigo-500" />
      </div>
      <p class="text-sm font-semibold text-foreground">
        Signed Contracts
      </p>
      <p class="text-xs mt-1">
        This section is coming soon.
      </p>
    </div>
  </div>
</template>
