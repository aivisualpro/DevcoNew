<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  estimate: any
  isLoading: boolean
}>()

const route = useRoute()
const estimateId = computed(() => route.params.id as string)

// ─── Proposal Editor Composable ───
const {
  proposalContent,
  isSaving,
  isLoadingProposal,
  lastSaved,
  hasUnsavedChanges,
  savedBlocks,
  isLoadingBlocks,
  showSaveBlockModal,
  blockTitle,
  blockDescription,
  blockCategory,
  blockContentToSave,
  loadProposal,
  saveProposal,
  onContentUpdate,
  loadBlocks,
  saveBlock,
  openSaveBlockModal,
} = useProposalEditor(estimateId)

// ─── Page Break Tracking ───
const PAGE_HEIGHT_PX = 1056 // Letter page at 96dpi = 11 * 96 = 1056px
const HEADER_HEIGHT_PX = 280 // Approx letterhead height
const FOOTER_HEIGHT_PX = 80 // Footer image height  
const CONTENT_AREA_PX = PAGE_HEIGHT_PX - FOOTER_HEIGHT_PX
const pageBreaks = ref<number[]>([])
const totalPages = ref(1)

function recalcPageBreaks() {
  const editorEl = document.querySelector('.proposal-editor-content') as HTMLElement
  if (!editorEl)
    return
  const contentHeight = editorEl.scrollHeight
  const firstPageContent = CONTENT_AREA_PX - HEADER_HEIGHT_PX
  const breaks: number[] = []
  let pos = firstPageContent
  while (pos < contentHeight) {
    breaks.push(pos)
    pos += CONTENT_AREA_PX
  }
  pageBreaks.value = breaks
  totalPages.value = breaks.length + 1
}

let resizeObserver: ResizeObserver | null = null
// Load data on mount
onMounted(async () => {
  await Promise.all([loadProposal(), loadBlocks()])
  // Observe editor content resizing to recalculate page breaks
  nextTick(() => {
    const editorEl = document.querySelector('.proposal-editor-content') as HTMLElement
    if (editorEl) {
      resizeObserver = new ResizeObserver(() => recalcPageBreaks())
      resizeObserver.observe(editorEl)
      recalcPageBreaks()
    }
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// Recalc when content changes
watch(() => proposalContent.value, () => {
  nextTick(() => recalcPageBreaks())
})

// ─── PDF Export ───
const isExporting = ref(false)

async function exportPDF() {
  isExporting.value = true
  try {
    // Save first if there are unsaved changes
    if (hasUnsavedChanges.value && proposalContent.value) {
      await saveProposal(proposalContent.value)
    }

    // Use window.print() for clean PDF generation
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Please allow popups to export PDF')
      return
    }

    const letterheadEl = document.getElementById('proposal-letterhead')
    const editorEl = document.querySelector('.proposal-editor-content')

    const letterheadHTML = letterheadEl?.innerHTML || ''
    const editorHTML = editorEl?.innerHTML || proposalContent.value

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Proposal - ${props.estimate?.estimate || 'Document'}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

            * { margin: 0; padding: 0; box-sizing: border-box; }

            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #1a1a2e;
              line-height: 1.6;
              background: white;
            }

            .proposal-page {
              max-width: 8.5in;
              min-height: 11in;
              margin: 0 auto;
              padding: 0.75in 0.75in;
              background: white;
            }

            /* Letterhead styles */
            .letterhead-section { margin-bottom: 24px; }
            .letterhead-section img { max-height: 80px; margin: 0 auto; display: block; }
            .letterhead-section .brand-text {
              text-align: center;
              font-size: 8px;
              letter-spacing: 4px;
              text-transform: uppercase;
              color: #666;
              margin-top: 4px;
            }
            .letterhead-section .rule {
              height: 3px;
              background: linear-gradient(to right, transparent, #2563eb, transparent);
              margin: 16px 0;
              border-radius: 2px;
            }
            .letterhead-section table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            .letterhead-section table td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              font-size: 12px;
            }
            .letterhead-section .label {
              font-size: 9px;
              font-weight: 700;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .letterhead-section .value {
              font-size: 13px;
              font-weight: 600;
              margin-left: 8px;
            }
            .customer-block { margin-bottom: 16px; }
            .customer-block .section-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #888;
              margin-bottom: 4px;
            }
            .customer-block p { font-size: 13px; margin: 2px 0; margin-left: 16px; }
            .customer-block .name { font-weight: 700; }
            .customer-block a { color: #2563eb; text-decoration: underline; }
            .scope-header {
              border: 1px solid rgba(37, 99, 235, 0.3);
              border-radius: 6px;
              text-align: center;
              padding: 10px;
              margin-bottom: 12px;
              background: rgba(37, 99, 235, 0.04);
            }
            .scope-header h2 {
              font-size: 14px;
              font-weight: 700;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 2px;
            }

            /* Editor Content */
            .editor-content h1 { font-size: 26px; font-weight: 900; margin: 24px 0 12px; }
            .editor-content h2 { font-size: 22px; font-weight: 700; margin: 20px 0 10px; }
            .editor-content h3 { font-size: 18px; font-weight: 600; margin: 16px 0 8px; }
            .editor-content p { font-size: 13px; margin-bottom: 10px; line-height: 1.7; }
            .editor-content ul { list-style: disc; padding-left: 24px; margin-bottom: 10px; }
            .editor-content ol { list-style: decimal; padding-left: 24px; margin-bottom: 10px; }
            .editor-content li { font-size: 13px; margin-bottom: 4px; }
            .editor-content blockquote {
              border-left: 3px solid #2563eb;
              padding: 8px 16px;
              margin: 12px 0;
              font-style: italic;
              color: #555;
              background: #f8fafc;
            }
            .editor-content table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            .editor-content th, .editor-content td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              font-size: 12px;
              text-align: left;
            }
            .editor-content th { background: #f3f4f6; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
            .editor-content hr { border: none; border-top: 2px solid #e5e7eb; margin: 24px 0; }
            .editor-content img { max-width: 100%; border-radius: 6px; margin: 12px 0; }
            .editor-content mark { background: #fef3c7; padding: 0 2px; }
            .editor-content a { color: #2563eb; text-decoration: underline; }

            @page {
              size: letter;
              margin: 0.5in 0.75in;
            }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .proposal-page { padding: 0; max-width: 8.5in; min-height: auto; }
              .proposal-footer {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                text-align: center;
                padding: 8px 0.75in;
                border-top: 1px solid #e5e7eb;
              }
              .proposal-footer img { max-height: 60px; margin: 0 auto; display: block; }
            }

            .proposal-footer {
              border-top: 2px solid #e5e7eb;
              padding: 12px 0;
              margin-top: 24px;
              text-align: center;
            }
            .proposal-footer img { max-height: 60px; margin: 0 auto; display: block; }
          </style>
        </head>
        <body>
          <div class="proposal-page">
            <div class="letterhead-section">
              <img src="/devco-logo.png" alt="DEVCO - Development & Engineering" style="max-height: 96px;" />
              <div class="rule"></div>
              <table>
                <tr>
                  <td><span class="label">Proposal / Contract Number:</span><span class="value">${props.estimate?.estimate || '—'}</span></td>
                  <td><span class="label">Date:</span><span class="value">${props.estimate?.date ? new Date(props.estimate.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '—'}</span></td>
                </tr>
                <tr>
                  <td><span class="label">Job Name:</span><span class="value">${props.estimate?.projectName || props.estimate?.title || '—'}</span></td>
                  <td><span class="label">Job Address:</span><span class="value">${props.estimate?.jobAddress || '—'}</span></td>
                </tr>
              </table>
              <div class="customer-block">
                <div class="section-label">Customer Contact:</div>
                <p class="name">${props.estimate?.customerName || '—'}</p>
                ${props.estimate?.contactName ? `<p>${props.estimate.contactName}</p>` : ''}
                ${props.estimate?.jobAddress ? `<p>${props.estimate.jobAddress}</p>` : ''}
                ${props.estimate?.contactPhone ? `<p>${props.estimate.contactPhone}</p>` : ''}
                ${props.estimate?.contactEmail ? `<p><a href="mailto:${props.estimate.contactEmail}">${props.estimate.contactEmail}</a></p>` : ''}
              </div>
              <div class="scope-header">
                <h2>PROJECT SCOPE OF WORK:</h2>
              </div>
            </div>
            <div class="editor-content">
              ${editorHTML}
            </div>
            <div class="proposal-footer">
              <img src="/Footer.png" alt="DEVCO Footer" />
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()

    // Wait for content to load then trigger print
    setTimeout(() => {
      printWindow.print()
      isExporting.value = false
    }, 500)
  }
  catch (err: any) {
    console.error('Export PDF error:', err)
    toast.error('Failed to export PDF')
    isExporting.value = false
  }
}

// ─── Manual Save ───
function handleManualSave() {
  if (proposalContent.value) {
    saveProposal(proposalContent.value)
  }
}

// ─── Handle save block from editor ───
function handleSaveBlock(html: string) {
  openSaveBlockModal(html)
}

async function handleBlockSave(data: { title: string, description: string, category: string }) {
  blockTitle.value = data.title
  blockDescription.value = data.description
  blockCategory.value = data.category
  await saveBlock()
}

// ─── Format last saved time ───
function fmtLastSaved(dateStr: string | null) {
  if (!dateStr)
    return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  catch { return '' }
}

// Word & character count
const wordCount = computed(() => {
  if (!proposalContent.value)
    return 0
  const text = proposalContent.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').length : 0
})
</script>

<template>
  <div class="flex flex-col h-full -m-6">
    <!-- ═══════ TOP BAR ═══════ -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-card/80 backdrop-blur-xl shrink-0">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div class="size-7 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/20">
            <Icon name="i-lucide-file-text" class="size-3.5 text-white" />
          </div>
          <div>
            <h2 class="text-xs font-bold">
              Proposal Editor
            </h2>
            <p class="text-[9px] text-muted-foreground">
              {{ estimate?.estimate || 'Document' }}
            </p>
          </div>
        </div>

        <!-- Status indicators -->
        <div class="flex items-center gap-2 ml-4">
          <template v-if="isSaving">
            <div class="flex items-center gap-1.5 text-amber-500">
              <Icon name="i-lucide-loader-2" class="size-3 animate-spin" />
              <span class="text-[10px] font-semibold">Saving...</span>
            </div>
          </template>
          <template v-else-if="hasUnsavedChanges">
            <div class="flex items-center gap-1.5 text-amber-500">
              <div class="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span class="text-[10px] font-semibold">Unsaved changes</span>
            </div>
          </template>
          <template v-else-if="lastSaved">
            <div class="flex items-center gap-1.5 text-emerald-500">
              <Icon name="i-lucide-check-circle" class="size-3" />
              <span class="text-[10px] font-semibold">Saved at {{ fmtLastSaved(lastSaved) }}</span>
            </div>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <Badge variant="secondary" class="text-[9px] font-bold h-5 px-2 tabular-nums">
          {{ wordCount }} words
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          class="h-7 text-[10px] gap-1"
          :disabled="!proposalContent || isSaving"
          @click="handleManualSave"
        >
          <Icon name="i-lucide-save" class="size-3" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="h-7 text-[10px] gap-1"
          :disabled="isExporting"
          @click="exportPDF"
        >
          <Icon name="i-lucide-download" class="size-3" :class="{ 'animate-bounce': isExporting }" />
          Export PDF
        </Button>
      </div>
    </div>

    <!-- ═══════ EDITOR CANVAS ═══════ -->
    <div class="flex-1 overflow-y-auto bg-muted/20">
      <!-- Loading state -->
      <div v-if="isLoading || isLoadingProposal" class="flex items-center justify-center h-96">
        <div class="flex flex-col items-center gap-4">
          <div class="relative">
            <div class="size-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div class="absolute inset-0 flex items-center justify-center">
              <Icon name="i-lucide-file-text" class="size-6 text-primary/60" />
            </div>
          </div>
          <p class="text-sm text-muted-foreground animate-pulse">
            Loading proposal editor...
          </p>
        </div>
      </div>

      <!-- Editor -->
      <div v-else class="max-w-4xl mx-auto py-6 px-4">
        <!-- Paper-like canvas -->
        <div class="proposal-paper bg-card rounded-xl border shadow-lg shadow-black/5 overflow-hidden ring-1 ring-black/[0.02] relative">
          <!-- Letterhead -->
          <div id="proposal-letterhead">
            <ProposalLetterhead :estimate="estimate" />
          </div>

          <!-- Divider -->
          <div class="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-8" />

          <!-- Editor -->
          <div class="relative">
            <ProposalEditor
              v-model="proposalContent"
              :saved-blocks="savedBlocks"
              @update:model-value="onContentUpdate"
              @save-block="handleSaveBlock"
            />

            <!-- Page Break Indicators -->
            <div
              v-for="(breakPos, idx) in pageBreaks"
              :key="idx"
              class="page-break-indicator"
              :style="{ top: `${breakPos}px` }"
            >
              <div class="page-break-shadow" />
              <div class="page-break-page-label">
                Page {{ idx + 1 }}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-border/60 mx-6 mt-4">
            <div class="px-2 py-3 flex items-center justify-center">
              <img
                src="/Footer.png"
                alt="DEVCO Footer"
                class="max-h-[60px] w-auto object-contain"
              >
            </div>
          </div>
        </div>

        <!-- Page count badge -->
        <div class="flex items-center justify-between mt-4">
          <div class="flex items-center gap-2">
            <Badge variant="outline" class="text-[9px] font-bold h-5 px-2">
              <Icon name="i-lucide-file" class="size-3 mr-1" />
              {{ totalPages }} page{{ totalPages > 1 ? 's' : '' }}
            </Badge>
          </div>
          <p class="text-[10px] text-muted-foreground">
            Type <kbd class="px-1.5 py-0.5 rounded bg-muted border text-[9px] font-mono font-bold">/</kbd> for slash commands •
            Select text for formatting toolbar •
            Auto-saves after 3 seconds of inactivity
          </p>
        </div>
      </div>
    </div>

    <!-- ═══════ SAVE BLOCK MODAL ═══════ -->
    <ProposalSaveBlockModal
      v-model="showSaveBlockModal"
      @save="handleBlockSave"
    />
  </div>
</template>

<style>
/* Print styles */
@media print {
  body * { visibility: hidden; }

  .proposal-canvas,
  .proposal-canvas * {
    visibility: visible;
  }

  .proposal-canvas {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  /* Hide toolbar and UI in print */
  .sticky, .bubble-menu, .fixed {
    display: none !important;
  }
}

/* Page Break Indicators */
.page-break-indicator {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
  height: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.page-break-shadow {
  width: 100%;
  height: 6px;
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.25) 0%,
    rgba(0, 0, 0, 0.12) 30%,
    rgba(0, 0, 0, 0.04) 60%,
    transparent 100%
  );
  border-radius: 50%;
}

.page-break-page-label {
  margin-top: 4px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground) / 0.5);
  pointer-events: auto;
}
</style>
