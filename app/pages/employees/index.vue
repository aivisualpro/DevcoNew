<script setup lang="ts">
definePageMeta({
  middleware: [
    (_to, _from) => {
      return navigateTo('/employees/super-admin', { replace: true })
    },
  ],
})
</script>

<template>
  <div />
</template>
