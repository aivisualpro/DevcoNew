<script setup lang="ts">
import { clientColumns } from '~/constants/clients'
</script>

<template>
  <ClientsTablePage
    title="Clients"
    description="All clients"
    icon="i-lucide-building-2"
    :columns="clientColumns"
    :filter-fn="() => true"
  />
</template>
