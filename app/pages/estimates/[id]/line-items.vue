<script setup lang="ts">
import { useEstimatesApi } from '~/composables/useEstimatesApi'

const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

const { allEstimates, fetchAllEstimates, isFetched } = useEstimatesApi()

onMounted(() => {
  if (!isFetched.value) {
    fetchAllEstimates()
  }
})

const options = computed(() => {
  const miscNames = new Set<string>()
  const miscClassifications = new Set<string>()
  const uoms = new Set<string>()

  allEstimates.value.forEach((est) => {
    const misc = est.miscellaneousItems || est.miscellaneous || []
    misc.forEach((item: any) => {
      if (item.name)
        miscNames.add(item.name)
      if (item.classification)
        miscClassifications.add(item.classification)
      if (item.uom)
        uoms.add(item.uom)
    })

    const eq = est.equipmentItems || est.equipment || []
    eq.forEach((item: any) => {
      if (item.uom)
        uoms.add(item.uom)
    })

    const mat = est.materialItems || est.material || est.materials || []
    mat.forEach((item: any) => {
      if (item.uom)
        uoms.add(item.uom)
    })
  })

  return {
    miscNames: Array.from(miscNames).sort(),
    miscClassifications: Array.from(miscClassifications).sort(),
    uoms: Array.from(uoms).sort(),
  }
})

// ─── Formatters ───
function formatCurrency(value: any): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return '$0.00'
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
  columns: { key: string, label: string, type?: string, width?: string, optionsKey?: string, compute?: (item: any) => number }[]
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
  if (!props.estimate)
    return []

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
        { key: 'name', label: 'Miscellaneous', type: 'combobox', optionsKey: 'miscNames', width: 'min-w-48' },
        { key: 'classification', label: 'Classification', type: 'combobox', optionsKey: 'miscClassifications', width: 'min-w-32' },
        { key: 'qty', label: 'Qty', type: 'number', width: 'w-20' },
        { key: 'days', label: 'Days', type: 'number', width: 'w-20' },
        { key: 'uom', label: 'UOM', type: 'combobox', optionsKey: 'uoms', width: 'w-24' },
        { key: 'cost', label: 'Cost', type: 'currency', width: 'w-28' },
        { key: 'total', label: 'Total', type: 'currency', width: 'w-28', compute: (i: any) => (i.qty || 0) * (i.days || 1) * (i.cost || 0) },
      ],
      totalKey: 'miscellaneousSubTotal',
    })
  }

  return result
})

// Filtered sections for the active tab
const visibleSections = computed(() => {
  if (activeTab.value === 'all')
    return sections.value
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

function addEmptyLineItem(sectionKey: string) {
  if (!props.estimate)
    return

  const mapping: Record<string, string[]> = {
    labor: ['laborItems', 'labor'],
    equipment: ['equipmentItems', 'equipment'],
    material: ['materialItems', 'materials', 'material'],
    tools: ['toolsItems', 'tools'],
    overhead: ['overheadItems', 'overhead'],
    subcontractor: ['subcontractorItems', 'subcontractors', 'subcontractor'],
    disposal: ['disposalItems', 'disposal'],
    miscellaneous: ['miscellaneousItems', 'miscellaneous'],
  }

  const possibleKeys = mapping[sectionKey]
  if (!possibleKeys)
    return

  let targetKey: string = possibleKeys[0] as string
  for (const key of possibleKeys) {
    if (Array.isArray(props.estimate[key])) {
      targetKey = key
      break
    }
  }

  if (!Array.isArray(props.estimate[targetKey])) {
    // eslint-disable-next-line vue/no-mutating-props
    props.estimate[targetKey] = []
  }

  // eslint-disable-next-line vue/no-mutating-props
  props.estimate[targetKey].push({})
}

function duplicateLineItem(sectionKey: string, idx: number) {
  if (!props.estimate)
    return

  const mapping: Record<string, string[]> = {
    labor: ['laborItems', 'labor'],
    equipment: ['equipmentItems', 'equipment'],
    material: ['materialItems', 'materials', 'material'],
    tools: ['toolsItems', 'tools'],
    overhead: ['overheadItems', 'overhead'],
    subcontractor: ['subcontractorItems', 'subcontractors', 'subcontractor'],
    disposal: ['disposalItems', 'disposal'],
    miscellaneous: ['miscellaneousItems', 'miscellaneous'],
  }

  const possibleKeys = mapping[sectionKey]
  if (!possibleKeys)
    return

  let targetKey: string = possibleKeys[0] as string
  for (const key of possibleKeys) {
    if (Array.isArray(props.estimate[key])) {
      targetKey = key
      break
    }
  }

  const arr = props.estimate[targetKey]
  if (!Array.isArray(arr) || !arr[idx])
    return

  const clone = JSON.parse(JSON.stringify(arr[idx]))

  arr.splice(idx + 1, 0, clone)
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
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
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
          <p class="text-sm">
            Loading line items...
          </p>
        </div>
      </div>

      <!-- Main Content -->
      <div v-else-if="estimate" class="space-y-4">
        <!-- Empty State -->
        <div v-if="visibleSections.length === 0" class="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Icon name="i-lucide-package-open" class="size-12 mb-3 opacity-50" />
          <p class="text-sm font-medium">
            No {{ activeTab === 'all' ? '' : `${activeTab} ` }}line items found
          </p>
          <p class="text-xs mt-1">
            This estimate doesn't have any {{ activeTab === 'all' ? '' : `${activeTab} ` }}line items yet.
          </p>
          <Button v-if="activeTab !== 'all'" variant="outline" class="mt-4 gap-2" @click="addEmptyLineItem(activeTab)">
            <Icon name="i-lucide-plus" class="size-4" />
            Add {{ activeTab }} item
          </Button>
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
                <Badge variant="secondary" class="text-[10px] h-5 tabular-nums">
                  {{ section.items.length }}
                </Badge>
              </h3>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm font-bold tabular-nums">
                {{ formatCurrency(estimate[section.totalKey] || 0) }}
              </span>
              <Button size="sm" variant="outline" class="h-6 px-2 text-[10px] gap-1" @click="addEmptyLineItem(section.key)">
                <Icon name="i-lucide-plus" class="size-3" />
                Add
              </Button>
            </div>
          </div>

          <!-- Section Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-[11px]">
              <thead>
                <tr class="border-b bg-muted/30">
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground w-8">
                    #
                  </th>
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
                  class="group/row hover:bg-muted/20 transition-colors"
                >
                  <td class="px-2 py-2.5 text-muted-foreground tabular-nums">
                    <div class="flex items-center gap-1">
                      <span class="w-4 text-center">{{ idx + 1 }}</span>
                      <button
                        class="opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                        title="Duplicate row"
                        @click="duplicateLineItem(section.key, idx)"
                      >
                        <Icon name="i-lucide-copy" class="size-3 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                  <td
                    v-for="col in section.columns"
                    :key="col.key"
                    class="p-0.5"
                    :class="{
                      'text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 bg-muted/10': col.key === 'total',
                    }"
                  >
                    <template v-if="col.key === 'total'">
                      <div class="px-2 py-1.5 tabular-nums">
                        {{ formatCurrency(col.compute ? col.compute(item) : (item[col.key] || item.lineTotal)) }}
                      </div>
                    </template>
                    <template v-else-if="col.type === 'combobox'">
                      <Input
                        v-model="item[col.key]"
                        :list="col.optionsKey"
                        class="h-8 text-[11px] px-2 w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background rounded-sm shadow-none"
                        :placeholder="col.label"
                      />
                    </template>
                    <template v-else-if="col.type === 'currency'">
                      <Input
                        v-model.number="item[col.key]"
                        type="number"
                        step="any"
                        class="h-8 text-[11px] px-2 w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background rounded-sm shadow-none tabular-nums text-right"
                        :placeholder="col.label"
                      />
                    </template>
                    <template v-else-if="col.type === 'percent'">
                      <div class="relative flex items-center">
                        <Input
                          v-model.number="item[col.key]"
                          type="number"
                          step="any"
                          class="h-8 text-[11px] px-2 pr-4 w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background rounded-sm shadow-none tabular-nums text-right"
                          :placeholder="col.label"
                        />
                        <span class="absolute right-2 text-muted-foreground text-[10px] pointer-events-none">%</span>
                      </div>
                    </template>
                    <template v-else-if="col.type === 'number'">
                      <Input
                        v-model.number="item[col.key]"
                        type="number"
                        step="any"
                        class="h-8 text-[11px] px-2 w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background rounded-sm shadow-none tabular-nums"
                        :placeholder="col.label"
                      />
                    </template>
                    <template v-else>
                      <Input
                        v-model="item[col.key]"
                        class="h-8 text-[11px] px-2 w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background rounded-sm shadow-none"
                        :placeholder="col.label"
                      />
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

    <!-- Datalists for quick edit autocomplete -->
    <datalist id="miscNames">
      <option v-for="opt in options.miscNames" :key="opt" :value="opt" />
    </datalist>
    <datalist id="miscClassifications">
      <option v-for="opt in options.miscClassifications" :key="opt" :value="opt" />
    </datalist>
    <datalist id="uoms">
      <option v-for="opt in options.uoms" :key="opt" :value="opt" />
    </datalist>
  </div>
</template>
