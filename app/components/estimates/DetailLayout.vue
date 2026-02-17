<script setup lang="ts">
import { estimateDetailTabs } from '~/constants/estimateDetail'

const route = useRoute()
const { setHeader } = usePageHeader()

const estimateId = computed(() => route.params.id as string)

// Determine the active tab from the nested route (third segment after /estimates/[id]/)
const activeTab = computed(() => {
  const segments = route.path.split('/')
  return segments[3] || 'summary'
})

// Fetch single estimate for header info
const estimate = ref<any>(null)
const isLoading = ref(false)

async function fetchEstimate() {
  isLoading.value = true
  try {
    const resp = await $fetch<any>(`/api/estimates/${estimateId.value}`)
    estimate.value = resp.estimate
  }
  catch (err: any) {
    console.error('Failed to fetch estimate', err)
  }
  finally {
    isLoading.value = false
  }
}

onMounted(fetchEstimate)

// Update header with back link + estimate info
// Watch both estimate and route to re-set header after clearHeader() runs on tab changes
watch([estimate, () => route.fullPath], () => {
  if (estimate.value) {
    setHeader({
      title: estimate.value.estimate || 'Estimate Detail',
      icon: 'i-lucide-file-spreadsheet',
      backLink: { label: 'All Estimates', href: `/estimates/all?highlight=${estimateId.value}` },
    })
  }
  else {
    setHeader({
      title: 'Estimate Detail',
      icon: 'i-lucide-file-spreadsheet',
      backLink: { label: 'All Estimates', href: `/estimates/all?highlight=${estimateId.value}` },
    })
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Horizontal Tab Bar -->
    <div class="shrink-0 border-b bg-background">
      <div class="flex items-center gap-1 px-4 overflow-x-auto">
        <NuxtLink
          v-for="tab in estimateDetailTabs"
          :key="tab.id"
          :to="`/estimates/${estimateId}/${tab.id}`"
          class="relative flex items-center gap-2 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap hover:text-foreground"
          :class="[
            activeTab === tab.id
              ? 'text-foreground'
              : 'text-muted-foreground'
          ]"
        >
          <Icon
            :name="tab.icon"
            class="size-3.5"
            :class="activeTab === tab.id ? tab.color : 'text-muted-foreground'"
          />
          <span>{{ tab.label }}</span>
          <!-- Active indicator -->
          <span
            v-if="activeTab === tab.id"
            class="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-auto">
      <slot :estimate="estimate" :is-loading="isLoading" />
    </div>
  </div>
</template>
