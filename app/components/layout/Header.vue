<script setup lang="ts">
const route = useRoute()
const { headerState, clearHeader } = usePageHeader()

// Clear header state on route change so pages without setHeader() don't show stale info
watch(() => route.fullPath, () => {
  clearHeader()
})

// Derive fallback title from route when no explicit title is set
const fallbackTitle = computed(() => {
  if (route.fullPath === '/')
    return 'Dashboard'
  const segments = route.fullPath.split('/').filter(s => s !== '')
  const last = segments[segments.length - 1] || ''
  return last
    .replace(/-/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
})

const displayTitle = computed(() => headerState.title || fallbackTitle.value)
</script>

<template>
  <header class="sticky top-0 md:peer-data-[variant=inset]:top-2 z-10 h-(--header-height) flex items-center gap-4 border-b bg-background px-4 md:px-6 md:rounded-tl-xl md:rounded-tr-xl">
    <div class="flex items-center gap-4 min-w-0">
      <SidebarTrigger />
      <Separator orientation="vertical" class="h-4" />
      <ClientOnly>
        <NuxtLink
          v-if="headerState.backLink"
          :to="headerState.backLink.href"
          class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Icon name="i-lucide-arrow-left" class="size-3.5" />
          {{ headerState.backLink.label }}
        </NuxtLink>
        <Separator v-if="headerState.backLink" orientation="vertical" class="h-4" />
      </ClientOnly>
      <div class="flex items-center gap-2.5 min-w-0">
        <ClientOnly>
          <Icon v-if="headerState.icon" :name="headerState.icon" class="size-5 shrink-0 text-primary" />
        </ClientOnly>
        <div class="min-w-0">
          <h1 class="text-sm font-semibold leading-tight truncate">
            {{ displayTitle }}
          </h1>
          <ClientOnly>
            <p v-if="headerState.description" class="text-xs text-muted-foreground leading-tight truncate hidden md:block">
              {{ headerState.description }}
            </p>
          </ClientOnly>
        </div>
      </div>
    </div>
    <div class="ml-auto flex items-center gap-2">
      <div id="header-actions" class="contents" />
      <slot />
    </div>
  </header>
</template>
