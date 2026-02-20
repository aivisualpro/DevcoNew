<script setup lang="ts">
// Service Worker Registration Component
// Registers the SW on mount, handles update lifecycle

const swRegistration = ref<ServiceWorkerRegistration | null>(null)

onMounted(async () => {
  if (!('serviceWorker' in navigator))
    return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    swRegistration.value = registration

    // Check for updates every 60 minutes
    setInterval(() => {
      registration.update()
    }, 60 * 60 * 1000)

    // Listen for waiting service worker (new version available)
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker)
        return

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') {
          // New version installed & activated — on next navigation it'll be used
          // silently activated
        }
      })
    })

    // registered
  }
  catch {
    // registration failed silently
  }
})
</script>

<template>
  <!-- Invisible component — only registers the service worker -->
  <div />
</template>
