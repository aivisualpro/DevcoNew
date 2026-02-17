<script setup lang="ts">
definePageMeta({
  middleware: [
    (_to, _from) => {
      return navigateTo('/job-docs/jha', { replace: true })
    },
  ],
})
</script>

<template>
  <div />
</template>
