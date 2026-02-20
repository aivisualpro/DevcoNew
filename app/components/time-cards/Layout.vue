<script setup lang="ts">
</script>

<template>
  <div class="-m-4 lg:-m-6 h-[calc(100%+2rem)] lg:h-[calc(100%+3rem)] flex overflow-hidden bg-background">
    <!-- Fixed-width sidebar -->
    <div class="w-[280px] shrink-0 border-r bg-muted/30 flex flex-col h-full overflow-hidden">
      <ScrollArea class="flex-1 min-h-0">
        <TimeCardsNav />
      </ScrollArea>
    </div>
    <!-- Main content -->
    <div class="flex-1 min-w-0 h-full overflow-y-auto">
      <slot />
    </div>
  </div>
</template>
