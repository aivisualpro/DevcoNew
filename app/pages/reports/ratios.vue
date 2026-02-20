<script setup lang="ts">
import NumberFlow from '@number-flow/vue'

const period = ref('Q4 2026')

const ratioCategories = [
  {
    title: 'Profitability Ratios',
    icon: 'i-lucide-trending-up',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    ratios: [
      { name: 'Gross Profit Margin', value: 48.3, prior: 45.5, unit: '%', benchmark: 42.0, description: 'Revenue remaining after COGS', good: 'higher' },
      { name: 'Operating Profit Margin', value: 23.6, prior: 21.2, unit: '%', benchmark: 18.0, description: 'Earnings from operations / Revenue', good: 'higher' },
      { name: 'Net Profit Margin', value: 17.8, prior: 15.5, unit: '%', benchmark: 12.5, description: 'Bottom-line profitability', good: 'higher' },
      { name: 'Return on Assets (ROA)', value: 25.5, prior: 22.7, unit: '%', benchmark: 15.0, description: 'Net Income / Total Assets', good: 'higher' },
      { name: 'Return on Equity (ROE)', value: 38.4, prior: 36.0, unit: '%', benchmark: 20.0, description: 'Net Income / Shareholders\' Equity', good: 'higher' },
      { name: 'EBITDA Margin', value: 28.9, prior: 26.4, unit: '%', benchmark: 22.0, description: 'EBITDA / Revenue', good: 'higher' },
    ],
  },
  {
    title: 'Liquidity Ratios',
    icon: 'i-lucide-droplets',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ratios: [
      { name: 'Current Ratio', value: 2.80, prior: 2.55, unit: 'x', benchmark: 1.50, description: 'Current Assets / Current Liabilities', good: 'higher' },
      { name: 'Quick Ratio (Acid Test)', value: 2.26, prior: 2.05, unit: 'x', benchmark: 1.00, description: '(Current Assets - Inventory) / Current Liabilities', good: 'higher' },
      { name: 'Cash Ratio', value: 1.18, prior: 1.02, unit: 'x', benchmark: 0.50, description: 'Cash & Equivalents / Current Liabilities', good: 'higher' },
      { name: 'Working Capital', value: 3735000, prior: 3210000, unit: '$', benchmark: 2000000, description: 'Current Assets - Current Liabilities', good: 'higher' },
      { name: 'Operating Cash Flow Ratio', value: 1.85, prior: 1.62, unit: 'x', benchmark: 1.00, description: 'Operating Cash Flow / Current Liabilities', good: 'higher' },
    ],
  },
  {
    title: 'Leverage Ratios',
    icon: 'i-lucide-scale',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    ratios: [
      { name: 'Debt-to-Equity', value: 0.51, prior: 0.59, unit: 'x', benchmark: 1.00, description: 'Total Debt / Total Equity', good: 'lower' },
      { name: 'Debt-to-Assets', value: 0.34, prior: 0.37, unit: 'x', benchmark: 0.50, description: 'Total Debt / Total Assets', good: 'lower' },
      { name: 'Interest Coverage', value: 13.6, prior: 9.2, unit: 'x', benchmark: 5.00, description: 'EBIT / Interest Expense', good: 'higher' },
      { name: 'Equity Multiplier', value: 1.51, prior: 1.59, unit: 'x', benchmark: 2.00, description: 'Total Assets / Total Equity', good: 'lower' },
      { name: 'Long-Term Debt to Capitalization', value: 0.15, prior: 0.18, unit: '%', benchmark: 0.35, description: 'LT Debt / (LT Debt + Equity)', good: 'lower' },
    ],
  },
  {
    title: 'Efficiency Ratios',
    icon: 'i-lucide-zap',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    ratios: [
      { name: 'Asset Turnover', value: 1.44, prior: 1.36, unit: 'x', benchmark: 1.00, description: 'Revenue / Total Assets', good: 'higher' },
      { name: 'Inventory Turnover', value: 6.33, prior: 5.52, unit: 'x', benchmark: 5.00, description: 'COGS / Average Inventory', good: 'higher' },
      { name: 'Receivables Turnover', value: 13.8, prior: 13.6, unit: 'x', benchmark: 10.0, description: 'Revenue / Average Receivables', good: 'higher' },
      { name: 'Days Sales Outstanding', value: 26.5, prior: 26.8, unit: 'days', benchmark: 35.0, description: 'Average collection period', good: 'lower' },
      { name: 'Days Inventory Outstanding', value: 57.7, prior: 66.1, unit: 'days', benchmark: 60.0, description: 'Average days to sell inventory', good: 'lower' },
      { name: 'Days Payable Outstanding', value: 44.7, prior: 43.4, unit: 'days', benchmark: 40.0, description: 'Average days to pay suppliers', good: 'higher' },
    ],
  },
  {
    title: 'Valuation Ratios',
    icon: 'i-lucide-gem',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    ratios: [
      { name: 'Price-to-Earnings (P/E)', value: 22.5, prior: 24.8, unit: 'x', benchmark: 20.0, description: 'Market Price / EPS', good: 'context' },
      { name: 'Price-to-Book (P/B)', value: 3.8, prior: 4.1, unit: 'x', benchmark: 3.0, description: 'Market Price / Book Value per Share', good: 'context' },
      { name: 'EV/EBITDA', value: 12.4, prior: 14.2, unit: 'x', benchmark: 12.0, description: 'Enterprise Value / EBITDA', good: 'lower' },
      { name: 'Earnings Per Share (EPS)', value: 4.56, prior: 3.75, unit: '$', benchmark: 3.00, description: 'Net Income / Shares Outstanding', good: 'higher' },
      { name: 'Dividend Yield', value: 2.1, prior: 1.8, unit: '%', benchmark: 2.0, description: 'Annual Dividends / Market Price', good: 'higher' },
    ],
  },
]

function formatValue(value: number, unit: string) {
  if (unit === '$')
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
  if (unit === '%')
    return `${value.toFixed(1)}%`
  if (unit === 'x')
    return `${value.toFixed(2)}x`
  if (unit === 'days')
    return `${value.toFixed(1)} days`
  return value.toString()
}

function getChangeColor(value: number, prior: number, good: string) {
  const change = value - prior
  if (good === 'context')
    return 'text-muted-foreground'
  if (good === 'higher')
    return change >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
  return change <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
}

function getBenchmarkStatus(value: number, benchmark: number, good: string) {
  if (good === 'context')
    return { label: 'Market', class: 'bg-muted text-muted-foreground' }
  if (good === 'higher') {
    return value >= benchmark
      ? { label: 'Above Avg', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }
      : { label: 'Below Avg', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' }
  }
  return value <= benchmark
    ? { label: 'Healthy', class: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' }
    : { label: 'Watch', class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' }
}

// Spider / Radar chart equivalent → bar chart comparison
const comparisons = [
  { metric: 'Gross Margin', company: 48.3, industry: 42.0 },
  { metric: 'Net Margin', company: 17.8, industry: 12.5 },
  { metric: 'ROE', company: 38.4, industry: 20.0 },
  { metric: 'ROA', company: 25.5, industry: 15.0 },
  { metric: 'Current Ratio', company: 2.80, industry: 1.50 },
  { metric: 'D/E Ratio', company: 0.51, industry: 1.00 },
  { metric: 'Asset Turnover', company: 1.44, industry: 1.00 },
  { metric: 'Int. Coverage', company: 13.6, industry: 5.0 },
]

// Trend data
const trendData = [
  { quarter: 'Q1 2026', roe: 32.0, roa: 19.5, margin: 14.2 },
  { quarter: 'Q2 2026', roe: 33.5, roa: 20.5, margin: 15.0 },
  { quarter: 'Q3 2026', roe: 35.0, roa: 21.8, margin: 15.8 },
  { quarter: 'Q4 2026', roe: 36.0, roa: 22.7, margin: 15.5 },
  { quarter: 'Q1 2026', roe: 36.5, roa: 23.2, margin: 16.5 },
  { quarter: 'Q2 2026', roe: 37.2, roa: 24.0, margin: 17.0 },
  { quarter: 'Q3 2026', roe: 37.8, roa: 24.8, margin: 17.3 },
  { quarter: 'Q4 2026', roe: 38.4, roa: 25.5, margin: 17.8 },
]

const { setHeader } = usePageHeader()
setHeader({ title: 'Financial Ratios', icon: 'i-lucide-chart-no-axes-combined', description: 'Key performance indicators with industry benchmarks' })
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
          <SelectItem value="Q4 2026">
            Q4 2026
          </SelectItem>
          <SelectItem value="Q3 2026">
            Q3 2026
          </SelectItem>
          <SelectItem value="Q2 2026">
            Q2 2026
          </SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline">
        <Icon name="i-lucide-download" class="mr-2 size-4" />
        Export
      </Button>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <NumberFlow :value="38.4" suffix="%" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            ROE
          </p>
        </CardContent>
      </Card>
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            <NumberFlow :value="2.80" suffix="x" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Current Ratio
          </p>
        </CardContent>
      </Card>
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            <NumberFlow :value="0.51" suffix="x" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            D/E Ratio
          </p>
        </CardContent>
      </Card>
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-violet-600 dark:text-violet-400">
            <NumberFlow :value="1.44" suffix="x" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Asset Turnover
          </p>
        </CardContent>
      </Card>
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            <NumberFlow :value="22.5" suffix="x" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            P/E Ratio
          </p>
        </CardContent>
      </Card>
      <Card class="text-center">
        <CardContent class="pt-6">
          <div class="text-2xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
            <NumberFlow :value="13.6" suffix="x" />
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            Interest Coverage
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Company vs. Industry Average</CardTitle>
          <CardDescription>Key ratio comparison with sector benchmarks</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            :data="comparisons"
            index="metric"
            :categories="['company', 'industry']"
            :colors="['#3b82f6', '#94a3b8']"
            type="grouped"
            :rounded-corners="4"
            class="h-[350px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Ratios Trend</CardTitle>
          <CardDescription>ROE, ROA, and Net Margin over 8 quarters (%)</CardDescription>
        </CardHeader>
        <CardContent>
          <LineChart
            :data="trendData"
            index="quarter"
            :categories="['roe', 'roa', 'margin']"
            :colors="['#10b981', '#3b82f6', '#f59e0b']"
            :y-formatter="(v: number | Date) => `${Number(v).toFixed(1)}%`"
            class="h-[350px]"
          />
        </CardContent>
      </Card>
    </div>

    <!-- Ratio Category Cards -->
    <div v-for="cat in ratioCategories" :key="cat.title">
      <Card>
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center rounded-lg p-2" :class="cat.bgColor">
              <Icon :name="cat.icon" class="size-5" :class="cat.color" />
            </div>
            <div>
              <CardTitle>{{ cat.title }}</CardTitle>
              <CardDescription>{{ cat.ratios.length }} metrics with industry benchmark comparison</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <!-- Header Row -->
          <div class="grid grid-cols-12 items-center px-6 py-2 bg-muted/30 border-y text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span class="col-span-3">Metric</span>
            <span class="col-span-2 text-right">Current</span>
            <span class="col-span-2 text-right">Prior</span>
            <span class="col-span-1 text-right">Change</span>
            <span class="col-span-2 text-right">Benchmark</span>
            <span class="col-span-2 text-right">Status</span>
          </div>
          <div class="divide-y">
            <div v-for="ratio in cat.ratios" :key="ratio.name" class="grid grid-cols-12 items-center px-6 py-3 hover:bg-muted/20 transition-colors">
              <div class="col-span-3">
                <p class="text-sm font-medium">
                  {{ ratio.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ ratio.description }}
                </p>
              </div>
              <span class="text-sm font-semibold tabular-nums text-right col-span-2">{{ formatValue(ratio.value, ratio.unit) }}</span>
              <span class="text-sm text-muted-foreground tabular-nums text-right col-span-2">{{ formatValue(ratio.prior, ratio.unit) }}</span>
              <span class="text-sm font-medium tabular-nums text-right col-span-1" :class="getChangeColor(ratio.value, ratio.prior, ratio.good)">
                {{ ratio.value >= ratio.prior ? '+' : '' }}{{ (ratio.value - ratio.prior).toFixed(2) }}
              </span>
              <span class="text-sm text-muted-foreground tabular-nums text-right col-span-2">{{ formatValue(ratio.benchmark, ratio.unit) }}</span>
              <div class="col-span-2 flex justify-end">
                <Badge variant="outline" class="text-xs" :class="getBenchmarkStatus(ratio.value, ratio.benchmark, ratio.good).class">
                  {{ getBenchmarkStatus(ratio.value, ratio.benchmark, ratio.good).label }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
