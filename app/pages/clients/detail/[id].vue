<script setup lang="ts">
const route = useRoute()
const clientId = computed(() => route.params.id as string)

const {
  allClients,
  fetchAllClients,
  isFetched,
  isLoading,
} = useClientsApi()

// Eagerly fetch (uses global cache — instant if already loaded)
fetchAllClients()

// Find client from store
const client = computed(() => allClients.value.find(c => c.id === clientId.value || c._id === clientId.value))

// Update header
const { setHeader } = usePageHeader()

// Set immediate loading header
setHeader({
  title: 'Clients',
  icon: 'i-lucide-building-2',
  backLink: {
    label: 'Clients',
    href: '/clients',
  },
})

watchEffect(() => {
  if (client.value) {
    setHeader({
      title: `Clients / ${client.value.name || 'Unknown'}`,
      icon: 'i-lucide-building-2',
      backLink: {
        label: 'Clients',
        href: '/clients',
      },
    })
  }
  else if (!isLoading.value && isFetched.value) {
    setHeader({
      title: 'Client Not Found',
      description: 'The requested client could not be found',
      icon: 'i-lucide-building-2',
      backLink: {
        label: 'Clients',
        href: '/clients',
      },
    })
  }
})

// ─── Helpers ───
function formatDate(value: any): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  catch { return '—' }
}

function getInitials(name: string | undefined): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function getBadgeClass(status: string): string {
  const map: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Inactive: 'bg-red-500/10 text-red-600 border-red-500/20',
  }
  return map[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}

// ─── Contacts ───
const contacts = computed(() => client.value?.contacts || [])

// ─── Addresses ───
const addresses = computed(() => client.value?.addresses || [])

// ─── Documents ───
const documents = computed(() => client.value?.documents || [])
</script>

<template>
  <div class="flex flex-col gap-4 p-4 sm:p-6 max-w-7xl mx-auto w-full overflow-auto">
    <!-- Loading State -->
    <div v-if="isLoading && !client" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
      <Icon name="i-lucide-loader-2" class="size-8 animate-spin mb-4" />
      <p>Loading client details...</p>
    </div>

    <!-- Not Found State -->
    <div v-else-if="!client" class="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
      <Icon name="i-lucide-building-2" class="size-10 mb-4" />
      <h3 class="text-lg font-medium text-foreground">
        Client Not Found
      </h3>
      <p class="mb-4">
        The client with ID {{ clientId }} does not exist.
      </p>
      <Button variant="outline" @click="navigateTo('/clients')">
        View All Clients
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
              <AvatarFallback class="text-2xl bg-primary/10 text-primary">
                {{ getInitials(client.name) }}
              </AvatarFallback>
            </Avatar>

            <div class="flex-1 space-y-1.5 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="text-xl sm:text-2xl font-bold tracking-tight truncate">
                  {{ client.name }}
                </h1>
                <Badge :class="getBadgeClass(client.status || 'Active')">
                  {{ client.status || 'Active' }}
                </Badge>
              </div>
              <div class="space-y-0.5 text-xs text-muted-foreground">
                <div v-if="addresses.length" class="flex items-center gap-1">
                  <Icon name="i-lucide-map-pin" class="size-3.5 shrink-0" />
                  {{ addresses[0] }}
                </div>
                <div class="flex items-center gap-1">
                  <Icon name="i-lucide-folder" class="size-3.5 shrink-0" />
                  {{ client.projectCount || 0 }} Projects
                </div>
                <div v-if="client.createdAt" class="flex items-center gap-1">
                  <Icon name="i-lucide-calendar" class="size-3.5 shrink-0" />
                  Client since {{ formatDate(client.createdAt) }}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- ─── Main Grid ─── -->
      <div class="grid lg:grid-cols-3 gap-4">
        <!-- ═══ LEFT COLUMN ═══ -->
        <div class="space-y-4 lg:col-span-1">
          <!-- Client Information -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-sm flex items-center gap-2">
                <Icon name="i-lucide-building-2" class="size-4 text-blue-500" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-2.5 text-sm">
              <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Client ID</span>
                <span class="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded">{{ client._id || client.id }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Status</span>
                <Badge :class="getBadgeClass(client.status || 'Active')" class="text-[10px]">
                  {{ client.status || 'Active' }}
                </Badge>
              </div>
              <Separator />
              <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Projects</span>
                <Badge variant="secondary" class="text-[10px] tabular-nums">
                  {{ client.projectCount || 0 }}
                </Badge>
              </div>
              <Separator />
              <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Created</span>
                <span class="text-xs">{{ formatDate(client.createdAt) }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">Updated</span>
                <span class="text-xs">{{ formatDate(client.updatedAt) }}</span>
              </div>
            </CardContent>
          </Card>

          <!-- Addresses -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-sm flex items-center gap-2">
                <Icon name="i-lucide-map-pin" class="size-4 text-emerald-500" />
                Addresses
                <Badge v-if="addresses.length" variant="secondary" class="text-[10px] ml-auto">
                  {{ addresses.length }}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm">
              <div
                v-for="(addr, idx) in addresses"
                :key="idx"
                class="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2.5"
              >
                <Icon name="i-lucide-map-pin" class="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span class="text-xs">{{ addr }}</span>
              </div>
              <p v-if="!addresses.length" class="text-xs text-muted-foreground italic">
                No addresses on file
              </p>
            </CardContent>
          </Card>
        </div>

        <!-- ═══ RIGHT COLUMN ═══ -->
        <div class="space-y-4 lg:col-span-2">
          <!-- Contacts -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-sm flex items-center gap-2">
                <Icon name="i-lucide-users" class="size-4 text-violet-500" />
                Contacts
                <Badge v-if="contacts.length" variant="secondary" class="text-[10px] ml-auto">
                  {{ contacts.length }}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="contacts.length" class="grid sm:grid-cols-2 gap-3">
                <div
                  v-for="(contact, idx) in contacts"
                  :key="idx"
                  class="rounded-lg border bg-muted/20 p-3.5 space-y-2"
                >
                  <div class="flex items-center gap-2">
                    <Avatar class="size-8">
                      <AvatarFallback class="text-xs bg-primary/10 text-primary">
                        {{ getInitials(contact.name || contact.firstName) }}
                      </AvatarFallback>
                    </Avatar>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold truncate">{{ contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || '—' }}</p>
                      <p v-if="contact.role || contact.title" class="text-[10px] text-muted-foreground">{{ contact.role || contact.title }}</p>
                    </div>
                  </div>
                  <div v-if="contact.email" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="i-lucide-mail" class="size-3 shrink-0" />
                    <span class="truncate">{{ contact.email }}</span>
                  </div>
                  <div v-if="contact.phone" class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon name="i-lucide-phone" class="size-3 shrink-0" />
                    {{ contact.phone }}
                  </div>
                </div>
              </div>
              <div v-else class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Icon name="i-lucide-user-x" class="size-8" />
                <p class="text-xs">No contacts on file</p>
              </div>
            </CardContent>
          </Card>

          <!-- Documents -->
          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-sm flex items-center gap-2">
                <Icon name="i-lucide-folder-check" class="size-4 text-amber-500" />
                Documents
                <Badge v-if="documents.length" variant="secondary" class="text-[10px] ml-auto">
                  {{ documents.length }}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div v-if="documents.length" class="grid sm:grid-cols-2 gap-2">
                <div
                  v-for="(doc, idx) in documents"
                  :key="idx"
                  class="flex items-center gap-2.5 rounded-md border bg-muted/30 px-3.5 py-2.5 text-xs"
                >
                  <Icon name="i-lucide-file-text" class="size-4 text-muted-foreground shrink-0" />
                  <span class="flex-1 truncate">{{ doc.name || doc.title || doc.fileName || `Document ${idx + 1}` }}</span>
                  <a
                    v-if="doc.url"
                    :href="doc.url"
                    target="_blank"
                    class="text-primary hover:text-primary/80"
                    @click.stop
                  >
                    <Icon name="i-lucide-external-link" class="size-3" />
                  </a>
                </div>
              </div>
              <div v-else class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Icon name="i-lucide-folder-x" class="size-8" />
                <p class="text-xs">No documents on file</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
