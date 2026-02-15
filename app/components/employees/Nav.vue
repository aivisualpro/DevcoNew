<script setup lang="ts">
const route = useRoute()

const { allUsers, isFetched, fetchAllUsers } = usePeopleApi()

// Fetch users for live counts
onMounted(() => {
  fetchAllUsers()
})

const navItems = [
  { id: 'super-admin', title: 'Super Admin', icon: 'i-lucide-shield-check', color: 'text-indigo-500', link: '/employees/super-admin' },
  { id: 'admin', title: 'Admin', icon: 'i-lucide-shield', color: 'text-blue-500', link: '/employees/admin' },
  { id: 'employees', title: 'Employees', icon: 'i-lucide-users', color: 'text-emerald-500', link: '/employees/employees' },
]

const bottomItems = [
  { id: 'roles', title: 'Roles & Permissions', icon: 'i-lucide-lock-keyhole', color: 'text-amber-500', link: '/employees/roles' },
]

const currentActiveId = computed(() => {
  const path = route.path
  return path.split('/').pop() || 'super-admin'
})

// Live counts based on fetched data
function getCount(id: string): number {
  if (!isFetched.value) return 0
  const users = allUsers.value
  switch (id) {
    case 'super-admin': return users.filter(u => u.appRole === 'Super Admin').length
    case 'admin': return users.filter(u => u.appRole === 'Admin').length
    case 'employees': return users.filter(u =>
      u.appRole === 'Employee'
      || (u.appRole && !['Super Admin', 'Admin', 'Dealer', 'Customer'].includes(u.appRole)),
    ).length
    default: return 0
  }
}
</script>

<template>
  <div class="flex flex-col gap-1 p-2">
    <NuxtLink
      v-for="item in navItems"
      :key="item.id"
      :to="item.link"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
      :class="[
        currentActiveId === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ]"
    >
      <Icon :name="item.icon" class="size-4 shrink-0" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ item.title }}</span>
      <Badge v-if="isFetched" variant="secondary" class="h-5 min-w-5 justify-center px-1.5 text-[10px] font-bold tabular-nums">
        {{ getCount(item.id) }}
      </Badge>
    </NuxtLink>

    <!-- Separator -->
    <div class="my-2 h-px bg-border mx-2" />

    <NuxtLink
      v-for="item in bottomItems"
      :key="item.id"
      :to="item.link"
      class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground"
      :class="[
        currentActiveId === item.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
      ]"
    >
      <Icon :name="item.icon" class="size-4 shrink-0" :class="currentActiveId === item.id ? item.color : 'text-muted-foreground'" />
      <span class="flex-1 text-left">{{ item.title }}</span>
    </NuxtLink>
  </div>
</template>
