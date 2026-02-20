<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

// ── Build timeline events from the estimate's full data ──
const timelineEvents = computed(() => {
  const est = props.estimate
  if (!est)
    return []

  // Default actor is the proposal writer
  const writerName = est.proposalWriterName || est.createdBy || ''
  const writerAvatar = est.proposalWriterAvatar || est.createdByAvatar || ''
  const updaterName = est.lastUpdatedBy || est.lastUpdatedByName || writerName
  const updaterAvatar = est.lastUpdatedByAvatar || writerAvatar

  const events: {
    id: string
    type: string
    icon: string
    color: string
    title: string
    description: string
    date: string
    actor?: string
    actorAvatar?: string
  }[] = []

  // 1. Estimate Created
  if (est.createdAt || est._createdAt || est.date) {
    events.push({
      id: 'created',
      type: 'created',
      icon: 'i-lucide-file-plus',
      color: 'bg-emerald-500',
      title: 'Estimate Created',
      description: `Estimate ${est.estimate || est.estimateNumber || ''} was created`,
      date: est.createdAt || est._createdAt || est.date || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 2. Customer / Client assigned
  if (est.customerName || est.customer) {
    events.push({
      id: 'customer',
      type: 'customer',
      icon: 'i-lucide-building-2',
      color: 'bg-blue-500',
      title: 'Client Assigned',
      description: `Client "${est.customerName || est.customer}" linked to estimate`,
      date: est.createdAt || est.date || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 3. Contact set
  if (est.contactName) {
    events.push({
      id: 'contact',
      type: 'contact',
      icon: 'i-lucide-user',
      color: 'bg-indigo-500',
      title: 'Contact Set',
      description: `Contact person: ${est.contactName}`,
      date: est.createdAt || est.date || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 4. Services added
  if (Array.isArray(est.services) && est.services.length > 0) {
    events.push({
      id: 'services',
      type: 'services',
      icon: 'i-lucide-wrench',
      color: 'bg-violet-500',
      title: `${est.services.length} Service${est.services.length > 1 ? 's' : ''} Defined`,
      description: est.services.join(', '),
      date: est.createdAt || est.date || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 5. Line Items — Labor
  const laborItems = est.laborItems || est.labor || []
  if (Array.isArray(laborItems) && laborItems.length > 0) {
    events.push({
      id: 'labor',
      type: 'lineitems',
      icon: 'i-lucide-hard-hat',
      color: 'bg-orange-500',
      title: `${laborItems.length} Labor Item${laborItems.length > 1 ? 's' : ''} Added`,
      description: laborItems.slice(0, 3).map((li: any) => li.description || li.name || 'Labor').join(', ') + (laborItems.length > 3 ? ` +${laborItems.length - 3} more` : ''),
      date: est.lineItemsUpdatedAt || est.lastUpdatedAt || est.createdAt || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 6. Line Items — Equipment
  const equipItems = est.equipmentItems || est.equipment || []
  if (Array.isArray(equipItems) && equipItems.length > 0) {
    events.push({
      id: 'equipment',
      type: 'lineitems',
      icon: 'i-lucide-truck',
      color: 'bg-yellow-600',
      title: `${equipItems.length} Equipment Item${equipItems.length > 1 ? 's' : ''} Added`,
      description: equipItems.slice(0, 3).map((li: any) => li.description || li.name || 'Equipment').join(', ') + (equipItems.length > 3 ? ` +${equipItems.length - 3} more` : ''),
      date: est.lineItemsUpdatedAt || est.lastUpdatedAt || est.createdAt || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 7. Line Items — Materials
  const matItems = est.materialItems || est.material || est.materials || []
  if (Array.isArray(matItems) && matItems.length > 0) {
    events.push({
      id: 'materials',
      type: 'lineitems',
      icon: 'i-lucide-package',
      color: 'bg-lime-600',
      title: `${matItems.length} Material Item${matItems.length > 1 ? 's' : ''} Added`,
      description: matItems.slice(0, 3).map((li: any) => li.description || li.name || 'Material').join(', ') + (matItems.length > 3 ? ` +${matItems.length - 3} more` : ''),
      date: est.lineItemsUpdatedAt || est.lastUpdatedAt || est.createdAt || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 8. Line Items — Subcontractors
  const subItems = est.subcontractorItems || est.subcontractor || est.subcontractors || []
  if (Array.isArray(subItems) && subItems.length > 0) {
    events.push({
      id: 'subcontractors',
      type: 'lineitems',
      icon: 'i-lucide-users',
      color: 'bg-pink-500',
      title: `${subItems.length} Subcontractor Item${subItems.length > 1 ? 's' : ''} Added`,
      description: subItems.slice(0, 3).map((li: any) => li.description || li.name || 'Subcontractor').join(', ') + (subItems.length > 3 ? ` +${subItems.length - 3} more` : ''),
      date: est.lineItemsUpdatedAt || est.lastUpdatedAt || est.createdAt || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 9. Documents
  const docs = est.documents || est.jobDocs || []
  if (Array.isArray(docs) && docs.length > 0) {
    for (const doc of docs) {
      events.push({
        id: `doc-${doc._id || doc.id || docs.indexOf(doc)}`,
        type: 'document',
        icon: 'i-lucide-file',
        color: 'bg-amber-500',
        title: 'Document Uploaded',
        description: doc.name || doc.fileName || doc.title || 'Document',
        date: doc.uploadedAt || doc.createdAt || est.lastUpdatedAt || '',
      })
    }
  }

  // 10. Schedules
  const schedules = est.schedules || []
  if (Array.isArray(schedules) && schedules.length > 0) {
    for (const sched of schedules) {
      events.push({
        id: `sched-${sched._id || sched.id || schedules.indexOf(sched)}`,
        type: 'schedule',
        icon: 'i-lucide-calendar-days',
        color: 'bg-cyan-500',
        title: 'Schedule Created',
        description: sched.name || sched.title || `Schedule for ${est.estimate || 'estimate'}`,
        date: sched.createdAt || sched.fromDate || est.lastUpdatedAt || '',
      })
    }
  }
  else if (est.scheduleId || est.schedule) {
    events.push({
      id: 'schedule',
      type: 'schedule',
      icon: 'i-lucide-calendar-days',
      color: 'bg-cyan-500',
      title: 'Schedule Linked',
      description: 'A schedule was associated with this estimate',
      date: est.scheduleCreatedAt || est.lastUpdatedAt || '',
    })
  }

  // 11. Version History
  const versions = est.versions || []
  if (Array.isArray(versions) && versions.length > 1) {
    for (let i = 1; i < versions.length; i++) {
      const v = versions[i]
      events.push({
        id: `version-${i}`,
        type: 'version',
        icon: 'i-lucide-git-branch',
        color: 'bg-purple-500',
        title: `Version ${i + 1} Created`,
        description: v.description || `Revision ${i + 1} of the estimate`,
        date: v.createdAt || v.date || '',
      })
    }
  }

  // 12. Status Change
  if (est.status && est.status !== 'Pending') {
    events.push({
      id: 'status-change',
      type: 'status',
      icon: 'i-lucide-badge-check',
      color: est.status === 'Won' || est.status === 'Completed' || est.status === 'Accepted' ? 'bg-green-500' : est.status === 'Lost' || est.status === 'Rejected' ? 'bg-red-500' : 'bg-blue-500',
      title: `Status Changed to "${est.status}"`,
      description: `Estimate was marked as ${est.status}`,
      date: est.statusChangedAt || est.lastUpdatedAt || '',
      actor: updaterName,
      actorAvatar: updaterAvatar,
    })
  }

  // 13. Markup set
  if (est.bidMarkUp || est.markup || est.markupPercent) {
    const markup = est.bidMarkUp || est.markup || est.markupPercent
    events.push({
      id: 'markup',
      type: 'financial',
      icon: 'i-lucide-percent',
      color: 'bg-teal-500',
      title: 'Markup Applied',
      description: `Bid markup set to ${markup}%`,
      date: est.createdAt || est.date || '',
      actor: writerName,
      actorAvatar: writerAvatar,
    })
  }

  // 14. Last Updated
  if (est.lastUpdatedAt || est.updatedAt) {
    const updatedDate = est.lastUpdatedAt || est.updatedAt
    const createdDate = est.createdAt || est._createdAt || est.date
    if (updatedDate && updatedDate !== createdDate) {
      events.push({
        id: 'last-updated',
        type: 'updated',
        icon: 'i-lucide-pencil',
        color: 'bg-gray-500',
        title: 'Last Modified',
        description: 'Estimate was updated',
        date: updatedDate,
        actor: updaterName,
        actorAvatar: updaterAvatar,
      })
    }
  }

  // Sort: newest first
  events.sort((a, b) => {
    if (!a.date)
      return 1
    if (!b.date)
      return -1
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return events
})

function formatDate(dateStr: string) {
  if (!dateStr)
    return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  catch { return dateStr }
}

function formatTime(dateStr: string) {
  if (!dateStr)
    return ''
  try {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  catch { return '' }
}
</script>

<template>
  <div class="p-6 max-w-3xl mx-auto">
    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty -->
    <div v-else-if="!estimate" class="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Icon name="i-lucide-clock" class="size-10 mb-3 opacity-40" />
      <p class="text-sm">
        No estimate data available
      </p>
    </div>

    <!-- Timeline -->
    <div v-else>
      <div class="flex items-center gap-3 mb-6">
        <div class="size-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
          <Icon name="i-lucide-gantt-chart" class="size-5 text-teal-500" />
        </div>
        <div>
          <h2 class="text-base font-bold">
            Activity Timeline
          </h2>
          <p class="text-xs text-muted-foreground">
            {{ timelineEvents.length }} event{{ timelineEvents.length !== 1 ? 's' : '' }} for {{ estimate.estimate || estimate.estimateNumber || 'this estimate' }}
          </p>
        </div>
      </div>

      <!-- Empty events -->
      <div v-if="timelineEvents.length === 0" class="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon name="i-lucide-clock" class="size-8 mb-3 opacity-40" />
        <p class="text-sm">
          No timeline events yet
        </p>
      </div>

      <!-- Events list -->
      <div v-else class="relative pl-8">
        <!-- Vertical line -->
        <div class="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        <div
          v-for="event in timelineEvents"
          :key="event.id"
          class="relative pb-6 last:pb-0 group"
        >
          <!-- Dot with icon -->
          <div
            class="absolute -left-8 top-0.5 size-[22px] rounded-full flex items-center justify-center ring-4 ring-background z-10 transition-transform group-hover:scale-110"
            :class="event.color"
          >
            <Icon :name="event.icon" class="size-3 text-white" />
          </div>

          <!-- Content card -->
          <div class="rounded-lg border bg-card p-3 transition-colors group-hover:bg-accent/30">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-snug">
                  {{ event.title }}
                </p>
                <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {{ event.description }}
                </p>
                <!-- Actor with avatar -->
                <div v-if="event.actor" class="flex items-center gap-1.5 mt-2">
                  <Avatar class="size-5 border">
                    <AvatarImage v-if="event.actorAvatar" :src="event.actorAvatar" :alt="event.actor" />
                    <AvatarFallback class="text-[8px] font-semibold">
                      {{ event.actor.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) }}
                    </AvatarFallback>
                  </Avatar>
                  <span class="text-[10px] text-muted-foreground">{{ event.actor }}</span>
                </div>
              </div>
              <div v-if="event.date" class="shrink-0 text-right">
                <p class="text-[10px] text-muted-foreground whitespace-nowrap font-medium">
                  {{ formatDate(event.date) }}
                </p>
                <p class="text-[10px] text-muted-foreground/60">
                  {{ formatTime(event.date) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
