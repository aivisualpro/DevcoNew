<script setup lang="ts">
import { Download, Smartphone, X } from 'lucide-vue-next'

const deferredPrompt = ref<any>(null)
const showBanner = ref(false)
const dismissed = ref(false)
const isInstalled = ref(false)

// Check if already installed via display-mode
if (import.meta.client) {
  isInstalled.value = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true
}

// Listen for the beforeinstallprompt event
onMounted(() => {
  // Don't show if already installed or previously dismissed this session
  if (isInstalled.value)
    return

  const dismissedAt = localStorage.getItem('pwa-install-dismissed')
  if (dismissedAt) {
    const dismissedTime = Number.parseInt(dismissedAt, 10)
    // Re-show after 7 days
    if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
      return
    }
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e
    // Delay showing the banner by 3 seconds so user isn't overwhelmed on first load
    setTimeout(() => {
      if (!dismissed.value) {
        showBanner.value = true
      }
    }, 3000)
  })

  window.addEventListener('appinstalled', () => {
    showBanner.value = false
    isInstalled.value = true
    deferredPrompt.value = null
  })
})

async function handleInstall() {
  if (!deferredPrompt.value)
    return

  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice

  if (outcome === 'accepted') {
    showBanner.value = false
  }
  deferredPrompt.value = null
}

function handleDismiss() {
  showBanner.value = false
  dismissed.value = true
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
}
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div
      v-if="showBanner"
      class="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md"
    >
      <div
        class="relative overflow-hidden rounded-2xl border border-border/50
               bg-gradient-to-br from-background via-background to-muted/30
               shadow-2xl shadow-black/10 dark:shadow-black/40
               backdrop-blur-xl"
      >
        <!-- Decorative gradient bar at top -->
        <div class="h-1 w-full bg-gradient-to-r from-yellow-500 via-red-500 to-green-500" />

        <div class="p-4">
          <div class="flex items-start gap-3">
            <!-- Icon -->
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center
                     rounded-xl bg-primary/10 text-primary"
            >
              <Smartphone class="h-6 w-6" />
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-foreground">
                Install DEVCO ERP
              </h3>
              <p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                Add to your home screen for a faster, app-like experience with offline access.
              </p>
            </div>

            <!-- Close button -->
            <button
              class="shrink-0 rounded-lg p-1 text-muted-foreground/60
                     hover:bg-muted hover:text-foreground transition-colors"
              @click="handleDismiss"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Actions -->
          <div class="mt-3 flex items-center gap-2">
            <button
              class="flex-1 flex items-center justify-center gap-2
                     rounded-xl bg-primary px-4 py-2.5
                     text-sm font-medium text-primary-foreground
                     hover:bg-primary/90 transition-colors
                     active:scale-[0.98] transform"
              @click="handleInstall"
            >
              <Download class="h-4 w-4" />
              Install App
            </button>
            <button
              class="rounded-xl px-4 py-2.5 text-sm font-medium
                     text-muted-foreground hover:text-foreground
                     hover:bg-muted transition-colors"
              @click="handleDismiss"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
