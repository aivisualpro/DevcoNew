<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useKanban } from '~/composables/useKanban'

const { setHeader } = usePageHeader()
setHeader({ title: 'Tasks', icon: 'i-lucide-kanban', description: 'Manage your tasks with drag and drop' })

const { loadFromApi } = useKanban()

const isSyncing = ref(false)

async function syncTasks() {
  if (isSyncing.value)
    return

  isSyncing.value = true
  try {
    const result = await $fetch<any>('/api/tasks/sync', { method: 'POST' })
    toast.success(result.message, {
      description: `Created: ${result.stats.created} | Updated: ${result.stats.updated} | Duration: ${result.stats.duration}ms`,
    })
    // Reload tasks from Firebase after sync
    await loadFromApi()
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Sync failed'
    toast.error('Task sync failed', { description: msg })
  }
  finally {
    isSyncing.value = false
  }
}
</script>

<template>
  <div class="h-full">
    <!-- Teleport refresh button into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5"
          :disabled="isSyncing"
          @click="syncTasks"
        >
          <Icon
            name="i-lucide-refresh-cw"
            class="size-3.5"
            :class="{ 'animate-spin': isSyncing }"
          />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <KanbanBoard />
  </div>
</template>
