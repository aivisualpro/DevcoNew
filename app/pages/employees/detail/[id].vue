<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const userId = computed(() => route.params.id as string)

const {
  allUsers,
  fetchAllUsers,
  isFetched,
  isLoading,
  updateUser,
  deleteUser,
} = usePeopleApi()

// Eagerly fetch on client only (uses global cache — instant if already loaded)
onMounted(() => fetchAllUsers())

// Find user from store
const user = computed(() => allUsers.value.find(u => u.id === userId.value || u._id === userId.value))

// ─── Map appRole → category slug for back navigation ───
const roleToCategorySlug: Record<string, string> = {
  'Super Admin': 'super-admin',
  'Admin': 'admin',
  'Employee': 'employees',
}

const categorySlug = computed(() => {
  const role = user.value?.appRole
  if (!role)
    return 'super-admin'
  return roleToCategorySlug[role] || 'employees'
})

const categoryLabel = computed(() => {
  const role = user.value?.appRole
  return role || 'Employees'
})

// Update header with breadcrumb-style title
const { setHeader } = usePageHeader()

// Set immediate loading header so the raw ID never shows
setHeader({
  title: 'Employees',
  icon: 'i-lucide-user',
  backLink: {
    label: 'Employees',
    href: '/employees/super-admin',
  },
})

watchEffect(() => {
  if (user.value) {
    setHeader({
      title: `Employees / ${categoryLabel.value} / ${user.value.fullName || 'Unknown'}`,
      icon: 'i-lucide-user',
      backLink: {
        label: 'Employees',
        href: `/employees/${categorySlug.value}`,
      },
    })
  }
  else if (!isLoading.value && isFetched.value) {
    setHeader({
      title: 'Employee Not Found',
      description: 'The requested employee could not be found',
      icon: 'i-lucide-user-x',
      backLink: {
        label: 'Employees',
        href: '/employees/super-admin',
      },
    })
  }
})

// ─── Edit Dialog ───
const showEditDialog = ref(false)
const isSaving = ref(false)
const editForm = ref<Record<string, any>>({})

function openEditDialog() {
  if (!user.value)
    return
  editForm.value = { ...user.value }
  showEditDialog.value = true
}

async function handleSave() {
  if (!user.value)
    return
  isSaving.value = true
  try {
    await updateUser(user.value.id || user.value._id, editForm.value)
    showEditDialog.value = false
    toast.success('Employee updated successfully')
  }
  catch (err: any) {
    toast.error(err?.message || 'Failed to update employee')
  }
  finally {
    isSaving.value = false
  }
}

// ─── Delete Confirmation ───
const showDeleteDialog = ref(false)
const isDeleting = ref(false)

async function handleDelete() {
  if (!user.value)
    return
  isDeleting.value = true
  try {
    await deleteUser(user.value.id || user.value._id)
    toast.success(`${user.value.fullName} has been deleted`)
    navigateTo(`/employees/${categorySlug.value}`)
  }
  catch (err: any) {
    toast.error(err?.message || 'Failed to delete employee')
  }
  finally {
    isDeleting.value = false
  }
}

// Formatters
function formatDate(date: string) {
  if (!date)
    return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  catch { return date }
}

function formatCurrency(value: any) {
  if (!value && value !== 0)
    return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value))
}

function getInitials(name: string) {
  if (!name)
    return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const badgeClasses: Record<string, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Inactive: 'bg-red-500/10 text-red-600 border-red-500/20',
  Approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const getBadgeClass = (status: string) => badgeClasses[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'

// ─── Check if a doc field has a value ───
function hasDoc(value: any): boolean {
  if (!value)
    return false
  if (typeof value === 'string')
    return value.trim().length > 0 && value !== '—'
  if (typeof value === 'boolean')
    return value
  return true
}

// ─── Document/Compliance fields ───
const complianceDocs = computed(() => [
  { key: 'applicationResume', label: 'Application / Resume', icon: 'i-lucide-file-text' },
  { key: 'employeeHandbook', label: 'Employee Handbook', icon: 'i-lucide-book-open' },
  { key: 'quickbooksW4I9DD', label: 'QuickBooks W4/I9/DD', icon: 'i-lucide-file-check' },
  { key: 'workforce', label: 'Workforce', icon: 'i-lucide-users' },
  { key: 'emergencyContact', label: 'Emergency Contact Form', icon: 'i-lucide-heart-pulse' },
  { key: 'dotRelease', label: 'DOT Release', icon: 'i-lucide-shield' },
  { key: 'dmvPullNotifications', label: 'DMV Pull Notifications', icon: 'i-lucide-bell' },
  { key: 'drivingRecordPermission', label: 'Driving Record Permission', icon: 'i-lucide-car' },
  { key: 'backgroundCheck', label: 'Background Check', icon: 'i-lucide-search-check' },
  { key: 'copyOfDL', label: 'Copy of Driver\'s License', icon: 'i-lucide-credit-card' },
  { key: 'copyOfSS', label: 'Copy of Social Security', icon: 'i-lucide-lock' },
  { key: 'lcpTracker', label: 'LCP Tracker', icon: 'i-lucide-activity' },
  { key: 'edd', label: 'EDD', icon: 'i-lucide-landmark' },
  { key: 'autoInsurance', label: 'Auto Insurance', icon: 'i-lucide-shield-check' },
  { key: 'veriforce', label: 'Veriforce', icon: 'i-lucide-badge-check' },
  { key: 'unionPaperwork1184', label: 'Union Paperwork (1184)', icon: 'i-lucide-clipboard-list' },
  { key: 'driverLicense', label: 'Driver\'s License', icon: 'i-lucide-id-card' },
])
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full overflow-auto">
      <!-- Loading State -->
      <div v-if="isLoading && !user" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin mb-4" />
        <p>Loading employee details...</p>
      </div>

      <!-- Not Found State -->
      <div v-else-if="!user" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
        <Icon name="i-lucide-user-x" class="size-10 mb-4" />
        <h3 class="text-lg font-medium text-foreground">
          Employee Not Found
        </h3>
        <p class="mb-4">
          The employee with ID {{ userId }} does not exist.
        </p>
        <Button variant="outline" @click="navigateTo('/employees')">
          View All Employees
        </Button>
      </div>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- Details Content -->
      <!-- ═══════════════════════════════════════════════════ -->
      <template v-else>
        <!-- ─── Header Card ─── -->
        <Card class="overflow-hidden">
          <div class="h-24 bg-gradient-to-r from-primary/5 via-muted to-primary/5 border-b relative">
            <div class="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
          </div>
          <CardContent class="relative pb-6">
            <div class="flex flex-col sm:flex-row gap-5 items-start sm:items-end -mt-10 px-2">
              <Avatar class="size-20 sm:size-24 border-4 border-background shadow-lg shrink-0">
                <AvatarImage :src="user.profilePicture || user.image" :alt="user.fullName" class="object-cover" />
                <AvatarFallback class="text-2xl bg-primary/10 text-primary">
                  {{ getInitials(user.fullName) }}
                </AvatarFallback>
              </Avatar>

              <div class="flex-1 space-y-1.5 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-xl sm:text-2xl font-bold tracking-tight truncate">
                    {{ user.fullName }}
                  </h1>
                  <Badge :class="getBadgeClass(user.status || user.approvalStatus)">
                    {{ user.status || user.approvalStatus || 'Active' }}
                  </Badge>
                </div>
                <div class="space-y-0.5 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <Icon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
                    {{ [user.address, user.city, user.state, user.zip].filter(Boolean).join(', ') || '—' }}
                  </div>
                  <div class="flex items-center gap-1">
                    <Icon name="i-lucide-phone" class="size-3.5 shrink-0" />
                    {{ user.phone || user.mobile || '—' }}
                  </div>
                  <div class="flex items-center gap-1">
                    <Icon name="i-lucide-mail" class="size-3.5 shrink-0" />
                    {{ user.email || '—' }}
                  </div>
                  <div class="flex items-center gap-1">
                    <Icon name="i-lucide-cake" class="size-3.5 shrink-0" />
                    {{ formatDate(user.dob) }}
                  </div>
                </div>
              </div>

              <div class="flex gap-2 shrink-0 w-full sm:w-auto">
                <Button variant="outline" size="sm" @click="openEditDialog">
                  <Icon name="i-lucide-pencil" class="mr-1.5 size-3.5" />
                  Edit Profile
                </Button>
                <Button variant="destructive" size="sm" @click="showDeleteDialog = true">
                  <Icon name="i-lucide-trash-2" class="mr-1.5 size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- ─── Main Grid ─── -->
        <div class="grid lg:grid-cols-3 gap-4">
          <!-- ═══ LEFT COLUMN ═══ -->
          <div class="space-y-4 lg:col-span-1">
            <!-- Devco Identification -->
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-sm flex items-center gap-2">
                  <Icon name="i-lucide-building" class="size-4 text-blue-500" />
                  Devco Identification
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-2.5 text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Employee ID</span>
                  <span class="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">{{ user._id || user.id }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">App Role</span>
                  <Badge variant="secondary" class="text-[10px]">
                    {{ user.appRole || user.userRole || 'Employee' }}
                  </Badge>
                </div>
                <div class="space-y-1.5">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Permissions</span>
                  <div class="flex flex-wrap gap-1">
                    <Badge v-for="perm in (user.permissions || [])" :key="perm" variant="outline" class="text-[10px] font-normal bg-muted/50">
                      {{ perm }}
                    </Badge>
                    <span v-if="!user.permissions?.length" class="text-xs text-muted-foreground italic">No specific permissions</span>
                  </div>
                </div>
                <Separator />
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Date Hired</span>
                  <span class="text-xs">{{ formatDate(user.dateHired) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Company Position</span>
                  <span class="text-xs">{{ user.companyPosition || '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Designation</span>
                  <span class="text-xs">{{ user.designation || '—' }}</span>
                </div>
                <Separator />
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Group No</span>
                  <span class="text-xs">{{ user.groupNo || '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Hourly Rate (SITE)</span>
                  <span class="text-xs font-bold tabular-nums" :class="user.hourlyRateSITE ? 'text-emerald-600' : ''">{{ user.hourlyRateSITE ? formatCurrency(user.hourlyRateSITE) : '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Hourly Rate (Drive)</span>
                  <span class="text-xs font-bold tabular-nums" :class="user.hourlyRateDrive ? 'text-emerald-600' : ''">{{ user.hourlyRateDrive ? formatCurrency(user.hourlyRateDrive) : '—' }}</span>
                </div>
                <Separator />
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Separation Date</span>
                  <span class="text-xs">{{ formatDate(user.separationDate) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Separation Reason</span>
                  <span class="text-xs">{{ user.separationReason || '—' }}</span>
                </div>
                <Separator />
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Schedule Active</span>
                  <div class="flex items-center gap-1.5">
                    <Icon :name="user.isScheduleActive ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'" class="size-3.5" :class="user.isScheduleActive ? 'text-emerald-500' : 'text-muted-foreground'" />
                    <span class="text-xs">{{ user.isScheduleActive ? 'Yes' : 'No' }}</span>
                  </div>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Status</span>
                  <Badge :class="getBadgeClass(user.status || 'Active')" class="text-[10px]">
                    {{ user.status || 'Active' }}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <!-- ═══ RIGHT COLUMN ═══ -->
          <div class="space-y-4 lg:col-span-2">
            <!-- Documents & Compliance -->
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-sm flex items-center gap-2">
                  <Icon name="i-lucide-folder-check" class="size-4 text-amber-500" />
                  Documents & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div class="grid sm:grid-cols-2 gap-2">
                  <div
                    v-for="doc in complianceDocs"
                    :key="doc.key"
                    class="flex items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-xs transition-colors"
                    :class="hasDoc(user[doc.key])
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-muted/30 border-border'"
                  >
                    <Icon
                      :name="hasDoc(user[doc.key]) ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
                      class="size-4 shrink-0"
                      :class="hasDoc(user[doc.key]) ? 'text-emerald-500' : 'text-muted-foreground/40'"
                    />
                    <span class="flex-1 truncate" :class="hasDoc(user[doc.key]) ? 'font-medium' : 'text-muted-foreground'">
                      {{ doc.label }}
                    </span>
                    <a
                      v-if="hasDoc(user[doc.key]) && typeof user[doc.key] === 'string' && user[doc.key].startsWith('http')"
                      :href="user[doc.key]"
                      target="_blank"
                      class="text-primary hover:text-primary/80"
                      @click.stop
                    >
                      <Icon name="i-lucide-external-link" class="size-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            <!-- Emergency Contact -->
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-sm flex items-center gap-2">
                  <Icon name="i-lucide-heart-pulse" class="size-4 text-red-500" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-2.5 text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Name</span>
                  <span class="text-xs">{{ user.emergencyContactName || '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Email</span>
                  <span class="text-xs">{{ user.emergencyContactEmail || '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Phone</span>
                  <span class="text-xs">{{ user.emergencyContactPhone || user.emergencyContact || '—' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Relation</span>
                  <span class="text-xs">{{ user.emergencyContactRelation || '—' }}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </template>
    </div>

    <!-- ─── Edit Employee Dialog ─── -->
    <Dialog :open="showEditDialog" @update:open="showEditDialog = $event">
      <DialogContent class="sm:max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update {{ editForm.firstName }} {{ editForm.lastName }}'s details.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">First Name</Label>
              <Input v-model="editForm.firstName" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Last Name</Label>
              <Input v-model="editForm.lastName" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Email</Label>
              <Input v-model="editForm.email" type="email" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">App Role</Label>
              <Select v-model="editForm.appRole">
                <SelectTrigger class="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super Admin">
                    Super Admin
                  </SelectItem>
                  <SelectItem value="Admin">
                    Admin
                  </SelectItem>
                  <SelectItem value="Employee">
                    Employee
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Phone</Label>
              <Input v-model="editForm.phone" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Mobile</Label>
              <Input v-model="editForm.mobile" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Company Position</Label>
              <Input v-model="editForm.companyPosition" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Designation</Label>
              <Input v-model="editForm.designation" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Address</Label>
              <Input v-model="editForm.address" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">City</Label>
              <Input v-model="editForm.city" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">State</Label>
              <Input v-model="editForm.state" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Zip</Label>
              <Input v-model="editForm.zip" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Date of Birth</Label>
              <Input v-model="editForm.dob" type="date" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Driver's License</Label>
              <Input v-model="editForm.driverLicense" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Date Hired</Label>
              <Input v-model="editForm.dateHired" type="date" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Status</Label>
              <Select v-model="editForm.status">
                <SelectTrigger class="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">
                    Active
                  </SelectItem>
                  <SelectItem value="Inactive">
                    Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Hourly Rate (SITE)</Label>
              <Input v-model="editForm.hourlyRateSITE" type="number" step="0.01" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Hourly Rate (Drive)</Label>
              <Input v-model="editForm.hourlyRateDrive" type="number" step="0.01" class="h-8 text-sm" />
            </div>
          </div>
          <div class="grid gap-1.5">
            <Label class="text-xs">Emergency Contact</Label>
            <Input v-model="editForm.emergencyContact" class="h-8 text-sm" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="grid gap-1.5">
              <Label class="text-xs">Group No</Label>
              <Input v-model="editForm.groupNo" class="h-8 text-sm" />
            </div>
            <div class="grid gap-1.5">
              <Label class="text-xs">Separation Reason</Label>
              <Input v-model="editForm.separationReason" class="h-8 text-sm" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" @click="showEditDialog = false">
            Cancel
          </Button>
          <Button size="sm" :disabled="isSaving" @click="handleSave">
            <Icon v-if="isSaving" name="i-lucide-loader-2" class="mr-1.5 size-3.5 animate-spin" />
            <Icon v-else name="i-lucide-save" class="mr-1.5 size-3.5" />
            {{ isSaving ? 'Saving...' : 'Save Changes' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- ─── Delete Confirmation Dialog ─── -->
    <Dialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{{ user?.fullName }}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" @click="showDeleteDialog = false">
            Cancel
          </Button>
          <Button variant="destructive" size="sm" :disabled="isDeleting" @click="handleDelete">
            <Icon v-if="isDeleting" name="i-lucide-loader-2" class="mr-1.5 size-3.5 animate-spin" />
            <Icon v-else name="i-lucide-trash-2" class="mr-1.5 size-3.5" />
            {{ isDeleting ? 'Deleting...' : 'Delete Employee' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.bg-grid-black\/\[0\.02\] {
  background-size: 40px 40px;
  background-image: linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
}
.dark .bg-grid-white\/\[0\.02\] {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
}
</style>
