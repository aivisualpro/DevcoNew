<script setup lang="ts">
import type { HTMLAttributes, Ref } from 'vue'
import { useEventListener, useMediaQuery } from '@vueuse/core'
import { TooltipProvider } from 'reka-ui'
import { computed, ref } from 'vue'
import { cn } from '@/lib/utils'
import { provideSidebarContext, SIDEBAR_COOKIE_MAX_AGE, SIDEBAR_COOKIE_NAME, SIDEBAR_KEYBOARD_SHORTCUT, SIDEBAR_WIDTH, SIDEBAR_WIDTH_ICON } from './utils'

const props = withDefaults(defineProps<{
  defaultOpen?: boolean
  open?: boolean
  class?: HTMLAttributes['class']
}>(), {
  defaultOpen: undefined,
  open: undefined,
})

const emits = defineEmits<{
  'update:open': [open: boolean]
}>()

// Use Nuxt's useCookie for SSR-safe state persistence
const sidebarCookie = useCookie<string>(SIDEBAR_COOKIE_NAME, {
  default: () => 'true',
  maxAge: SIDEBAR_COOKIE_MAX_AGE,
})

const isMobile = useMediaQuery('(max-width: 768px)')
const openMobile = ref(false)

// Resolve initial state: prop > cookie > true
const initialOpen = props.defaultOpen ?? (sidebarCookie.value !== 'false')

const open = ref(initialOpen) as Ref<boolean>

// Sync with v-model if provided
if (props.open !== undefined) {
  watch(() => props.open, (val) => {
    if (val !== undefined)
      open.value = val
  })
  watch(open, val => emits('update:open', val))
}

function setOpen(value: boolean) {
  open.value = value
  sidebarCookie.value = String(value)
}

function setOpenMobile(value: boolean) {
  openMobile.value = value
}

// Helper to toggle the sidebar.
function toggleSidebar() {
  return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value)
}

useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    toggleSidebar()
  }
})

// We add a state so that we can do data-state="expanded" or "collapsed".
// This makes it easier to style the sidebar with Tailwind classes.
const state = computed(() => open.value ? 'expanded' : 'collapsed')

provideSidebarContext({
  state,
  open,
  setOpen,
  isMobile,
  openMobile,
  setOpenMobile,
  toggleSidebar,
})
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div
      data-slot="sidebar-wrapper"
      :style="{
        '--sidebar-width': SIDEBAR_WIDTH,
        '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
      }"
      :class="cn('group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full', props.class)"
      v-bind="$attrs"
    >
      <slot />
    </div>
  </TooltipProvider>
</template>
