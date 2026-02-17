<script setup lang="ts">
const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

// ─── Formatters ───
function formatCurrency(value: any): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(value))
}

// ─── Section Definitions ───
interface LineItem {
  [key: string]: any
}

interface Section {
  key: string
  label: string
  color: string
  bgColor: string
  icon: string
  items: LineItem[]
  columns: { key: string; label: string; type?: string; width?: string }[]
  totalKey: string
}

// All category tab definitions (always shown, even if empty)
const categoryTabs = [
  { key: 'all', label: 'All', icon: 'i-lucide-layers', color: 'text-gray-500', bgColor: 'bg-gray-500' },
  { key: 'labor', label: 'Labor', icon: 'i-lucide-hard-hat', color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { key: 'equipment', label: 'Equipment', icon: 'i-lucide-truck', color: 'text-red-500', bgColor: 'bg-red-500' },
  { key: 'material', label: 'Material', icon: 'i-lucide-package', color: 'text-cyan-500', bgColor: 'bg-cyan-500' },
  { key: 'tools', label: 'Tools', icon: 'i-lucide-wrench', color: 'text-amber-500', bgColor: 'bg-amber-500' },
  { key: 'overhead', label: 'Overhead', icon: 'i-lucide-building', color: 'text-teal-500', bgColor: 'bg-teal-500' },
  { key: 'subcontractor', label: 'Subcontractor', icon: 'i-lucide-users', color: 'text-violet-500', bgColor: 'bg-violet-500' },
  { key: 'disposal', label: 'Disposal', icon: 'i-lucide-trash-2', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { key: 'miscellaneous', label: 'Miscellaneous', icon: 'i-lucide-puzzle', color: 'text-pink-500', bgColor: 'bg-pink-500' },
]

const activeTab = ref('all')

// Define line item sections from the estimate data
const sections = computed<Section[]>(() => {
  if (!props.estimate) return []

  const est = props.estimate
  const result: Section[] = []

  // 1. Labor
  const laborItems = est.laborItems || est.labor || []
  if (Array.isArray(laborItems) && laborItems.length) {
    result.push({
      key: 'labor',
      label: 'Labor',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      icon: 'i-lucide-hard-hat',
      items: laborItems,
      columns: [
        { key: 'name', label: 'Labor', width: 'w-48' },
        { key: 'basePay', label: 'Base Pay', type: 'number' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'days', label: 'Days', type: 'number' },
        { key: 'otpd', label: 'OTPD', type: 'text' },
        { key: 'dtpd', label: 'DTPD', type: 'text' },
        { key: 'fringe', label: 'Fringe', type: 'currency' },
        { key: 'wComp', label: 'W.Comp', type: 'percent' },
        { key: 'payroll', label: 'Payroll', type: 'percent' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'laborSubTotal',
    })
  }

  // 2. Equipment
  const equipItems = est.equipmentItems || est.equipment || []
  if (Array.isArray(equipItems) && equipItems.length) {
    result.push({
      key: 'equipment',
      label: 'Equipment',
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: 'i-lucide-truck',
      items: equipItems,
      columns: [
        { key: 'name', label: 'Equipment / Machine', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'sub', label: 'Sub' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'times', label: 'Times', type: 'number' },
        { key: 'uom', label: 'UOM', type: 'text' },
        { key: 'dailyRate', label: 'Daily $', type: 'currency' },
        { key: 'weeklyRate', label: 'Weekly $', type: 'currency' },
        { key: 'monthlyRate', label: 'Monthly $', type: 'currency' },
        { key: 'fuel', label: 'Fuel', type: 'number' },
        { key: 'delAndPick', label: 'Del & Pick', type: 'number' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'equipmentSubTotal',
    })
  }

  // 3. Material
  const materialItems = est.materialItems || est.material || est.materials || []
  if (Array.isArray(materialItems) && materialItems.length) {
    result.push({
      key: 'material',
      label: 'Material',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500',
      icon: 'i-lucide-package',
      items: materialItems,
      columns: [
        { key: 'name', label: 'Material', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'sub', label: 'Sub' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'uom', label: 'UOM', type: 'text' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'taxes', label: 'Taxes', type: 'currency' },
        { key: 'delAndPick', label: 'Del & Pick', type: 'text' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'materialSubTotal',
    })
  }

  // 4. Tools
  const toolsItems = est.toolsItems || est.tools || []
  if (Array.isArray(toolsItems) && toolsItems.length) {
    result.push({
      key: 'tools',
      label: 'Tools',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      icon: 'i-lucide-wrench',
      items: toolsItems,
      columns: [
        { key: 'name', label: 'Tool', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'toolsSubTotal',
    })
  }

  // 5. Overhead
  const overheadItems = est.overheadItems || est.overhead || []
  if (Array.isArray(overheadItems) && overheadItems.length) {
    result.push({
      key: 'overhead',
      label: 'Overhead',
      color: 'text-teal-500',
      bgColor: 'bg-teal-500',
      icon: 'i-lucide-building',
      items: overheadItems,
      columns: [
        { key: 'name', label: 'Overhead', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'overheadSubTotal',
    })
  }

  // 6. Subcontractor
  const subItems = est.subcontractorItems || est.subcontractor || est.subcontractors || []
  if (Array.isArray(subItems) && subItems.length) {
    result.push({
      key: 'subcontractor',
      label: 'Subcontractor',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500',
      icon: 'i-lucide-users',
      items: subItems,
      columns: [
        { key: 'name', label: 'Subcontractor', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'subcontractorSubTotal',
    })
  }

  // 7. Disposal
  const disposalItems = est.disposalItems || est.disposal || []
  if (Array.isArray(disposalItems) && disposalItems.length) {
    result.push({
      key: 'disposal',
      label: 'Disposal',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500',
      icon: 'i-lucide-trash-2',
      items: disposalItems,
      columns: [
        { key: 'name', label: 'Disposal', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'disposalSubTotal',
    })
  }

  // 8. Miscellaneous
  const miscItems = est.miscellaneousItems || est.miscellaneous || []
  if (Array.isArray(miscItems) && miscItems.length) {
    result.push({
      key: 'miscellaneous',
      label: 'Miscellaneous',
      color: 'text-pink-500',
      bgColor: 'bg-pink-500',
      icon: 'i-lucide-puzzle',
      items: miscItems,
      columns: [
        { key: 'name', label: 'Miscellaneous', width: 'w-48' },
        { key: 'classification', label: 'Classification' },
        { key: 'qty', label: 'Qty', type: 'number' },
        { key: 'cost', label: 'Cost', type: 'currency' },
        { key: 'total', label: 'Total', type: 'currency' },
      ],
      totalKey: 'miscellaneousSubTotal',
    })
  }

  return result
})

// Filtered sections for the active tab
const visibleSections = computed(() => {
  if (activeTab.value === 'all') return sections.value
  return sections.value.filter(s => s.key === activeTab.value)
})

// Item counts per tab
function getTabCount(key: string): number {
  if (key === 'all') {
    return sections.value.reduce((sum, s) => sum + s.items.length, 0)
  }
  const section = sections.value.find(s => s.key === key)
  return section ? section.items.length : 0
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Sub-tabs bar -->
    <div class="shrink-0 border-b bg-muted/30">
      <div class="flex items-center gap-0.5 px-4 overflow-x-auto">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          class="relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors whitespace-nowrap rounded-t-lg"
          :class="[
            activeTab === tab.key
              ? 'text-foreground bg-background border border-b-0 border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          ]"
          @click="activeTab = tab.key"
        >
          <Icon
            :name="tab.icon"
            class="size-3.5"
            :class="activeTab === tab.key ? tab.color : ''"
          />
          <span>{{ tab.label }}</span>
          <Badge
            v-if="getTabCount(tab.key) > 0"
            variant="secondary"
            class="text-[9px] h-4 min-w-[1.25rem] px-1 tabular-nums"
          >
            {{ getTabCount(tab.key) }}
          </Badge>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 min-h-0 overflow-auto p-4">
      <!-- Loading State -->
      <div v-if="isLoading && !estimate" class="flex items-center justify-center h-64">
        <div class="flex flex-col items-center gap-3 text-muted-foreground">
          <Icon name="i-lucide-loader-2" class="size-8 animate-spin" />
          <p class="text-sm">Loading line items...</p>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else-if="estimate" class="space-y-4">
        <!-- Empty State -->
        <div v-if="visibleSections.length === 0" class="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Icon name="i-lucide-package-open" class="size-12 mb-3 opacity-50" />
          <p class="text-sm font-medium">No {{ activeTab === 'all' ? '' : activeTab + ' ' }}line items found</p>
          <p class="text-xs mt-1">This estimate doesn't have any {{ activeTab === 'all' ? '' : activeTab + ' ' }}line items yet.</p>
        </div>

        <!-- Section Tables -->
        <div
          v-for="section in visibleSections"
          :key="section.key"
          class="rounded-xl border bg-card shadow-sm overflow-hidden"
        >
          <!-- Section Header -->
          <div class="flex items-center justify-between px-5 py-3 bg-muted/20 border-b">
            <div class="flex items-center gap-3">
              <div class="size-1.5 rounded-full" :class="section.bgColor" />
              <h3 class="text-sm font-semibold flex items-center gap-2">
                {{ section.label }}
                <Badge variant="secondary" class="text-[10px] h-5 tabular-nums">{{ section.items.length }}</Badge>
              </h3>
            </div>
            <span class="text-sm font-bold tabular-nums">
              {{ formatCurrency(estimate[section.totalKey] || 0) }}
            </span>
          </div>

          <!-- Section Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-[11px]">
              <thead>
                <tr class="border-b bg-muted/30">
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                  <th
                    v-for="col in section.columns"
                    :key="col.key"
                    class="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider"
                    :class="col.width || ''"
                  >
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50">
                <tr
                  v-for="(item, idx) in section.items"
                  :key="idx"
                  class="hover:bg-muted/20 transition-colors"
                >
                  <td class="px-3 py-2.5 text-muted-foreground tabular-nums">{{ idx + 1 }}</td>
                  <td
                    v-for="col in section.columns"
                    :key="col.key"
                    class="px-3 py-2.5"
                    :class="{
                      'text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400': col.key === 'total',
                      'tabular-nums': col.type === 'currency' || col.type === 'number' || col.type === 'percent',
                    }"
                  >
                    <template v-if="col.type === 'currency' && col.key !== 'total'">
                      {{ formatCurrency(item[col.key]) }}
                    </template>
                    <template v-else-if="col.key === 'total'">
                      {{ formatCurrency(item[col.key] || item.lineTotal) }}
                    </template>
                    <template v-else-if="col.type === 'percent'">
                      {{ item[col.key] ? item[col.key] + '%' : '—' }}
                    </template>
                    <template v-else>
                      {{ item[col.key] ?? '—' }}
                    </template>
                  </td>
                </tr>

                <!-- Empty row -->
                <tr v-if="section.items.length === 0">
                  <td :colspan="section.columns.length + 1" class="px-3 py-6 text-center text-muted-foreground italic">
                    No {{ section.label.toLowerCase() }} items
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
