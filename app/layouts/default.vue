<script setup lang="ts">
</script>

<template>
  <SidebarProvider class="!h-screen !max-h-screen !min-h-0 overflow-hidden">
    <LayoutAppSidebar />
    <SidebarInset class="!min-h-0 !max-h-screen overflow-hidden">
      <LayoutHeader />
      <div class="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
        <slot />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
