<script setup lang="ts">
definePageMeta({
  middleware: [
    (_to, _from) => {
      return navigateTo('/upcoming-jobs/monday', { replace: true })
    },
  ],
})
</script>

<template>
  <div />
</template>
