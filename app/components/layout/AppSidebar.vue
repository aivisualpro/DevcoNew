<script setup lang="ts">
import type { NavGroup, NavLink, NavSectionTitle } from '~/types/nav'
import { navMenu, navMenuBottom } from '~/constants/menus'

function resolveNavItemComponent(item: NavLink | NavGroup | NavSectionTitle): any {
  if ('children' in item)
    return resolveComponent('LayoutSidebarNavGroup')

  return resolveComponent('LayoutSidebarNavLink')
}

const teams: {
  name: string
  logo: string
  plan: string
}[] = [
  {
    name: 'DEVCO Super Admin',
    logo: 'i-lucide-gallery-vertical-end',
    plan: 'Workspace',
  },
  {
    name: 'DEVCO Admin',
    logo: 'i-lucide-audio-waveform',
    plan: 'Workspace',
  },
  {
    name: 'DEVCO Employee',
    logo: 'i-lucide-command',
    plan: 'Workspace',
  },
]

const userDataCookie = useCookie('userData')
const user = computed(() => {
  try {
    const raw = userDataCookie.value
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && (parsed.firstName || parsed.name || parsed.email)) {
      const firstName = parsed.firstName || ''
      const lastName = parsed.lastName || ''
      const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : (parsed.name || firstName || 'User')
      return {
        name: fullName,
        email: parsed.email || '',
        avatar: parsed.profilePicture || parsed.profileImage || parsed.avatar || parsed.photo || '',
        appRole: parsed.appRole || '',
      }
    }
  }
  catch {}
  return {
    name: 'Adeel Jabbar',
    email: 'adeel@aivisualpro.com',
    avatar: '/avatars/adeel.png',
    appRole: 'Super Admin',
  }
})

// Set browser favicon to user's profile image
watch(user, (u) => {
  if (u.avatar && import.meta.client) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = u.avatar
  }
}, { immediate: true })

const { sidebar } = useAppSettings()
</script>

<template>
  <Sidebar :collapsible="sidebar?.collapsible" :side="sidebar?.side" :variant="sidebar?.variant">
    <SidebarHeader>
      <LayoutSidebarNavHeader :teams="teams" />
      <Search />
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup v-for="(nav, indexGroup) in navMenu" :key="indexGroup">
        <SidebarGroupLabel v-if="nav.heading">
          {{ nav.heading }}
        </SidebarGroupLabel>
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in nav.items" :key="index" :item="item" />
      </SidebarGroup>
      <SidebarGroup class="mt-auto">
        <component :is="resolveNavItemComponent(item)" v-for="(item, index) in navMenuBottom" :key="index" :item="item" size="sm" />
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>
      <LayoutSidebarNavFooter :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>

<style scoped>

</style>
