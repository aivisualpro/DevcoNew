<script setup lang="ts">
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const userId = computed(() => route.params.id as string)

const {
  allUsers,
  fetchAllUsers,
  isFetched,
  isLoading
} = usePeopleApi()

// Find user from store
const user = computed(() => allUsers.value.find(u => u.id === userId.value || u._id === userId.value))

// Ensure data is loaded
onMounted(async () => {
  if (!isFetched.value && !isLoading.value) {
    await fetchAllUsers()
  }
})

// Update header
const { setHeader } = usePageHeader()

watchEffect(() => {
  if (user.value) {
    setHeader({
      title: user.value.fullName || 'Employee Details',
      description: `Viewing details for ${user.value.email}`,
      icon: 'i-lucide-user'
    })
  } else if (!isLoading.value && isFetched.value) {
    setHeader({
      title: 'Employee Not Found',
      description: 'The requested employee could not be found',
      icon: 'i-lucide-user-x'
    })
  }
})

// Formatters
const formatDate = (date: string) => {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return date }
}

const getInitials = (name: string) => {
  if (!name) return '??'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const badgeClasses: Record<string, string> = {
  'Active': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Inactive': 'bg-red-500/10 text-red-600 border-red-500/20',
  'Approved': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Pending': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Rejected': 'bg-red-500/10 text-red-600 border-red-500/20',
}

const getBadgeClass = (status: string) => badgeClasses[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'

</script>

<template>
  <div class="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
    <!-- Back Button -->
    <div>
      <Button variant="ghost" size="sm" class="-ml-2 text-muted-foreground" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
        Back to Employees
      </Button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && !user" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
      <Icon name="i-lucide-loader-2" class="size-8 animate-spin mb-4" />
      <p>Loading employee details...</p>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!user" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
      <Icon name="i-lucide-user-x" class="size-10 mb-4" />
      <h3 class="text-lg font-medium text-foreground">Employee Not Found</h3>
      <p class="mb-4">The employee with ID {{ userId }} does not exist or you don't have permission to view them.</p>
      <Button variant="outline" @click="router.push('/employees')">View All Employees</Button>
    </div>

    <!-- Details Content -->
    <div v-else class="grid gap-6">
      
      <!-- Header Card -->
      <Card class="overflow-hidden">
        <div class="h-32 bg-gradient-to-r from-muted/50 via-muted to-muted/50 border-b relative">
            <div class="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        </div>
        <CardContent class="relative pb-8">
          <div class="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 px-2">
            
            <!-- Avatar -->
            <Avatar class="size-24 sm:size-32 border-4 border-background shadow-lg">
              <AvatarImage :src="user.profilePicture || user.image" :alt="user.fullName" class="object-cover" />
              <AvatarFallback class="text-3xl bg-primary/10 text-primary">
                {{ getInitials(user.fullName) }}
              </AvatarFallback>
            </Avatar>

            <!-- Info -->
            <div class="flex-1 space-y-2 min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-2xl sm:text-3xl font-bold tracking-tight truncate">{{ user.fullName }}</h1>
                <Badge :class="getBadgeClass(user.status || user.approvalStatus)">
                  {{ user.status || user.approvalStatus || 'Active' }}
                </Badge>
              </div>
              <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <div class="flex items-center gap-1.5">
                  <Icon name="i-lucide-briefcase" class="size-4" />
                  {{ user.designation || user.companyPosition || 'No Designation' }}
                </div>
                <div class="flex items-center gap-1.5">
                  <Icon name="i-lucide-building-2" class="size-4" />
                  {{ user.dealershipName || 'DEVCO' }}
                </div>
                <div class="flex items-center gap-1.5">
                  <Icon name="i-lucide-map-pin" class="size-4" />
                  {{ user.city && user.state ? `${user.city}, ${user.state}` : (user.location || 'Remote') }}
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-2 shrink-0 w-full sm:w-auto mt-4 sm:mt-0">
               <Button variant="outline">
                <Icon name="i-lucide-pencil" class="mr-2 size-4" />
                Edit Profile
               </Button>
               <Button>
                <Icon name="i-lucide-mail" class="mr-2 size-4" />
                Message
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Main Info Grid -->
      <div class="grid lg:grid-cols-3 gap-6">
        
        <!-- Left Column: Contact & Basic Info -->
        <div class="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <Icon name="i-lucide-contact" class="size-4 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent class="grid gap-4">
              <div class="grid gap-1">
                <label class="text-xs font-medium text-muted-foreground">Email</label>
                <div class="flex items-center gap-2 text-sm break-all">
                  <Icon name="i-lucide-mail" class="size-3.5 text-muted-foreground" />
                  <a :href="`mailto:${user.email}`" class="hover:underline">{{ user.email }}</a>
                </div>
              </div>

              <Separator />

              <div class="grid gap-1">
                <label class="text-xs font-medium text-muted-foreground">Phone</label>
                 <div class="flex items-center gap-2 text-sm">
                  <Icon name="i-lucide-phone" class="size-3.5 text-muted-foreground" />
                  <a :href="`tel:${user.phone}`" class="hover:underline">{{ user.phone || '—' }}</a>
                </div>
              </div>

               <div class="grid gap-1">
                <label class="text-xs font-medium text-muted-foreground">Mobile</label>
                 <div class="flex items-center gap-2 text-sm">
                  <Icon name="i-lucide-smartphone" class="size-3.5 text-muted-foreground" />
                  <a :href="`tel:${user.mobile}`" class="hover:underline">{{ user.mobile || '—' }}</a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle class="text-base flex items-center gap-2">
                <Icon name="i-lucide-shield-check" class="size-4 text-primary" />
                Role & Access
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
               <div class="flex justify-between items-center">
                  <span class="text-sm font-medium">App Role</span>
                  <Badge variant="secondary">{{ user.appRole || user.userRole || 'Employee' }}</Badge>
               </div>
               <Separator />
               <div class="space-y-2">
                 <p class="text-xs font-medium text-muted-foreground">Permissions</p>
                 <div class="flex flex-wrap gap-1">
                   <Badge v-for="perm in (user.permissions || [])" :key="perm" variant="outline" class="text-xs font-normal bg-muted/50">
                     {{ perm }}
                   </Badge>
                   <span v-if="!user.permissions?.length" class="text-sm text-muted-foreground italic">No specific permissions</span>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>

        <!-- Right Column: Employment & Professional Details -->
        <div class="space-y-6 lg:col-span-2">
          
          <div class="grid sm:grid-cols-2 gap-4">
            <!-- Employment Card -->
             <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Date Hired</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-bold">{{ formatDate(user.dateHired) }}</div>
                <p class="text-xs text-muted-foreground mt-1">
                   {{ user.dateHired ? 'Joined the team' : 'Date not set' }}
                </p>
              </CardContent>
             </Card>

             <!-- Position Card -->
             <Card>
              <CardHeader class="pb-2">
                <CardTitle class="text-sm font-medium text-muted-foreground">Current Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div class="text-2xl font-bold truncate">{{ user.designation || 'None' }}</div>
                 <p class="text-xs text-muted-foreground mt-1">
                   {{ user.companyPosition || user.department || 'General Department' }}
                </p>
              </CardContent>
             </Card>
          </div>

          <!-- Extended Details Tab/Section -->
          <Card class="h-full">
            <CardHeader>
              <CardTitle>Professional Overview</CardTitle>
              <CardDescription>Detailed employment information and history.</CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              
              <div class="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                <div class="space-y-1">
                  <label class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Employee ID</label>
                  <p class="text-sm font-medium font-mono bg-muted/50 px-2 py-1 rounded w-fit">{{ user._id || user.id }}</p>
                </div>
                
                 <div class="space-y-1">
                  <label class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Reports To</label>
                  <div class="flex items-center gap-2">
                     <Avatar class="size-6">
                        <AvatarFallback class="text-[10px]">MG</AvatarFallback>
                     </Avatar>
                     <span class="text-sm">Manager Name (Coming Soon)</span>
                  </div>
                </div>

                 <div class="space-y-1">
                  <label class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Department</label>
                  <p class="text-sm">{{ user.department || '—' }}</p>
                </div>

                 <div class="space-y-1">
                  <label class="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Employment Type</label>
                  <p class="text-sm">{{ user.employmentType || 'Full-time' }}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 class="text-sm font-medium mb-3">Associated Locations / Addresses</h4>
                <div v-if="user.addressList?.length" class="grid gap-2">
                  <div v-for="(addr, idx) in user.addressList" :key="idx" class="flex items-start gap-3 p-3 rounded-md border bg-muted/20">
                    <Icon name="i-lucide-map-pin" class="size-4 mt-0.5 text-muted-foreground" />
                    <span class="text-sm">{{ addr }}</span>
                  </div>
                </div>
                <p v-else class="text-sm text-muted-foreground italic">No addresses on file.</p>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
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
