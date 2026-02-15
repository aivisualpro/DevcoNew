<script setup lang="ts">
const activeTab = ref('lte-10')
provide('clientsActiveTab', activeTab)
</script>

<template>
  <div class="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden bg-background">
    <ResizablePanelGroup direction="horizontal" class="flex-1 min-h-0">
      <ResizablePanel :default-size="20" :min-size="15" :max-size="30" class="bg-muted/30">
        <div class="flex flex-col h-full overflow-hidden">
          <div class="shrink-0 p-4 border-b bg-background/50 backdrop-blur-sm">
            <h3 class="font-semibold flex items-center gap-2 text-primary">
              <Icon name="i-lucide-building-2" class="size-4" />
              Clients
            </h3>
          </div>
          <ScrollArea class="flex-1 min-h-0">
            <ClientsNav />
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="80">
        <div class="h-full overflow-hidden">
          <slot />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
