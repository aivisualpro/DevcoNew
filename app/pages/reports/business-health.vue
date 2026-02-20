<script setup lang="ts">
import NumberFlow from '@number-flow/vue'
import { TrendingUp } from 'lucide-vue-next'

const overallScore = ref(0)
onMounted(() => { overallScore.value = 87 })

const healthCategories = [
  {
    title: 'Financial Stability',
    score: 92,
    icon: 'i-lucide-shield-check',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    ringColor: 'stroke-emerald-500',
    description: 'Strong balance sheet with healthy debt levels',
    indicators: [
      { name: 'Debt-to-Equity Ratio', value: '0.51x', status: 'excellent', note: 'Well below industry avg of 1.0x' },
      { name: 'Interest Coverage', value: '13.6x', status: 'excellent', note: 'Far exceeds 3x minimum threshold' },
      { name: 'Equity Ratio', value: '66.3%', status: 'excellent', note: 'Strong ownership position' },
      { name: 'Fixed Charge Coverage', value: '8.2x', status: 'good', note: 'Comfortable margin' },
    ],
  },
  {
    title: 'Profitability',
    score: 89,
    icon: 'i-lucide-circle-dollar-sign',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ringColor: 'stroke-blue-500',
    description: 'Above-average margins with improving trends',
    indicators: [
      { name: 'Gross Profit Margin', value: '48.3%', status: 'excellent', note: 'Industry-leading margin' },
      { name: 'Net Profit Margin', value: '17.8%', status: 'excellent', note: 'Beats benchmark of 12.5%' },
      { name: 'Return on Equity', value: '38.4%', status: 'excellent', note: 'Exceptional shareholder returns' },
      { name: 'Return on Assets', value: '25.5%', status: 'good', note: 'Efficient asset utilization' },
    ],
  },
  {
    title: 'Liquidity',
    score: 88,
    icon: 'i-lucide-droplets',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    ringColor: 'stroke-cyan-500',
    description: 'Excellent short-term financial health',
    indicators: [
      { name: 'Current Ratio', value: '2.80x', status: 'excellent', note: 'Strong short-term coverage' },
      { name: 'Quick Ratio', value: '2.26x', status: 'excellent', note: 'Excludes inventory — still strong' },
      { name: 'Cash Ratio', value: '1.18x', status: 'good', note: 'Sufficient cash reserves' },
      { name: 'Working Capital', value: '$3.74M', status: 'excellent', note: 'Growing steadily QoQ' },
    ],
  },
  {
    title: 'Operational Efficiency',
    score: 82,
    icon: 'i-lucide-gauge',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    ringColor: 'stroke-amber-500',
    description: 'Good efficiency with room for inventory optimization',
    indicators: [
      { name: 'Asset Turnover', value: '1.44x', status: 'good', note: 'Above industry average' },
      { name: 'Inventory Turnover', value: '6.33x', status: 'good', note: 'Improving from 5.52x' },
      { name: 'Days Sales Outstanding', value: '26.5 days', status: 'excellent', note: 'Fast collection cycle' },
      { name: 'Days Payable Outstanding', value: '44.7 days', status: 'good', note: 'Balanced supplier terms' },
    ],
  },
  {
    title: 'Growth Trajectory',
    score: 85,
    icon: 'i-lucide-rocket',
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    ringColor: 'stroke-violet-500',
    description: 'Consistent double-digit revenue growth',
    indicators: [
      { name: 'Revenue Growth (YoY)', value: '+14.2%', status: 'excellent', note: 'Accelerating from 11.8%' },
      { name: 'Net Income Growth', value: '+21.5%', status: 'excellent', note: 'Outpacing revenue growth' },
      { name: 'Equity Growth', value: '+13.7%', status: 'good', note: 'Retained earnings accumulating' },
      { name: 'Asset Growth', value: '+8.0%', status: 'good', note: 'Sustainable expansion' },
    ],
  },
]

const statusColors: Record<string, string> = {
  excellent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  good: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  fair: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  poor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
}

function getScoreGrade(score: number) {
  if (score >= 90)
    return { grade: 'A+', color: 'text-emerald-500' }
  if (score >= 85)
    return { grade: 'A', color: 'text-emerald-500' }
  if (score >= 80)
    return { grade: 'B+', color: 'text-blue-500' }
  if (score >= 75)
    return { grade: 'B', color: 'text-blue-500' }
  if (score >= 70)
    return { grade: 'C+', color: 'text-amber-500' }
  return { grade: 'C', color: 'text-amber-500' }
}

// Trend data
const healthTrend = [
  { quarter: 'Q1 2026', stability: 78, profitability: 72, liquidity: 75, efficiency: 70, growth: 68 },
  { quarter: 'Q2 2026', stability: 80, profitability: 75, liquidity: 78, efficiency: 73, growth: 72 },
  { quarter: 'Q3 2026', stability: 83, profitability: 80, liquidity: 81, efficiency: 76, growth: 78 },
  { quarter: 'Q4 2026', stability: 86, profitability: 82, liquidity: 83, efficiency: 78, growth: 80 },
  { quarter: 'Q1 2026', stability: 88, profitability: 85, liquidity: 84, efficiency: 79, growth: 82 },
  { quarter: 'Q2 2026', stability: 89, profitability: 86, liquidity: 85, efficiency: 80, growth: 83 },
  { quarter: 'Q3 2026', stability: 91, profitability: 88, liquidity: 87, efficiency: 81, growth: 84 },
  { quarter: 'Q4 2026', stability: 92, profitability: 89, liquidity: 88, efficiency: 82, growth: 85 },
]

const scoreDistribution = healthCategories.map(c => ({ name: c.title, value: c.score }))

// Strengths & Risks
const strengths = [
  { title: 'Exceptional Profitability', description: 'Gross margins (48.3%) and net margins (17.8%) significantly exceed industry averages, indicating strong pricing power and cost control.', icon: 'i-lucide-trophy' },
  { title: 'Strong Liquidity Position', description: 'Current ratio of 2.80x and $2.45M in cash provides ample buffer for obligations and opportunities.', icon: 'i-lucide-shield' },
  { title: 'Low Leverage', description: 'D/E ratio of 0.51x is well below the industry average of 1.0x, reducing financial risk and interest burden.', icon: 'i-lucide-lock' },
  { title: 'Accelerating Revenue', description: 'Revenue growth accelerated from 11.8% to 14.2% YoY with diversified revenue streams across 4 segments.', icon: 'i-lucide-trending-up' },
]

const risks = [
  { title: 'Inventory Days Increasing', description: 'DIO at 57.7 days is slightly high. Implement JIT strategies to reduce carrying costs by ~15%.', severity: 'medium', icon: 'i-lucide-package-x' },
  { title: 'Rising Operating Costs', description: 'SG&A growth of 12.8% outpaced revenue growth in Q3. Needs monitoring for operating leverage.', severity: 'medium', icon: 'i-lucide-alert-triangle' },
  { title: 'Customer Concentration', description: 'Top 3 customers account for 28% of revenue. Diversification target: <20% by Q2 2026.', severity: 'low', icon: 'i-lucide-users' },
  { title: 'FX Exposure', description: 'EUR/GBP denominated revenue (~12%) exposed to currency fluctuation. Consider hedging strategy.', severity: 'low', icon: 'i-lucide-globe' },
]

const sevColors: Record<string, string> = {
  high: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

// Actions
const actions = [
  { title: 'Optimize Inventory Management', description: 'Implement JIT procurement for top 20 SKUs to reduce DIO from 57.7 to 45 days, freeing ~$280K in working capital.', priority: 'High', deadline: 'Q1 2026', owner: 'Operations' },
  { title: 'Hedging Strategy Implementation', description: 'Deploy forward contracts for 50% of projected EUR/GBP revenue exposure over next 3 quarters.', priority: 'Medium', deadline: 'Q1 2026', owner: 'Treasury' },
  { title: 'Customer Diversification Program', description: 'Allocate 15% of marketing budget to new customer acquisition in underpenetrated regions.', priority: 'Medium', deadline: 'Q2 2026', owner: 'Sales' },
  { title: 'SG&A Optimization Review', description: 'Commission efficiency audit on G&A spend. Target: reduce growth rate to match revenue growth by Q3 2026.', priority: 'Medium', deadline: 'Q2 2026', owner: 'Finance' },
]

const priorityColors: Record<string, string> = {
  High: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Low: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
}

const { setHeader } = usePageHeader()
setHeader({ title: 'Business Health', icon: 'i-lucide-heart-pulse', description: 'Comprehensive health assessment with actionable insights' })
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Export -->
    <div class="flex items-center justify-end">
      <Button variant="outline">
        <Icon name="i-lucide-download" class="mr-2 size-4" />
        Export Report
      </Button>
    </div>

    <!-- Overall Score Hero -->
    <Card class="overflow-hidden">
      <div class="relative bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8">
        <div class="absolute inset-0 opacity-5" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 20px 20px;" />
        <div class="relative flex flex-col md:flex-row items-center gap-8">
          <!-- Score Circle -->
          <div class="relative flex items-center justify-center">
            <svg class="size-44 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="8" class="text-muted/20" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke-width="8" stroke-linecap="round"
                class="text-primary transition-all duration-1000 ease-out"
                :stroke-dasharray="`${overallScore * 3.14} 314`"
              />
            </svg>
            <div class="absolute flex flex-col items-center">
              <span class="text-4xl font-bold tabular-nums">
                <NumberFlow :value="overallScore" />
              </span>
              <span class="text-sm text-muted-foreground">/100</span>
            </div>
          </div>

          <!-- Summary -->
          <div class="flex-1 text-center md:text-left">
            <div class="flex items-center justify-center md:justify-start gap-3 mb-2">
              <Badge variant="outline" class="text-lg font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                Grade: A
              </Badge>
              <Badge variant="outline" class="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800">
                <TrendingUp class="size-3" />
                +9 pts YoY
              </Badge>
            </div>
            <h3 class="text-xl font-bold mt-2">
              Your Business is in Excellent Health
            </h3>
            <p class="text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Strong profitability, healthy leverage, and growing revenue demonstrate a well-managed business.
              Key areas like liquidity and debt management are well above industry benchmarks. Minor attention needed on operational efficiency.
            </p>
            <div class="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
              <Badge v-for="cat in healthCategories" :key="cat.title" variant="secondary" class="text-xs">
                {{ cat.title }}: {{ cat.score }}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Category Score Cards -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card v-for="cat in healthCategories" :key="cat.title" class="group hover:shadow-lg hover:border-primary/30 transition-all duration-300">
        <CardContent class="pt-6 flex flex-col items-center text-center gap-2">
          <div class="flex items-center justify-center rounded-xl p-3 transition-colors" :class="cat.bgColor">
            <Icon :name="cat.icon" class="size-6" :class="cat.color" />
          </div>
          <div class="relative flex items-center justify-center my-2">
            <svg class="size-20 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="10" class="text-muted/20" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke-width="10" stroke-linecap="round"
                :class="cat.ringColor"
                class="transition-all duration-1000 ease-out"
                :stroke-dasharray="`${cat.score * 3.14} 314`"
              />
            </svg>
            <div class="absolute flex flex-col items-center">
              <span class="text-xl font-bold tabular-nums">{{ cat.score }}</span>
            </div>
          </div>
          <p class="text-sm font-semibold">
            {{ cat.title }}
          </p>
          <Badge variant="outline" :class="getScoreGrade(cat.score).color" class="text-xs">
            {{ getScoreGrade(cat.score).grade }}
          </Badge>
        </CardContent>
      </Card>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Health Score Trend</CardTitle>
          <CardDescription>All 5 categories over 8 quarters</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            :data="healthTrend"
            index="quarter"
            :categories="['stability', 'profitability', 'liquidity', 'efficiency', 'growth']"
            :colors="['#10b981', '#3b82f6', '#06b6d4', '#f59e0b', '#8b5cf6']"
            :y-formatter="(v: number | Date) => `${Number(v)}`"
            class="h-[350px]"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category Comparison</CardTitle>
          <CardDescription>Current health scores by category</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart
            :data="scoreDistribution"
            index="name"
            :categories="['value']"
            :colors="['#3b82f6']"
            :rounded-corners="6"
            :show-legend="false"
            class="h-[350px]"
          />
        </CardContent>
      </Card>
    </div>

    <!-- Detailed Categories -->
    <div v-for="cat in healthCategories" :key="cat.title">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center rounded-lg p-2" :class="cat.bgColor">
                <Icon :name="cat.icon" class="size-5" :class="cat.color" />
              </div>
              <div>
                <CardTitle>{{ cat.title }}</CardTitle>
                <CardDescription>{{ cat.description }}</CardDescription>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-2xl font-bold tabular-nums" :class="cat.color">{{ cat.score }}</span>
              <Badge variant="outline" :class="getScoreGrade(cat.score).color">
                {{ getScoreGrade(cat.score).grade }}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y">
            <div v-for="ind in cat.indicators" :key="ind.name" class="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
              <div class="flex-1">
                <p class="text-sm font-medium">
                  {{ ind.name }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ ind.note }}
                </p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-semibold tabular-nums">{{ ind.value }}</span>
                <Badge variant="outline" class="text-xs capitalize min-w-20 justify-center" :class="statusColors[ind.status]">
                  {{ ind.status }}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Strengths & Risks -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <!-- Strengths -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center rounded-lg bg-emerald-500/10 p-2">
              <Icon name="i-lucide-sparkles" class="size-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle>Key Strengths</CardTitle>
              <CardDescription>Competitive advantages to maintain</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="s in strengths" :key="s.title" class="flex gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
            <div class="flex items-center justify-center rounded-lg bg-emerald-500/10 p-2 shrink-0 h-fit">
              <Icon :name="s.icon" class="size-4 text-emerald-500" />
            </div>
            <div>
              <p class="text-sm font-semibold">
                {{ s.title }}
              </p>
              <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                {{ s.description }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Risks -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center rounded-lg bg-amber-500/10 p-2">
              <Icon name="i-lucide-alert-triangle" class="size-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Risk Factors</CardTitle>
              <CardDescription>Areas requiring monitoring & mitigation</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-for="r in risks" :key="r.title" class="flex gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
            <div class="flex items-center justify-center rounded-lg bg-amber-500/10 p-2 shrink-0 h-fit">
              <Icon :name="r.icon" class="size-4 text-amber-500" />
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm font-semibold">
                  {{ r.title }}
                </p>
                <Badge variant="outline" class="text-xs capitalize" :class="sevColors[r.severity]">
                  {{ r.severity }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                {{ r.description }}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Recommended Actions -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center rounded-lg bg-primary/10 p-2">
            <Icon name="i-lucide-list-checks" class="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Strategic initiatives to improve business health</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y">
          <div v-for="action in actions" :key="action.title" class="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 hover:bg-muted/20 transition-colors">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold">
                  {{ action.title }}
                </p>
                <Badge variant="outline" class="text-xs" :class="priorityColors[action.priority]">
                  {{ action.priority }}
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                {{ action.description }}
              </p>
            </div>
            <div class="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
              <div class="flex items-center gap-1">
                <Icon name="i-lucide-calendar" class="size-3.5" />
                {{ action.deadline }}
              </div>
              <div class="flex items-center gap-1">
                <Icon name="i-lucide-user" class="size-3.5" />
                {{ action.owner }}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
