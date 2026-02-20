<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Time Cards', icon: 'i-lucide-timer' })

const { allTimeCards, isSyncing, syncTimeCards, syncResult } = useTimeCardsApi()

async function handleRefresh() {
  await syncTimeCards()
  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    toast.success(syncResult.value.message, {
      description: `Created: ${s.created} | Updated: ${s.updated} | Duration: ${(s.duration / 1000).toFixed(1)}s`,
    })
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error('Sync failed', { description: syncResult.value.message })
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full text-muted-foreground">
    <!-- Teleport refresh button into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
          {{ allTimeCards.length.toLocaleString() }} time cards
        </p>
        <Button variant="ghost" size="sm" class="h-7 text-xs" :disabled="isSyncing" @click="handleRefresh">
          <Icon name="i-lucide-refresh-cw" class="mr-1 size-3" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <div class="size-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
      <Icon name="i-lucide-timer" class="size-10 text-primary" />
    </div>
    <h3 class="text-lg font-bold text-foreground">
      Time Cards
    </h3>
    <p class="text-sm mt-1 max-w-xs text-center">
      Select a year, week, employee, and day from the sidebar to view time card details.
    </p>
    <Button variant="outline" size="sm" class="mt-4 gap-1.5" :disabled="isSyncing" @click="handleRefresh">
      <Icon name="i-lucide-refresh-cw" class="size-3.5" :class="{ 'animate-spin': isSyncing }" />
      {{ isSyncing ? 'Syncing...' : 'Sync from Database' }}
    </Button>
  </div>
</template>
