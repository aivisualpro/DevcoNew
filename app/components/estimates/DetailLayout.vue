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

// Current tab label
const activeTabLabel = computed(() => {
  const tab = estimateDetailTabs.find(t => t.id === activeTab.value)
  return tab ? tab.label : 'Summary'
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

// ─── Live Totals (reactive to line item changes) ───
function sumItems(items: any[]): number {
  if (!Array.isArray(items))
    return 0
  return items.reduce((sum, i) => sum + (Number(i.total) || Number(i.lineTotal) || 0), 0)
}

const liveSubTotal = computed(() => {
  if (!estimate.value)
    return 0
  const est = estimate.value
  const allArrays = [
    est.laborItems || est.labor || [],
    est.equipmentItems || est.equipment || [],
    est.materialItems || est.material || est.materials || [],
    est.toolsItems || est.tools || [],
    est.overheadItems || est.overhead || [],
    est.subcontractorItems || est.subcontractor || est.subcontractors || [],
    est.disposalItems || est.disposal || [],
    est.miscellaneousItems || est.miscellaneous || [],
  ]
  return allArrays.reduce((total, arr) => total + sumItems(arr), 0)
})

const liveGrandTotal = computed(() => {
  if (!estimate.value)
    return 0
  const markup = Number(estimate.value.markup || estimate.value.markupPercent || 0)
  const sub = liveSubTotal.value
  return markup > 0 ? sub * (1 + markup / 100) : sub
})

// Update header with back link + estimate info + route name + live totals
watch([estimate, () => route.fullPath, liveSubTotal, liveGrandTotal], () => {
  const estimateNumber = estimate.value?.estimate || 'Estimate'
  const title = `${activeTabLabel.value} — ${estimateNumber}`
  setHeader({
    title,
    icon: 'i-lucide-file-spreadsheet',
    backLink: { label: 'All Estimates', href: `/estimates/all?highlight=${estimateId.value}` },
    extras: {
      showTotals: true,
      subtotal: liveSubTotal.value,
      grandTotal: liveGrandTotal.value,
    },
  })
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
              : 'text-muted-foreground',
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
