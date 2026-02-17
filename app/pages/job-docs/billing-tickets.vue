<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Billing Tickets',
  icon: 'i-lucide-receipt',
})
</script>

<template>
  <JobDocsBillingTicketsTable />
</template>
