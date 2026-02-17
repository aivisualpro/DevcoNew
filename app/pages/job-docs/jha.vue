<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / JHA',
  icon: 'i-lucide-shield-check',
})
</script>

<template>
  <JobDocsJhaTable />
</template>
