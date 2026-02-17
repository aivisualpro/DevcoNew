<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Daily Job Tickets',
  icon: 'i-lucide-clipboard-list',
})
</script>

<template>
  <JobDocsDjtTable />
</template>
