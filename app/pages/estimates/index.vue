<script setup lang="ts">
definePageMeta({
  middleware: [
    (_to, _from) => {
      return navigateTo('/estimates/all', { replace: true })
    },
  ],
})
</script>

<template>
  <div />
</template>
