<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

const estimateNumber = computed(() => props.estimate?.estimate || '')
</script>

<template>
  <div class="flex flex-col h-full">
    <TimeCardsTable
      :estimate-number="estimateNumber"
      embedded
    />
  </div>
</template>
