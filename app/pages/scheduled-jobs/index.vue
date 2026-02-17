<script setup lang="ts">
definePageMeta({
  middleware: [
    (_to, _from) => {
      return navigateTo('/scheduled-jobs/monday', { replace: true })
    },
  ],
})
</script>

<template>
  <div />
</template>
