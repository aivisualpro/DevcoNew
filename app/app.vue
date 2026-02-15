<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt'
import { ConfigProvider } from 'reka-ui'
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'

const colorMode = useColorMode()
const color = computed(() => colorMode.value === 'dark' ? '#09090b' : '#ffffff')
const { theme } = useAppSettings()

useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} | DEVCOERP` : 'DEVCOERP'
  },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
    { key: 'theme-color', name: 'theme-color', content: color },
    { name: 'description', content: 'DEVCOERP.' },
    // PWA meta tags
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'DEVCOERP' },
    { name: 'application-name', content: 'DEVCOERP' },
    { name: 'msapplication-TileColor', content: '#E31E24' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icon-192x192.png' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/manifest.json' },
  ],
  htmlAttrs: {
    lang: 'en',
  },
  bodyAttrs: {
    class: computed(() => `color-${theme.value?.color || 'default'} theme-${theme.value?.type || 'default'}`),
  },
})

const title = 'DEVCOERP'
const description = 'A comprehensive CRM platform by DEVCOERP.'

const router = useRouter()

defineShortcuts({
  'G-H': () => router.push('/'),
  'G-L': () => router.push('/leads'),
})

const textDirection = useTextDirection({ initialValue: 'ltr' })
const dir = computed(() => textDirection.value === 'rtl' ? 'rtl' : 'ltr')
</script>

<template>
  <Body class="overscroll-none antialiased bg-background text-foreground">
    <ConfigProvider :dir="dir">
      <div id="app" vaul-drawer-wrapper class="relative h-full overflow-hidden">
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </div>

      <Toaster :theme="colorMode.preference as any || 'system'" />
    </ConfigProvider>

    <!-- PWA Components -->
    <PwaServiceWorkerRegistration />
    <PwaInstallPrompt />

    <Analytics :debug="false" />
  </Body>
</template>
