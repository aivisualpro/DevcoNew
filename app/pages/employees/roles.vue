<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({
  title: 'Roles & Permissions',
  description: 'Manage user roles and their permissions',
  icon: 'i-lucide-lock-keyhole',
})

// ─── Built-in roles ───
interface Role {
  id: string
  name: string
  description: string
  color: string
  icon: string
  usersCount: number
  permissions: string[]
  isSystem: boolean
}

const roles = ref<Role[]>([
  {
    id: 'super-admin',
    name: 'Super Admin',
    description: 'Full system access with all permissions. Can manage all users, settings, and configurations.',
    color: 'indigo',
    icon: 'i-lucide-shield-check',
    usersCount: 2,
    permissions: ['All Permissions'],
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Administrative access to manage employees, jobs, and core business operations.',
    color: 'blue',
    icon: 'i-lucide-shield',
    usersCount: 5,
    permissions: ['Manage Employees', 'Manage Jobs', 'View Reports', 'Manage Auctions', 'Manage Inventory'],
    isSystem: true,
  },
  {
    id: 'employee',
    name: 'Employee',
    description: 'Standard employee access to view assigned jobs and submit timesheets.',
    color: 'emerald',
    icon: 'i-lucide-user-round',
    usersCount: 24,
    permissions: ['View Assigned Jobs', 'Submit Timesheets', 'View Schedule', 'Update Profile'],
    isSystem: true,
  },
  {
    id: 'dealer',
    name: 'Dealer',
    description: 'Dealer access to participate in auctions and manage their bids.',
    color: 'amber',
    icon: 'i-lucide-store',
    usersCount: 12,
    permissions: ['View Auctions', 'Place Bids', 'View Inventory', 'Manage Wishlist'],
    isSystem: true,
  },
  {
    id: 'customer',
    name: 'Customer',
    description: 'Customer access for submitting inspection requests and viewing results.',
    color: 'violet',
    icon: 'i-lucide-user-round',
    usersCount: 48,
    permissions: ['Submit Requests', 'View Inspections', 'View Reports'],
    isSystem: true,
  },
])

// ─── Add Role Dialog ───
const showAddDialog = ref(false)
const newRole = ref({
  name: '',
  description: '',
})

function handleAddRole() {
  if (!newRole.value.name.trim()) {
    toast.error('Please enter a role name')
    return
  }

  const id = newRole.value.name.toLowerCase().replace(/\s+/g, '-')
  if (roles.value.some(r => r.id === id)) {
    toast.error('A role with this name already exists')
    return
  }

  roles.value.push({
    id,
    name: newRole.value.name.trim(),
    description: newRole.value.description.trim() || 'Custom role with configurable permissions.',
    color: 'gray',
    icon: 'i-lucide-user-cog',
    usersCount: 0,
    permissions: [],
    isSystem: false,
  })

  toast.success(`Role "${newRole.value.name}" created`)
  newRole.value = { name: '', description: '' }
  showAddDialog.value = false
}

function handleDeleteRole(role: Role) {
  if (role.isSystem) {
    toast.error('System roles cannot be deleted')
    return
  }
  roles.value = roles.value.filter(r => r.id !== role.id)
  toast.success(`Role "${role.name}" deleted`)
}

function colorClasses(color: string) {
  const map: Record<string, { bg: string, text: string, border: string, iconBg: string }> = {
    indigo: { bg: 'bg-indigo-500/5', text: 'text-indigo-600', border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/10' },
    blue: { bg: 'bg-blue-500/5', text: 'text-blue-600', border: 'border-blue-500/20', iconBg: 'bg-blue-500/10' },
    emerald: { bg: 'bg-emerald-500/5', text: 'text-emerald-600', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/10' },
    amber: { bg: 'bg-amber-500/5', text: 'text-amber-600', border: 'border-amber-500/20', iconBg: 'bg-amber-500/10' },
    violet: { bg: 'bg-violet-500/5', text: 'text-violet-600', border: 'border-violet-500/20', iconBg: 'bg-violet-500/10' },
    gray: { bg: 'bg-gray-500/5', text: 'text-gray-600', border: 'border-gray-500/20', iconBg: 'bg-gray-500/10' },
  }
  return map[color] ?? map.gray!
}
</script>

<template>
  <!-- Teleport toolbar into the main header -->
  <ClientOnly>
    <Teleport to="#header-actions">
      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ roles.length }} role{{ roles.length !== 1 ? 's' : '' }}
      </p>
      <Dialog v-model:open="showAddDialog">
        <DialogTrigger as-child>
          <Button size="sm" class="h-8 gap-1.5">
            <Icon name="i-lucide-plus" class="size-3.5" />
            Add Role
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle class="flex items-center gap-2">
              <Icon name="i-lucide-user-cog" class="size-5 text-primary" />
              Create New Role
            </DialogTitle>
            <DialogDescription>
              Add a custom role with specific permissions for your organization.
            </DialogDescription>
          </DialogHeader>
          <div class="space-y-4 py-4">
            <div class="space-y-2">
              <label class="text-sm font-medium">Role Name</label>
              <Input v-model="newRole.name" placeholder="e.g. Project Manager, Foreman" class="h-9" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Description</label>
              <Input v-model="newRole.description" placeholder="Brief description of this role's purpose" class="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" @click="showAddDialog = false">
              Cancel
            </Button>
            <Button @click="handleAddRole">
              <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <div class="flex-1 min-h-0 overflow-auto">
      <div class="p-4 lg:p-6 space-y-4">
        <!-- Roles Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="role in roles"
            :key="role.id"
            class="group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            :class="[colorClasses(role.color).border, colorClasses(role.color).bg]"
          >
            <!-- Top accent bar -->
            <div
              class="absolute top-0 left-0 right-0 h-1 opacity-60"
              :class="`bg-${role.color}-500`"
            />

            <!-- Card Content -->
            <div class="p-5">
              <!-- Header -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex items-center justify-center size-10 rounded-lg"
                    :class="colorClasses(role.color).iconBg"
                  >
                    <Icon :name="role.icon" class="size-5" :class="colorClasses(role.color).text" />
                  </div>
                  <div>
                    <h3 class="font-bold text-sm flex items-center gap-2">
                      {{ role.name }}
                      <Badge v-if="role.isSystem" variant="outline" class="text-[10px] h-4 px-1.5 font-semibold uppercase tracking-wider">
                        System
                      </Badge>
                    </h3>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ role.usersCount }} user{{ role.usersCount !== 1 ? 's' : '' }}
                    </p>
                  </div>
                </div>

                <!-- Actions -->
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" size="icon" class="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="i-lucide-more-vertical" class="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Icon name="i-lucide-pencil" class="mr-2 size-4" />
                      Edit Role
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Icon name="i-lucide-copy" class="mr-2 size-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      :disabled="role.isSystem"
                      class="text-destructive focus:text-destructive"
                      @click="handleDeleteRole(role)"
                    >
                      <Icon name="i-lucide-trash-2" class="mr-2 size-4" />
                      Delete Role
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <!-- Description -->
              <p class="text-xs text-muted-foreground leading-relaxed mb-4 line-clamp-2">
                {{ role.description }}
              </p>

              <!-- Permissions -->
              <div>
                <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Permissions
                </p>
                <div class="flex flex-wrap gap-1.5">
                  <Badge
                    v-for="perm in role.permissions.slice(0, 4)"
                    :key="perm"
                    variant="secondary"
                    class="text-[10px] h-5 font-medium"
                  >
                    {{ perm }}
                  </Badge>
                  <Badge
                    v-if="role.permissions.length > 4"
                    variant="outline"
                    class="text-[10px] h-5 font-medium"
                  >
                    +{{ role.permissions.length - 4 }} more
                  </Badge>
                  <Badge
                    v-if="role.permissions.length === 0"
                    variant="outline"
                    class="text-[10px] h-5 font-medium text-muted-foreground"
                  >
                    No permissions set
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
