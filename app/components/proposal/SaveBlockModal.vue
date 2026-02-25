<script setup lang="ts">
const _props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  'save': [data: { title: string, description: string, category: string }]
}>()

const title = ref('')
const description = ref('')
const category = ref('General')

const categories = ['General', 'Scope of Work', 'Terms & Conditions', 'Safety', 'Materials', 'Equipment', 'Labor', 'Permits', 'Warranty', 'Insurance', 'Payment', 'Other']

function handleSave() {
  if (!title.value.trim())
    return
  emit('save', {
    title: title.value,
    description: description.value,
    category: category.value,
  })
  title.value = ''
  description.value = ''
  category.value = 'General'
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <transition name="modal">
    <div v-if="modelValue" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="close" />

      <!-- Modal -->
      <div class="relative bg-card border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <!-- Header -->
        <div class="px-6 py-5 border-b bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5">
          <div class="flex items-center gap-3">
            <div class="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Icon name="i-lucide-bookmark-plus" class="size-5 text-white" />
            </div>
            <div>
              <h3 class="text-base font-bold">
                Save as Reusable Block
              </h3>
              <p class="text-[11px] text-muted-foreground">
                This block will be available in all proposals via /blocks
              </p>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-5 space-y-4">
          <!-- Title -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Block Title *</label>
            <input
              v-model="title"
              type="text"
              placeholder="e.g. Standard Safety Notice"
              class="w-full h-9 px-3 text-sm rounded-lg border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              autofocus
              @keydown.enter="handleSave"
            >
          </div>

          <!-- Description -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Description</label>
            <textarea
              v-model="description"
              rows="2"
              placeholder="Brief description of this block..."
              class="w-full px-3 py-2 text-sm rounded-lg border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            />
          </div>

          <!-- Category -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Category</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="cat in categories"
                :key="cat"
                class="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150"
                :class="category === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-muted/50 text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'"
                @click="category = cat"
              >
                {{ cat }}
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t bg-muted/20 flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" class="h-8 text-xs" @click="close">
            Cancel
          </Button>
          <Button size="sm" class="h-8 text-xs gap-1" :disabled="!title.trim()" @click="handleSave">
            <Icon name="i-lucide-save" class="size-3.5" />
            Save Block
          </Button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active { transition: all 200ms ease; }
.modal-leave-active { transition: all 150ms ease; }
.modal-enter-from,
.modal-leave-to { opacity: 0; }
</style>
