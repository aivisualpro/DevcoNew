<script setup lang="ts">
</script>

<template>
  <div class="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex flex-col overflow-hidden bg-background">
    <ResizablePanelGroup direction="horizontal" class="flex-1 min-h-0">
      <ResizablePanel :default-size="22" :min-size="18" :max-size="35" class="bg-muted/30">
        <div class="flex flex-col h-full overflow-hidden">
          <ScrollArea class="flex-1 min-h-0">
            <TimeCardsNav />
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="78">
        <div class="h-full overflow-y-auto">
          <slot />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
