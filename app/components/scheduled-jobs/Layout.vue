<script setup lang="ts">
// Prefetch schedule data at the layout level — this fires BEFORE any day page mounts.
// Because data is global-cached, by the time [day].vue mounts, data is already available.
const { fetchAllSchedules } = useScheduledJobsApi()
fetchAllSchedules()
</script>

<template>
  <div class="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden bg-background">
    <ResizablePanelGroup direction="horizontal" class="flex-1 min-h-0">
      <ResizablePanel :default-size="20" :min-size="15" :max-size="30" class="bg-muted/30">
        <div class="flex flex-col h-full overflow-hidden">
          <ScrollArea class="flex-1 min-h-0">
            <ScheduledJobsNav />
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="80">
        <div class="h-full overflow-y-auto">
          <slot />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
