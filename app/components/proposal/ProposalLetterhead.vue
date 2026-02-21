<script setup lang="ts">
const props = defineProps<{
  estimate: any
}>()

function formatDate(value: string): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  catch { return value }
}
</script>

<template>
  <div class="proposal-letterhead">
    <!-- Company Logo & Brand -->
    <div class="text-center mb-6">
      <div class="inline-flex flex-col items-center">
        <img
          src="/devco-logo.png"
          alt="DEVCO - Development & Engineering"
          class="h-24 w-auto object-contain"
        >
      </div>
    </div>

    <!-- Decorative Rule -->
    <div class="h-[3px] bg-gradient-to-r from-transparent via-primary to-transparent mb-6 rounded-full" />

    <!-- Contract Info Table -->
    <div class="border border-border/80 rounded-lg overflow-hidden mb-5">
      <div class="grid grid-cols-2">
        <div class="px-4 py-3 border-b border-r border-border/60 bg-muted/30">
          <span class="text-[10px] font-bold text-muted-foreground">Proposal / Contract Number:</span>
          <span class="text-sm font-bold ml-2 text-foreground">{{ estimate?.estimate || '—' }}</span>
        </div>
        <div class="px-4 py-3 border-b border-border/60 bg-muted/30">
          <span class="text-[10px] font-bold text-muted-foreground">Date:</span>
          <span class="text-sm font-bold ml-2 text-foreground">{{ formatDate(estimate?.date) }}</span>
        </div>
        <div class="px-4 py-3 border-r border-border/60 bg-muted/20">
          <span class="text-[10px] font-bold text-muted-foreground">Job Name:</span>
          <span class="text-sm font-semibold ml-2 text-foreground">{{ estimate?.projectName || estimate?.title || '—' }}</span>
        </div>
        <div class="px-4 py-3 bg-muted/20">
          <span class="text-[10px] font-bold text-muted-foreground">Job Address:</span>
          <span class="text-sm font-semibold ml-2 text-foreground">{{ estimate?.jobAddress || '—' }}</span>
        </div>
      </div>
    </div>

    <!-- Customer Contact -->
    <div class="mb-6">
      <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
        <span class="w-4 h-[2px] bg-primary rounded-full" />
        Customer Contact:
      </p>
      <div class="pl-6 space-y-0.5">
        <p class="text-sm font-bold">{{ estimate?.customerName || '—' }}</p>
        <p v-if="estimate?.contactName" class="text-sm font-medium text-foreground/80">{{ estimate.contactName }}</p>
        <p v-if="estimate?.jobAddress" class="text-sm text-muted-foreground">{{ estimate.jobAddress }}</p>
        <p v-if="estimate?.contactPhone" class="text-sm text-muted-foreground tabular-nums">
          {{ estimate.contactPhone }}
        </p>
        <a
          v-if="estimate?.contactEmail"
          :href="`mailto:${estimate.contactEmail}`"
          class="text-sm text-primary hover:underline"
        >
          {{ estimate.contactEmail }}
        </a>
      </div>
    </div>

    <!-- Scope Header -->
    <div class="border border-primary/30 rounded-lg overflow-hidden bg-primary/5">
      <div class="text-center py-3">
        <h2 class="text-base font-bold text-primary tracking-wider uppercase">
          PROJECT SCOPE OF WORK:
        </h2>
      </div>
    </div>
  </div>
</template>

<style scoped>
.proposal-letterhead {
  padding: 2rem 2rem 1rem 2rem;
}

@media print {
  .proposal-letterhead {
    padding: 0 0.5in;
    padding-top: 0.5in;
  }

  .proposal-letterhead img {
    filter: none !important;
  }
}
</style>
