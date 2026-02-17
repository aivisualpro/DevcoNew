<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({
  title: 'Job Docs / Receipts & Costs',
  icon: 'i-lucide-wallet',
})
</script>

<template>
  <JobDocsReceiptsCostsTable />
</template>
