import { onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'

export interface ProposalBlock {
  _id: string
  id: string
  title: string
  description: string
  content: string
  category: string
  createdAt: string
  updatedAt: string
}

export function useProposalEditor(estimateId: Ref<string>) {
  const proposalContent = ref<string>('')
  const isSaving = ref(false)
  const isLoadingProposal = ref(false)
  const lastSaved = ref<string | null>(null)
  const hasUnsavedChanges = ref(false)

  // Reusable blocks
  const savedBlocks = ref<ProposalBlock[]>([])
  const isLoadingBlocks = ref(false)

  // Block save modal
  const showSaveBlockModal = ref(false)
  const blockTitle = ref('')
  const blockDescription = ref('')
  const blockCategory = ref('General')
  const blockContentToSave = ref('')

  // Auto-save debounce
  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Load proposal content for the current estimate
   */
  async function loadProposal() {
    isLoadingProposal.value = true
    try {
      const res = await $fetch<any>(`/api/proposals/${estimateId.value}`)
      if (res.proposal?.content) {
        proposalContent.value = res.proposal.content
        lastSaved.value = res.proposal.updatedAt || null
      }
    }
    catch (err: any) {
      console.error('Failed to load proposal:', err)
    }
    finally {
      isLoadingProposal.value = false
    }
  }

  /**
   * Save proposal content
   */
  async function saveProposal(content: string) {
    isSaving.value = true
    try {
      await $fetch(`/api/proposals/${estimateId.value}`, {
        method: 'PUT',
        body: { content },
      })
      lastSaved.value = new Date().toISOString()
      hasUnsavedChanges.value = false
      toast.success('Proposal saved')
    }
    catch (err: any) {
      toast.error('Failed to save proposal')
      console.error('Save proposal error:', err)
    }
    finally {
      isSaving.value = false
    }
  }

  /**
   * Handle content update with auto-save debounce
   */
  function onContentUpdate(content: string) {
    proposalContent.value = content
    hasUnsavedChanges.value = true

    if (autoSaveTimer)
      clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      saveProposal(content)
    }, 3000) // Auto-save after 3 seconds of inactivity
  }

  /**
   * Load all saved reusable blocks
   */
  async function loadBlocks() {
    isLoadingBlocks.value = true
    try {
      const res = await $fetch<any>('/api/proposal-blocks')
      savedBlocks.value = res.blocks || []
    }
    catch (err: any) {
      console.error('Failed to load blocks:', err)
    }
    finally {
      isLoadingBlocks.value = false
    }
  }

  /**
   * Save a content selection as a reusable block
   */
  async function saveBlock() {
    if (!blockTitle.value.trim()) {
      toast.error('Block title is required')
      return
    }

    try {
      await $fetch('/api/proposal-blocks/create', {
        method: 'POST',
        body: {
          title: blockTitle.value,
          description: blockDescription.value,
          content: blockContentToSave.value,
          category: blockCategory.value,
        },
      })
      toast.success('Block saved successfully!')
      showSaveBlockModal.value = false
      blockTitle.value = ''
      blockDescription.value = ''
      blockCategory.value = 'General'
      blockContentToSave.value = ''
      await loadBlocks()
    }
    catch (err: any) {
      toast.error('Failed to save block')
      console.error('Save block error:', err)
    }
  }

  /**
   * Delete a reusable block
   */
  async function deleteBlock(blockId: string) {
    try {
      await $fetch(`/api/proposal-blocks/${blockId}`, { method: 'DELETE' })
      toast.success('Block deleted')
      savedBlocks.value = savedBlocks.value.filter(b => b._id !== blockId)
    }
    catch (_err: any) {
      toast.error('Failed to delete block')
    }
  }

  /**
   * Open save block modal with selected content
   */
  function openSaveBlockModal(content: string) {
    blockContentToSave.value = content
    showSaveBlockModal.value = true
  }

  onUnmounted(() => {
    if (autoSaveTimer)
      clearTimeout(autoSaveTimer)
  })

  return {
    // State
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
    // Actions
    loadProposal,
    saveProposal,
    onContentUpdate,
    loadBlocks,
    saveBlock,
    deleteBlock,
    openSaveBlockModal,
  }
}
