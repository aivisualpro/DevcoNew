<script setup lang="ts">
import type { CrudColumn } from '~/composables/useCrud'
import { toast } from 'vue-sonner'

const props = defineProps<{
  title: string
  description: string
  icon: string
  entityName?: string
  columns: CrudColumn[]
  filterFn: (user: any) => boolean
  showStatusCounts?: boolean
}>()

const _entity = computed(() => props.entityName || 'Employee')

const { setHeader } = usePageHeader()
setHeader({ title: props.title, description: props.description, icon: props.icon })

// ─── Global cached data ───
const {
  allUsers,
  isLoading,
  isFetched,
  fetchError,
  fetchAllUsers,
  refreshUsers,
  isSyncing,
  syncResult,
  createUser,
} = usePeopleApi()

// Eagerly fetch on client only (uses global cache — instant if already loaded)
onMounted(() => fetchAllUsers())

// ─── UI State ───
const search = ref('')

// ─── Sorting ───
type SortDir = 'asc' | 'desc' | null
const sortKey = ref<string>('fullName')
const sortDir = ref<SortDir>('asc')

function toggleSort(key: string) {
  if (sortKey.value === key) {
    if (sortDir.value === 'desc') {
      sortDir.value = 'asc'
    }
    else if (sortDir.value === 'asc') {
      sortDir.value = null
      sortKey.value = ''
    }
    else { sortDir.value = 'desc'; sortKey.value = key }
  }
  else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function getSortIcon(key: string): string {
  if (sortKey.value !== key || !sortDir.value)
    return 'i-lucide-arrow-up-down'
  return sortDir.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function compare(a: any, b: any, key: string, dir: SortDir): number {
  if (!dir)
    return 0
  const av = a[key]
  const bv = b[key]

  if (av == null && bv == null) return 0
  if (av == null) return 1
  if (bv == null) return -1

  let result = 0
  if (key === 'dateHired' || key === 'createdAt') {
    result = new Date(av).getTime() - new Date(bv).getTime()
  }
  else if (typeof av === 'number' && typeof bv === 'number') {
    result = av - bv
  }
  else {
    result = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
  }
  return dir === 'asc' ? result : -result
}

// ─── Base filtered list (before search) for status counts ───
const baseFilteredItems = computed(() => allUsers.value.filter(props.filterFn))

// ─── Approval status counts ───
const approvedCount = computed(() => baseFilteredItems.value.filter(u => u.approvalStatus === 'Approved').length)
const pendingCount = computed(() => baseFilteredItems.value.filter(u => u.approvalStatus === 'Pending').length)
const rejectedCount = computed(() => baseFilteredItems.value.filter(u => u.approvalStatus === 'Rejected').length)

// ─── Client-side filtering ───
const filteredItems = computed(() => {
  let result = baseFilteredItems.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(item =>
      props.columns.some(col =>
        String(item[col.key] ?? '').toLowerCase().includes(q),
      ),
    )
  }

  return result
})

// ─── Sorted items ───
const sortedItems = computed(() => {
  const items = [...filteredItems.value]
  if (sortKey.value && sortDir.value) {
    items.sort((a, b) => compare(a, b, sortKey.value, sortDir.value))
  }
  return items
})

// ─── Infinite scroll (30 per batch) ───
const BATCH_SIZE = 30
const visibleCount = ref(BATCH_SIZE)
const scrollContainerRef = ref<HTMLElement | null>(null)

// Reset visible count on search/sort/filter change
watch([search, sortKey, sortDir, () => props.filterFn], () => {
  visibleCount.value = BATCH_SIZE
})

const visibleItems = computed(() => sortedItems.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < sortedItems.value.length)
const totalFiltered = computed(() => filteredItems.value.length)

function loadMore() {
  if (hasMore.value) {
    visibleCount.value = Math.min(visibleCount.value + BATCH_SIZE, sortedItems.value.length)
  }
}

// Scroll handler for infinite loading
function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  if (!target) return
  const threshold = 200
  if (target.scrollHeight - target.scrollTop - target.clientHeight < threshold) {
    loadMore()
  }
}

// ─── Formatters ───
const badgeClasses: Record<string, string> = {
  // Status values
  'Active': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Inactive': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
  // Role values
  'Super Admin': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'Admin': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Employee': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Dealer': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Customer': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
}

function getBadgeClass(value: string): string {
  return badgeClasses[value] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

function formatDate(value: string): string {
  if (!value)
    return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }
  catch { return value }
}

function getInitials(name: string): string {
  if (!name)
    return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

async function handleRefresh() {
  await refreshUsers()

  if (syncResult.value?.success && syncResult.value.stats) {
    const s = syncResult.value.stats
    const dur = (s.duration / 1000).toFixed(1)
    toast.success(`Synced ${s.total} employees — ${s.created} new, ${s.updated} updated, ${s.removed} removed in ${dur}s`)
  }
  else if (syncResult.value && !syncResult.value.success) {
    toast.error(`Sync failed: ${syncResult.value.message}`)
  }
  else {
    toast.success('Data refreshed from server')
  }
}

// ─── Add Employee Dialog ───
const showAddDialog = ref(false)
const isCreating = ref(false)
const newEmployee = ref({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  mobile: '',
  appRole: 'Employee',
  companyPosition: '',
  designation: '',
  dateHired: '',
  status: 'Active',
})

function resetNewEmployee() {
  newEmployee.value = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    appRole: 'Employee',
    companyPosition: '',
    designation: '',
    dateHired: '',
    status: 'Active',
  }
}

async function handleCreateEmployee() {
  if (!newEmployee.value.firstName || !newEmployee.value.lastName || !newEmployee.value.email) {
    toast.error('First name, last name, and email are required')
    return
  }

  isCreating.value = true
  try {
    const created = await createUser(newEmployee.value)
    toast.success(`${created.fullName} has been added`)
    showAddDialog.value = false
    resetNewEmployee()
    // Navigate to the new employee detail
    navigateTo(`/employees/detail/${created.id}`)
  }
  catch (err: any) {
    toast.error(err?.message || 'Failed to create employee')
  }
  finally {
    isCreating.value = false
  }
}
</script>

<template>
  <!-- Teleport toolbar into the main header -->
  <ClientOnly>
    <Teleport to="#header-actions">
      <div v-if="showStatusCounts && isFetched" class="hidden sm:flex items-center gap-1.5">
        <Badge variant="outline" class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs tabular-nums gap-1">
          <Icon name="i-lucide-check-circle" class="size-3" />
          {{ approvedCount }} Approved
        </Badge>
        <Badge variant="outline" class="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs tabular-nums gap-1">
          <Icon name="i-lucide-clock" class="size-3" />
          {{ pendingCount }} Pending
        </Badge>
        <Badge variant="outline" class="bg-red-500/10 text-red-600 border-red-500/20 text-xs tabular-nums gap-1">
          <Icon name="i-lucide-x-circle" class="size-3" />
          {{ rejectedCount }} Rejected
        </Badge>
      </div>
      <Separator v-if="showStatusCounts && isFetched" orientation="vertical" class="h-5 hidden sm:block" />
      <div class="relative">
        <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input v-model="search" placeholder="Search employees..." class="pl-8 h-8 w-48 text-sm" />
      </div>
      <p class="text-xs text-muted-foreground tabular-nums hidden sm:block whitespace-nowrap">
        {{ totalFiltered }} record{{ totalFiltered !== 1 ? 's' : '' }}
      </p>
      <Button variant="ghost" size="sm" class="h-8" :disabled="isLoading || isSyncing" @click="handleRefresh">
        <Icon name="i-lucide-refresh-cw" class="mr-1 size-3.5" :class="{ 'animate-spin': isLoading || isSyncing }" />
        {{ isSyncing ? 'Syncing...' : 'Refresh' }}
      </Button>
      <Button size="sm" class="h-8" @click="showAddDialog = true">
        <Icon name="i-lucide-plus" class="mr-1 size-3.5" />
        Add Employee
      </Button>
    </Teleport>
  </ClientOnly>

  <div class="w-full flex flex-col h-full overflow-hidden">
    <!-- Error Banner -->
    <div v-if="fetchError" class="shrink-0 m-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <Icon name="i-lucide-alert-circle" class="size-5 text-destructive shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-medium text-destructive">
          Failed to load employees
        </p>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ fetchError }}
        </p>
      </div>
      <Button variant="outline" size="sm" @click="handleRefresh">
        Retry
      </Button>
    </div>

    <!-- Table (scrollable with infinite scroll) -->
    <ClientOnly>
      <div v-if="!fetchError" ref="scrollContainerRef" class="flex-1 min-h-0 overflow-auto" @scroll="handleScroll">
        <Table>
          <TableHeader class="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
            <TableRow>
              <TableHead
                v-for="col in columns"
                :key="col.key"
                class="text-[10px] h-8 select-none cursor-pointer hover:bg-muted/80 transition-colors group/th"
                @click="toggleSort(col.key)"
              >
                <div class="flex items-center gap-1">
                  <span>{{ col.label }}</span>
                  <Icon
                    :name="getSortIcon(col.key)"
                    class="size-3 shrink-0 transition-opacity"
                    :class="sortKey === col.key && sortDir ? 'text-primary opacity-100' : 'opacity-0 group-hover/th:opacity-40'"
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="item in visibleItems"
              :key="item.id || item._id"
              class="group cursor-pointer hover:bg-muted/50"
              @click="navigateTo(`/employees/detail/${item.id || item._id}`)"
            >
              <TableCell v-for="col in columns" :key="col.key">
                <!-- Avatar -->
                <div v-if="col.type === 'avatar'" class="flex items-center gap-3">
                  <Avatar class="size-8 border">
                    <AvatarImage :src="item.profilePicture || item.image" :alt="item[col.key]" />
                    <AvatarFallback class="text-xs">
                      {{ getInitials(item[col.key]) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="font-medium text-[10px]">{{ item[col.key] || '—' }}</span>
                </div>
                <!-- Badge -->
                <Badge v-else-if="col.type === 'badge'" variant="outline" :class="getBadgeClass(item[col.key])">
                  {{ item[col.key] || '—' }}
                </Badge>
                <!-- Date -->
                <span v-else-if="col.type === 'date'" class="text-muted-foreground text-[10px]">
                  {{ formatDate(item[col.key]) }}
                </span>
                <!-- Tags -->
                <div v-else-if="col.type === 'tags'" class="flex flex-wrap gap-1">
                  <Badge v-for="tag in (item[col.key] || [])" :key="tag" variant="secondary" class="text-xs font-normal">
                    {{ tag }}
                  </Badge>
                </div>
                <!-- Default text -->
                <span v-else class="text-[10px]">{{ item[col.key] ?? '—' }}</span>
              </TableCell>
            </TableRow>
            <!-- Loading rows -->
            <TableRow v-if="!isFetched && !fetchError">
              <TableCell :colspan="columns.length" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
                  <p class="text-sm">
                    Loading employees...
                  </p>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-else-if="visibleItems.length === 0">
              <TableCell :colspan="columns.length" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <Icon name="i-lucide-inbox" class="size-8" />
                  <p>No records found</p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <!-- Loading more indicator -->
        <div v-if="hasMore" class="flex items-center justify-center py-4 text-muted-foreground">
          <Icon name="i-lucide-loader-2" class="size-4 animate-spin mr-2" />
          <span class="text-xs">Scroll for more...</span>
        </div>
      </div>

      <template #fallback>
        <div class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon name="i-lucide-loader-2" class="size-6 animate-spin" />
            <p class="text-sm">Loading employees...</p>
          </div>
        </div>
      </template>
    </ClientOnly>

    <!-- Footer status bar -->
    <ClientOnly>
      <div v-if="isFetched && !fetchError" class="shrink-0 border-t bg-muted/30 px-4 lg:px-6 py-2 flex items-center justify-between gap-2">
        <p class="text-xs text-muted-foreground tabular-nums">
          Showing {{ visibleItems.length }} of {{ totalFiltered }} records
        </p>
        <p v-if="sortKey && sortDir" class="text-xs text-muted-foreground flex items-center gap-1">
          <Icon :name="sortDir === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3" />
          Sorted by {{ columns.find(c => c.key === sortKey)?.label || sortKey }}
        </p>
      </div>
    </ClientOnly>
  </div>

  <!-- ─── Add Employee Dialog ─── -->
  <Dialog :open="showAddDialog" @update:open="showAddDialog = $event">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Employee</DialogTitle>
        <DialogDescription>
          Fill in the details to create a new employee.
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label for="add-firstName" class="text-xs">First Name *</Label>
            <Input id="add-firstName" v-model="newEmployee.firstName" placeholder="John" class="h-8 text-sm" />
          </div>
          <div class="grid gap-1.5">
            <Label for="add-lastName" class="text-xs">Last Name *</Label>
            <Input id="add-lastName" v-model="newEmployee.lastName" placeholder="Doe" class="h-8 text-sm" />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="add-email" class="text-xs">Email *</Label>
          <Input id="add-email" v-model="newEmployee.email" type="email" placeholder="john@devco-inc.com" class="h-8 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label for="add-phone" class="text-xs">Phone</Label>
            <Input id="add-phone" v-model="newEmployee.phone" placeholder="(555) 000-0000" class="h-8 text-sm" />
          </div>
          <div class="grid gap-1.5">
            <Label for="add-mobile" class="text-xs">Mobile</Label>
            <Input id="add-mobile" v-model="newEmployee.mobile" placeholder="(555) 000-0000" class="h-8 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label class="text-xs">App Role</Label>
            <Select v-model="newEmployee.appRole">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Super Admin">Super Admin</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs">Status</Label>
            <Select v-model="newEmployee.status">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label for="add-position" class="text-xs">Company Position</Label>
            <Input id="add-position" v-model="newEmployee.companyPosition" placeholder="Foreman" class="h-8 text-sm" />
          </div>
          <div class="grid gap-1.5">
            <Label for="add-designation" class="text-xs">Designation</Label>
            <Input id="add-designation" v-model="newEmployee.designation" placeholder="Project Manager" class="h-8 text-sm" />
          </div>
        </div>
        <div class="grid gap-1.5">
          <Label for="add-dateHired" class="text-xs">Date Hired</Label>
          <Input id="add-dateHired" v-model="newEmployee.dateHired" type="date" class="h-8 text-sm" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" size="sm" @click="showAddDialog = false; resetNewEmployee()">
          Cancel
        </Button>
        <Button size="sm" :disabled="isCreating" @click="handleCreateEmployee">
          <Icon v-if="isCreating" name="i-lucide-loader-2" class="mr-1.5 size-3.5 animate-spin" />
          <Icon v-else name="i-lucide-plus" class="mr-1.5 size-3.5" />
          {{ isCreating ? 'Creating...' : 'Add Employee' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
