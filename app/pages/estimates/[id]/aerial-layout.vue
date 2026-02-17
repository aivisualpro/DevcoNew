<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

const { setHeader } = usePageHeader()

watchEffect(() => {
  if (props.estimate) {
    setHeader({
      title: `${props.estimate.estimate || 'Estimate'} — Aerial Layout`,
      description: props.estimate.projectName || '',
      icon: 'i-lucide-map',
    })
  }
})
</script>

<template>
  <div class="p-6">
    <div class="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <div class="size-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4">
        <Icon name="i-lucide-map" class="size-8 text-cyan-500" />
      </div>
      <p class="text-sm font-semibold text-foreground">Aerial Layout</p>
      <p class="text-xs mt-1">Aerial layout viewer for this estimate coming soon.</p>
    </div>
  </div>
</template>
