<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { TrendingUp } from 'lucide-vue-next'

const period = ref('FY 2026')

const kpis = ref({
  totalRevenue: 0,
  grossProfit: 0,
  operatingIncome: 0,
  netIncome: 0,
})

onMounted(() => {
  kpis.value = {
    totalRevenue: 18450000,
    grossProfit: 8920000,
    operatingIncome: 4350000,
    netIncome: 3280000,
  }
})

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function margin(value: number, base: number) {
  return ((value / base) * 100).toFixed(1)
}

// Revenue
const revenue = [
  { name: 'Product Sales', current: 12300000, prior: 10800000 },
  { name: 'Service Revenue', current: 4200000, prior: 3650000 },
  { name: 'Subscription & Licensing', current: 1650000, prior: 1420000 },
  { name: 'Other Revenue', current: 300000, prior: 280000 },
]

// Cost of Revenue
const costOfRevenue = [
  { name: 'Cost of Goods Sold', current: 6200000, prior: 5800000 },
  { name: 'Cost of Services', current: 1980000, prior: 1750000 },
  { name: 'Depreciation (Production)', current: 850000, prior: 780000 },
  { name: 'Freight & Shipping', current: 500000, prior: 460000 },
]

// Operating Expenses
const operatingExpenses = [
  { name: 'Salaries & Wages', current: 2180000, prior: 1950000 },
  { name: 'Marketing & Advertising', current: 780000, prior: 650000 },
  { name: 'Research & Development', current: 620000, prior: 540000 },
  { name: 'Office & Admin', current: 450000, prior: 420000 },
  { name: 'Depreciation & Amortization', current: 340000, prior: 310000 },
  { name: 'Insurance', current: 200000, prior: 185000 },
]

// Other Income / Expenses
const otherItems = [
  { name: 'Interest Income', current: 125000, prior: 95000 },
  { name: 'Interest Expense', current: -320000, prior: -380000 },
  { name: 'Foreign Exchange Gain/(Loss)', current: 45000, prior: -25000 },
  { name: 'Other Income', current: 80000, prior: 65000 },
]

const totalRevenue = computed(() => revenue.reduce((s, r) => s + r.current, 0))
const totalCOGS = computed(() => costOfRevenue.reduce((s, r) => s + r.current, 0))
const grossProfit = computed(() => totalRevenue.value - totalCOGS.value)
const totalOpex = computed(() => operatingExpenses.reduce((s, r) => s + r.current, 0))
const operatingIncome = computed(() => grossProfit.value - totalOpex.value)
const totalOther = computed(() => otherItems.reduce((s, r) => s + r.current, 0))
const ebt = computed(() => operatingIncome.value + totalOther.value)
const taxRate = 0.245
const taxes = computed(() => Math.round(ebt.value * taxRate))
const netIncome = computed(() => ebt.value - taxes.value)

// Revenue Mix Donut
const revenueMix = revenue.map(r => ({ name: r.name, value: r.current }))

// Quarterly trend
const quarterlyData = [
  { quarter: 'Q1', revenue: 3800000, cogs: 2100000, opex: 1050000, netIncome: 620000 },
  { quarter: 'Q2', revenue: 4300000, cogs: 2350000, opex: 1100000, netIncome: 780000 },
  { quarter: 'Q3', revenue: 4850000, cogs: 2600000, opex: 1150000, netIncome: 880000 },
  { quarter: 'Q4', revenue: 5500000, cogs: 2480000, opex: 1270000, netIncome: 1000000 },
]

// Monthly margin trend
const marginTrend = [
  { month: 'Jan', gross: 47.2, operating: 22.1, net: 16.8 },
  { month: 'Feb', gross: 46.8, operating: 21.5, net: 16.1 },
  { month: 'Mar', gross: 48.5, operating: 23.4, net: 17.5 },
  { month: 'Apr', gross: 49.1, operating: 24.0, net: 18.0 },
  { month: 'May', gross: 48.3, operating: 23.2, net: 17.3 },
  { month: 'Jun', gross: 49.8, operating: 24.5, net: 18.4 },
  { month: 'Jul', gross: 48.0, operating: 22.8, net: 17.0 },
  { month: 'Aug', gross: 47.5, operating: 22.0, net: 16.5 },
  { month: 'Sep', gross: 49.2, operating: 24.1, net: 18.2 },
  { month: 'Oct', gross: 50.1, operating: 25.0, net: 19.0 },
  { month: 'Nov', gross: 48.8, operating: 23.8, net: 17.8 },
  { month: 'Dec', gross: 49.5, operating: 24.4, net: 18.5 },
]

const { setHeader } = usePageHeader()
setHeader({ title: 'Income Statement', icon: 'i-lucide-receipt', description: 'Consolidated statement of profit & loss' })
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Period & Export -->
    <div class="flex items-center justify-end gap-2">
      <Select v-model="period">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="FY 2026">
            FY 2026
          </SelectItem>
          <SelectItem value="FY 2026">
            FY 2026
          </SelectItem>
          <SelectItem value="FY 2023">
            FY 2023
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline">
        <Icon name="i-lucide-download" class="mr-2 size-4" />
        Export
      </Button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card class="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <NumberFlow :value="kpis.totalRevenue" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" class="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
              <TrendingUp class="size-3" />
              +14.2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter class="flex-col items-start gap-1 text-sm">
          <div class="flex gap-2 font-medium">
            Strong growth across all segments <TrendingUp class="size-4 text-emerald-500" />
          </div>
          <div class="text-muted-foreground">
            vs. $16.15M last year
          </div>
        </CardFooter>
      </Card>

      <Card class="@container/card">
        <CardHeader>
          <CardDescription>Gross Profit</CardDescription>
          <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <NumberFlow :value="kpis.grossProfit" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" class="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
              <TrendingUp class="size-3" />
              48.3%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter class="flex-col items-start gap-1 text-sm">
          <div class="flex gap-2 font-medium">
            Gross margin expanding <TrendingUp class="size-4 text-emerald-500" />
          </div>
          <div class="text-muted-foreground">
            Margin: 48.3% (vs 45.5%)
          </div>
        </CardFooter>
      </Card>

      <Card class="@container/card">
        <CardHeader>
          <CardDescription>Operating Income</CardDescription>
          <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <NumberFlow :value="kpis.operatingIncome" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" class="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
              <TrendingUp class="size-3" />
              23.6%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter class="flex-col items-start gap-1 text-sm">
          <div class="flex gap-2 font-medium">
            Operating leverage kicking in <TrendingUp class="size-4 text-emerald-500" />
          </div>
          <div class="text-muted-foreground">
            EBIT margin: 23.6%
          </div>
        </CardFooter>
      </Card>

      <Card class="@container/card">
        <CardHeader>
          <CardDescription>Net Income</CardDescription>
          <CardTitle class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            <NumberFlow :value="kpis.netIncome" :format="{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }" />
          </CardTitle>
          <CardAction>
            <Badge variant="outline" class="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
              <TrendingUp class="size-3" />
              +21.5%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter class="flex-col items-start gap-1 text-sm">
          <div class="flex gap-2 font-medium">
            Record profitability <TrendingUp class="size-4 text-emerald-500" />
          </div>
          <div class="text-muted-foreground">
            Net margin: 17.8%
          </div>
        </CardFooter>
      </Card>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card class="xl:col-span-2">
        <CardHeader>
          <CardTitle>Margin Trends</CardTitle>
          <CardDescription>Gross, operating, and net margins over 12 months (%)</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            :data="marginTrend"
            index="month"
            :categories="['gross', 'operating', 'net']"
            :colors="['#3b82f6', '#f59e0b', '#10b981']"
            :y-formatter="(v: number | Date) => `${Number(v).toFixed(1)}%`"
            class="h-[300px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Mix</CardTitle>
          <CardDescription>Revenue by stream</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart
            :data="revenueMix"
            index="name"
            category="value"
            :colors="['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']"
            :value-formatter="(v: number) => `$${(v / 1000000).toFixed(1)}M`"
            class="h-[260px]"
          />
        </CardContent>
      </Card>
    </div>

    <!-- P&L Table -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center rounded-lg bg-emerald-500/10 p-2">
            <Icon name="i-lucide-receipt" class="size-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle>Detailed Income Statement</CardTitle>
            <CardDescription>For the fiscal year ended December 31, 2026</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <!-- Revenue -->
        <div class="px-6 py-3 bg-muted/30 border-y">
          <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Revenue
          </h4>
        </div>
        <div class="divide-y">
          <div v-for="item in revenue" :key="item.name" class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20 transition-colors">
            <span class="text-sm col-span-5">{{ item.name }}</span>
            <span class="text-sm font-medium tabular-nums text-right col-span-2">{{ fmt(item.current) }}</span>
            <span class="text-sm text-muted-foreground tabular-nums text-right col-span-2">{{ fmt(item.prior) }}</span>
            <span class="text-sm tabular-nums text-right col-span-1">{{ margin(item.current, totalRevenue) }}%</span>
            <div class="col-span-2 flex justify-end">
              <Badge variant="outline" class="text-xs">
                {{ ((item.current - item.prior) / item.prior * 100).toFixed(1) }}%
              </Badge>
            </div>
          </div>
          <div class="grid grid-cols-12 items-center px-6 py-3 bg-emerald-500/5 font-semibold">
            <span class="text-sm col-span-5">Total Revenue</span>
            <span class="text-sm tabular-nums text-right col-span-2">{{ fmt(totalRevenue) }}</span>
            <span class="col-span-2" />
            <span class="text-sm tabular-nums text-right col-span-1">100%</span>
            <span class="col-span-2" />
          </div>
        </div>

        <!-- Cost of Revenue -->
        <div class="px-6 py-3 bg-muted/30 border-y">
          <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Cost of Revenue
          </h4>
        </div>
        <div class="divide-y">
          <div v-for="item in costOfRevenue" :key="item.name" class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20 transition-colors">
            <span class="text-sm col-span-5">{{ item.name }}</span>
            <span class="text-sm font-medium tabular-nums text-right col-span-2 text-destructive">({{ fmt(item.current) }})</span>
            <span class="text-sm text-muted-foreground tabular-nums text-right col-span-2">({{ fmt(item.prior) }})</span>
            <span class="text-sm tabular-nums text-right col-span-1">{{ margin(item.current, totalRevenue) }}%</span>
            <span class="col-span-2" />
          </div>
          <div class="grid grid-cols-12 items-center px-6 py-3 bg-rose-500/5 font-semibold">
            <span class="text-sm col-span-5">Total Cost of Revenue</span>
            <span class="text-sm tabular-nums text-right col-span-2 text-destructive">({{ fmt(totalCOGS) }})</span>
            <span class="col-span-5" />
          </div>
        </div>

        <!-- Gross Profit -->
        <div class="grid grid-cols-12 items-center px-6 py-4 bg-blue-500/10 border-y-2 border-blue-500/30 font-bold">
          <span class="col-span-5">GROSS PROFIT</span>
          <span class="tabular-nums text-right col-span-2">{{ fmt(grossProfit) }}</span>
          <span class="col-span-2" />
          <span class="tabular-nums text-right col-span-1">{{ margin(grossProfit, totalRevenue) }}%</span>
          <span class="col-span-2" />
        </div>

        <!-- Operating Expenses -->
        <div class="px-6 py-3 bg-muted/30 border-y">
          <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Operating Expenses
          </h4>
        </div>
        <div class="divide-y">
          <div v-for="item in operatingExpenses" :key="item.name" class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20 transition-colors">
            <span class="text-sm col-span-5">{{ item.name }}</span>
            <span class="text-sm font-medium tabular-nums text-right col-span-2 text-destructive">({{ fmt(item.current) }})</span>
            <span class="text-sm text-muted-foreground tabular-nums text-right col-span-2">({{ fmt(item.prior) }})</span>
            <span class="text-sm tabular-nums text-right col-span-1">{{ margin(item.current, totalRevenue) }}%</span>
            <span class="col-span-2" />
          </div>
          <div class="grid grid-cols-12 items-center px-6 py-3 bg-rose-500/5 font-semibold">
            <span class="text-sm col-span-5">Total Operating Expenses</span>
            <span class="text-sm tabular-nums text-right col-span-2 text-destructive">({{ fmt(totalOpex) }})</span>
            <span class="col-span-5" />
          </div>
        </div>

        <!-- Operating Income -->
        <div class="grid grid-cols-12 items-center px-6 py-4 bg-amber-500/10 border-y-2 border-amber-500/30 font-bold">
          <span class="col-span-5">OPERATING INCOME (EBIT)</span>
          <span class="tabular-nums text-right col-span-2">{{ fmt(operatingIncome) }}</span>
          <span class="col-span-2" />
          <span class="tabular-nums text-right col-span-1">{{ margin(operatingIncome, totalRevenue) }}%</span>
          <span class="col-span-2" />
        </div>

        <!-- Other Income/Expenses -->
        <div class="px-6 py-3 bg-muted/30 border-y">
          <h4 class="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Other Income / (Expenses)
          </h4>
        </div>
        <div class="divide-y">
          <div v-for="item in otherItems" :key="item.name" class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20 transition-colors">
            <span class="text-sm col-span-5">{{ item.name }}</span>
            <span class="text-sm font-medium tabular-nums text-right col-span-2" :class="item.current < 0 ? 'text-destructive' : ''">
              {{ item.current < 0 ? `(${fmt(Math.abs(item.current))})` : fmt(item.current) }}
            </span>
            <span class="col-span-5" />
          </div>
        </div>

        <!-- EBT -->
        <div class="grid grid-cols-12 items-center px-6 py-3 bg-muted/30 border-y font-semibold">
          <span class="text-sm col-span-5">Earnings Before Tax</span>
          <span class="text-sm tabular-nums text-right col-span-2">{{ fmt(ebt) }}</span>
          <span class="col-span-5" />
        </div>

        <!-- Taxes -->
        <div class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20">
          <span class="text-sm col-span-5">Income Tax Expense (24.5%)</span>
          <span class="text-sm font-medium tabular-nums text-right col-span-2 text-destructive">({{ fmt(taxes) }})</span>
          <span class="col-span-5" />
        </div>

        <!-- Net Income -->
        <div class="grid grid-cols-12 items-center px-6 py-4 bg-emerald-500/10 border-t-2 border-emerald-500/30 font-bold text-lg">
          <span class="col-span-5">NET INCOME</span>
          <span class="tabular-nums text-right col-span-2 text-emerald-600 dark:text-emerald-400">{{ fmt(netIncome) }}</span>
          <span class="col-span-2" />
          <span class="tabular-nums text-right col-span-1">{{ margin(netIncome, totalRevenue) }}%</span>
          <span class="col-span-2" />
        </div>
      </CardContent>
    </Card>

    <!-- Quarterly Breakdown -->
    <Card>
      <CardHeader>
        <CardTitle>Quarterly Performance</CardTitle>
        <CardDescription>Revenue vs. expenses breakdown by quarter</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart
          :data="quarterlyData"
          index="quarter"
          :categories="['revenue', 'cogs', 'opex', 'netIncome']"
          :colors="['#3b82f6', '#ef4444', '#f59e0b', '#10b981']"
          :y-formatter="(v: number | Date) => `$${(Number(v) / 1000000).toFixed(1)}M`"
          class="h-[350px]"
        />
      </CardContent>
    </Card>
  </div>
</template>
