<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

// ─── Estimate number for filtering ───
const estimateNumber = computed(() => props.estimate?.estimate || '')

// ─── Sub-tabs ───
const jobDocTabs = [
  { key: 'jha', label: 'JHA', icon: 'i-lucide-shield-check', color: 'text-emerald-500', bgColor: 'bg-emerald-500' },
  { key: 'djt', label: 'Job Tickets', icon: 'i-lucide-clipboard-list', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { key: 'pothole-logs', label: 'Pothole Logs', icon: 'i-lucide-hard-hat', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { key: 'pre-bore-logs', label: 'Pre-Bore Logs', icon: 'i-lucide-drill', color: 'text-purple-500', bgColor: 'bg-purple-500' },
  { key: 'prelims', label: 'Prelims / Legal / Lien', icon: 'i-lucide-scale', color: 'text-rose-500', bgColor: 'bg-rose-500' },
  { key: 'billing-tickets', label: 'Billing Tickets', icon: 'i-lucide-receipt', color: 'text-violet-500', bgColor: 'bg-violet-500' },
  { key: 'releases', label: 'Releases', icon: 'i-lucide-file-check', color: 'text-teal-500', bgColor: 'bg-teal-500' },
  { key: 'certified-payroll', label: 'Certified Payroll', icon: 'i-lucide-badge-dollar-sign', color: 'text-lime-600', bgColor: 'bg-lime-500' },
  { key: 'planning', label: 'Planning', icon: 'i-lucide-gantt-chart', color: 'text-sky-500', bgColor: 'bg-sky-500' },
  { key: 'signed-contracts', label: 'Signed Contracts', icon: 'i-lucide-file-signature', color: 'text-indigo-500', bgColor: 'bg-indigo-500' },
  { key: 'receipts-costs', label: 'Receipts & Costs', icon: 'i-lucide-wallet', color: 'text-amber-500', bgColor: 'bg-amber-500' },
]

const activeSubTab = ref('jha')
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Sub-Tab Bar -->
    <div class="shrink-0 border-b bg-background/80 backdrop-blur-sm">
      <div class="flex items-center gap-0.5 px-3 overflow-x-auto scrollbar-none">
        <button
          v-for="tab in jobDocTabs"
          :key="tab.key"
          class="relative flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-medium transition-all duration-200 whitespace-nowrap rounded-t-md group"
          :class="[
            activeSubTab === tab.key
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground/80',
          ]"
          @click="activeSubTab = tab.key"
        >
          <Icon
            :name="tab.icon"
            class="size-3.5 transition-colors"
            :class="activeSubTab === tab.key ? tab.color : 'text-muted-foreground group-hover:text-foreground/60'"
          />
          <span>{{ tab.label }}</span>
          <!-- Active indicator -->
          <span
            v-if="activeSubTab === tab.key"
            class="absolute bottom-0 left-1.5 right-1.5 h-0.5 rounded-full transition-all"
            :class="tab.bgColor"
          />
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 min-h-0 overflow-hidden">
      <!-- JHA -->
      <JobDocsJhaTable
        v-if="activeSubTab === 'jha'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- DJT (Job Tickets) -->
      <JobDocsDjtTable
        v-if="activeSubTab === 'djt'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- Billing Tickets -->
      <JobDocsBillingTicketsTable
        v-if="activeSubTab === 'billing-tickets'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- Receipts & Costs -->
      <JobDocsReceiptsCostsTable
        v-if="activeSubTab === 'receipts-costs'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- Pothole Logs -->
      <JobDocsPotholeLogsTable
        v-if="activeSubTab === 'pothole-logs'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- Pre-Bore Logs -->
      <JobDocsPreBoreLogsTable
        v-if="activeSubTab === 'pre-bore-logs'"
        :estimate-number="estimateNumber"
        embedded
      />

      <!-- Placeholder tabs -->
      <div
        v-if="['prelims', 'releases', 'certified-payroll', 'planning', 'signed-contracts'].includes(activeSubTab)"
        class="flex flex-col items-center justify-center h-full text-muted-foreground"
      >
        <div
          class="size-16 rounded-2xl flex items-center justify-center mb-4"
          :class="`${jobDocTabs.find(t => t.key === activeSubTab)?.bgColor}/10`"
        >
          <Icon
            :name="jobDocTabs.find(t => t.key === activeSubTab)?.icon || 'i-lucide-file'"
            class="size-8"
            :class="jobDocTabs.find(t => t.key === activeSubTab)?.color"
          />
        </div>
        <p class="text-sm font-semibold text-foreground">
          {{ jobDocTabs.find(t => t.key === activeSubTab)?.label }}
        </p>
        <p class="text-xs mt-1 text-muted-foreground">
          This section is coming soon for estimate {{ estimateNumber || '—' }}.
        </p>
      </div>
    </div>
  </div>
</template>
