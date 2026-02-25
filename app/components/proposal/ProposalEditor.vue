<script setup lang="ts">
import type { ProposalBlock } from '~/composables/useProposalEditor'
import Color from '@tiptap/extension-color'
import FontSize from '@tiptap/extension-font-size'
import Highlight from '@tiptap/extension-highlight'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import { BubbleMenu } from '@tiptap/vue-3/menus'

const props = defineProps<{
  modelValue: string
  savedBlocks: ProposalBlock[]
}>()

const emit = defineEmits<{
  'update:modelValue': [content: string]
  'saveBlock': [html: string]
}>()

// ─── Slash Command State ───
const showSlashMenu = ref(false)
const slashMenuPos = ref({ top: 0, left: 0 })
const slashFilter = ref('')
const slashSelectedIndex = ref(0)
const showBlocksPanel = ref(false)
const blockSearchQuery = ref('')

// ─── Font Size & Line Spacing State ───
const showFontSizeMenu = ref(false)
const showLineSpacingMenu = ref(false)
const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36']
const lineSpacings = [
  { label: '1.0', value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.25', value: '1.25' },
  { label: '1.5', value: '1.5' },
  { label: '1.75', value: '1.75' },
  { label: '2.0', value: '2' },
  { label: '2.5', value: '2.5' },
]
const currentLineSpacing = ref('1.5')

// Forward-declare for handleKeyDown which runs after editor is created
let editorRef: ReturnType<typeof useEditor> | null = null

function setFontSize(size: string) {
  if (!editorRef?.value)
    return
  editorRef.value.chain().focus().setFontSize(`${size}px`).run()
  showFontSizeMenu.value = false
}

function decreaseFontSize() {
  if (!editorRef?.value)
    return
  const current = getCurrentFontSize()
  const idx = fontSizes.indexOf(current)
  if (idx > 0)
    setFontSize(fontSizes[idx - 1]!)
  else if (idx === -1)
    setFontSize('12')
}

function increaseFontSize() {
  if (!editorRef?.value)
    return
  const current = getCurrentFontSize()
  const idx = fontSizes.indexOf(current)
  if (idx < fontSizes.length - 1 && idx !== -1)
    setFontSize(fontSizes[idx + 1]!)
  else if (idx === -1)
    setFontSize('16')
}

function getCurrentFontSize(): string {
  if (!editorRef?.value)
    return '14'
  const attrs = editorRef.value.getAttributes('textStyle')
  if (attrs.fontSize)
    return attrs.fontSize.replace('px', '')
  return '14'
}

function setLineSpacing(value: string) {
  if (!editorRef?.value)
    return
  currentLineSpacing.value = value
  // Apply via CSS to the editor content
  const el = document.querySelector('.proposal-editor-content') as HTMLElement
  if (el)
    el.style.lineHeight = value
  showLineSpacingMenu.value = false
}

// Standard slash commands
const slashCommands = [
  { id: 'h1', label: 'Heading 1', icon: 'i-lucide-heading-1', description: 'Large section heading', category: 'Style' },
  { id: 'h2', label: 'Heading 2', icon: 'i-lucide-heading-2', description: 'Medium section heading', category: 'Style' },
  { id: 'h3', label: 'Heading 3', icon: 'i-lucide-heading-3', description: 'Small section heading', category: 'Style' },
  { id: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type', description: 'Plain text block', category: 'Style' },
  { id: 'bullet', label: 'Bullet List', icon: 'i-lucide-list', description: 'Unordered list', category: 'Lists' },
  { id: 'numbered', label: 'Numbered List', icon: 'i-lucide-list-ordered', description: 'Ordered list', category: 'Lists' },
  { id: 'task', label: 'Task List', icon: 'i-lucide-check-square', description: 'Checklist items', category: 'Lists' },
  { id: 'quote', label: 'Blockquote', icon: 'i-lucide-text-quote', description: 'Quote block', category: 'Insert' },
  { id: 'divider', label: 'Divider', icon: 'i-lucide-separator-horizontal', description: 'Horizontal rule', category: 'Insert' },
  { id: 'table', label: 'Table', icon: 'i-lucide-table', description: '3×3 table', category: 'Insert' },
  { id: 'code', label: 'Code Block', icon: 'i-lucide-code', description: 'Code snippet', category: 'Insert' },
  { id: 'blocks', label: 'Saved Blocks', icon: 'i-lucide-bookmark', description: 'Insert a saved template block', category: 'Templates' },
  { id: 'save-block', label: 'Save Selection as Block', icon: 'i-lucide-save', description: 'Save selected content as reusable block', category: 'Templates' },
  { id: 'scope', label: 'Scope of Work', icon: 'i-lucide-file-text', description: 'Insert scope of work template', category: 'Templates' },
  { id: 'terms', label: 'Terms & Conditions', icon: 'i-lucide-file-check', description: 'Insert standard T&C block', category: 'Templates' },
]

const filteredSlashCommands = computed(() => {
  if (!slashFilter.value)
    return slashCommands
  const q = slashFilter.value.toLowerCase()
  return slashCommands.filter(c => c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
})

const filteredBlocks = computed(() => {
  if (!blockSearchQuery.value)
    return props.savedBlocks
  const q = blockSearchQuery.value.toLowerCase()
  return props.savedBlocks.filter(b => b.title.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q))
})

// ─── Editor Setup ───
const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      horizontalRule: false,
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          const level = node.attrs.level
          return `Heading ${level}`
        }
        return 'Type / for commands, or start writing...'
      },
    }),
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Image.configure({ inline: false, allowBase64: true }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
    TextStyle,
    Color,
    HorizontalRule,
    FontSize,
    Typography,
  ],
  editorProps: {
    attributes: {
      class: 'proposal-editor-content',
    },
    handleKeyDown(_view, event) {
      // Handle slash menu keyboard navigation
      if (showSlashMenu.value) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          slashSelectedIndex.value = (slashSelectedIndex.value + 1) % filteredSlashCommands.value.length
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          slashSelectedIndex.value = slashSelectedIndex.value <= 0 ? filteredSlashCommands.value.length - 1 : slashSelectedIndex.value - 1
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          const cmd = filteredSlashCommands.value[slashSelectedIndex.value]
          if (cmd)
            executeSlashCommand(cmd.id)
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          closeSlashMenu()
          return true
        }
        // Backspace when filter is empty should close menu
        if (event.key === 'Backspace' && slashFilter.value === '') {
          closeSlashMenu()
          return false
        }
        return false
      }
      return false
    },
  },
  onUpdate({ editor: ed }) {
    const html = ed.getHTML()
    emit('update:modelValue', html)

    // Check for slash command trigger
    const { from } = ed.state.selection
    const textBefore = ed.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      '\n',
    )

    const slashMatch = textBefore.match(/\/([a-z0-9-]*)$/i)
    if (slashMatch) {
      slashFilter.value = slashMatch[1] || ''
      slashSelectedIndex.value = 0

      // Get cursor coordinates
      const coords = ed.view.coordsAtPos(from)
      const editorRect = ed.view.dom.closest('.proposal-canvas')?.getBoundingClientRect()
      if (editorRect) {
        slashMenuPos.value = {
          top: coords.bottom - editorRect.top + 8,
          left: coords.left - editorRect.left,
        }
      }
      showSlashMenu.value = true
    }
    else {
      showSlashMenu.value = false
    }
  },
})

// Link editorRef so forward-declared helpers work
editorRef = editor

watch(() => props.modelValue, (val) => {
  if (editor.value && val !== editor.value.getHTML()) {
    editor.value.commands.setContent(val || '', { emitUpdate: false })
  }
})

// ─── Slash Command Execution ───
function executeSlashCommand(cmdId: string) {
  if (!editor.value)
    return

  // Delete the slash and filter text
  const { from } = editor.value.state.selection
  const textBefore = editor.value.state.doc.textBetween(Math.max(0, from - 30), from, '\n')
  const slashMatch = textBefore.match(/\/([a-z0-9-]*)$/i)
  if (slashMatch) {
    const deleteFrom = from - slashMatch[0].length
    editor.value.chain().focus().deleteRange({ from: deleteFrom, to: from }).run()
  }

  closeSlashMenu()

  const chain = editor.value.chain().focus()

  switch (cmdId) {
    case 'h1': chain.toggleHeading({ level: 1 }).run(); break
    case 'h2': chain.toggleHeading({ level: 2 }).run(); break
    case 'h3': chain.toggleHeading({ level: 3 }).run(); break
    case 'paragraph': chain.setParagraph().run(); break
    case 'bullet': chain.toggleBulletList().run(); break
    case 'numbered': chain.toggleOrderedList().run(); break
    case 'task': chain.toggleTaskList().run(); break
    case 'quote': chain.toggleBlockquote().run(); break
    case 'divider': chain.setHorizontalRule().run(); break
    case 'code': chain.toggleCodeBlock().run(); break
    case 'table':
      editor.value.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      break
    case 'blocks':
      showBlocksPanel.value = true
      break
    case 'save-block': {
      const { from: sf, to: st } = editor.value.state.selection
      if (sf === st) {
        // No selection - save entire content
        emit('saveBlock', editor.value.getHTML())
      }
      else {
        // Save selected content as text
        const selectedText = editor.value.state.doc.textBetween(sf, st, '\n')
        emit('saveBlock', selectedText)
      }
      break
    }
    case 'scope':
      editor.value.chain().focus().insertContent(`
        <h2>PROJECT SCOPE OF WORK:</h2>
        <p>The scope of this project includes the following work items:</p>
        <ul>
          <li>Item 1: [Description]</li>
          <li>Item 2: [Description]</li>
          <li>Item 3: [Description]</li>
        </ul>
        <p><em>All work will be performed in accordance with applicable codes and standards.</em></p>
      `).run()
      break
    case 'terms':
      editor.value.chain().focus().insertContent(`
        <h2>TERMS & CONDITIONS:</h2>
        <ol>
          <li><strong>Payment Terms:</strong> Net 30 days from date of invoice.</li>
          <li><strong>Warranty:</strong> All work is warranted for a period of one (1) year from the date of completion.</li>
          <li><strong>Change Orders:</strong> Any changes to the scope of work must be approved in writing before work begins. Additional costs may apply.</li>
          <li><strong>Insurance:</strong> Contractor maintains comprehensive general liability and workers' compensation insurance.</li>
          <li><strong>Permits:</strong> Contractor will obtain all necessary permits. Permit fees are the responsibility of the owner unless otherwise noted.</li>
        </ol>
      `).run()
      break
  }
}

function closeSlashMenu() {
  showSlashMenu.value = false
  slashFilter.value = ''
  slashSelectedIndex.value = 0
}

function insertBlock(block: ProposalBlock) {
  if (!editor.value)
    return
  editor.value.chain().focus().insertContent(block.content).run()
  showBlocksPanel.value = false
  blockSearchQuery.value = ''
}

// ─── Toolbar helpers ───
function setLink() {
  if (!editor.value)
    return
  const previousUrl = editor.value.getAttributes('link').href
  // eslint-disable-next-line no-alert
  const url = window.prompt('Enter URL:', previousUrl)
  if (url === null)
    return
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function insertImage() {
  if (!editor.value)
    return
  // eslint-disable-next-line no-alert
  const url = window.prompt('Enter image URL:')
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run()
  }
}

// Colors
const textColors = [
  { name: 'Default', color: '' },
  { name: 'Red', color: '#EF4444' },
  { name: 'Orange', color: '#F97316' },
  { name: 'Amber', color: '#F59E0B' },
  { name: 'Green', color: '#10B981' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Purple', color: '#8B5CF6' },
  { name: 'Pink', color: '#EC4899' },
]

const showColorPicker = ref(false)
function setColor(color: string) {
  if (!editor.value)
    return
  if (!color) { editor.value.chain().focus().unsetColor().run() }
  else { editor.value.chain().focus().setColor(color).run() }
  showColorPicker.value = false
}

// Category grouping for slash menu
function getGroupedCommands() {
  const groups: Record<string, typeof slashCommands> = {}
  filteredSlashCommands.value.forEach((cmd) => {
    if (!groups[cmd.category])
      groups[cmd.category] = []
    groups[cmd.category]!.push(cmd)
  })
  return groups
}

onUnmounted(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="relative proposal-canvas">
    <!-- ═══════ FIXED TOOLBAR ═══════ -->
    <div class="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b shadow-sm">
      <div v-if="editor" class="flex items-center gap-0.5 px-3 py-1.5 overflow-x-auto">
        <!-- Undo/Redo -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            :disabled="!editor.can().undo()"
            title="Undo"
            @click="editor.chain().focus().undo().run()"
          >
            <Icon name="i-lucide-undo-2" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :disabled="!editor.can().redo()"
            title="Redo"
            @click="editor.chain().focus().redo().run()"
          >
            <Icon name="i-lucide-redo-2" class="size-3.5" />
          </button>
        </div>

        <!-- Headings / Paragraph -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
            title="Heading 1"
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <Icon name="i-lucide-heading-1" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
            title="Heading 2"
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <Icon name="i-lucide-heading-2" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
            title="Heading 3"
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <Icon name="i-lucide-heading-3" class="size-3.5" />
          </button>
        </div>

        <!-- Text Formatting -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('bold') }"
            title="Bold"
            @click="editor.chain().focus().toggleBold().run()"
          >
            <Icon name="i-lucide-bold" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('italic') }"
            title="Italic"
            @click="editor.chain().focus().toggleItalic().run()"
          >
            <Icon name="i-lucide-italic" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('underline') }"
            title="Underline"
            @click="editor.chain().focus().toggleUnderline().run()"
          >
            <Icon name="i-lucide-underline" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('strike') }"
            title="Strikethrough"
            @click="editor.chain().focus().toggleStrike().run()"
          >
            <Icon name="i-lucide-strikethrough" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('highlight') }"
            title="Highlight"
            @click="editor.chain().focus().toggleHighlight().run()"
          >
            <Icon name="i-lucide-highlighter" class="size-3.5" />
          </button>
        </div>

        <!-- Font Size -->
        <div class="relative flex items-center gap-0.5 pr-2 border-r mr-2">
          <button class="proposal-toolbar-btn" title="Decrease Font Size" @click="decreaseFontSize">
            <Icon name="i-lucide-minus" class="size-3" />
          </button>
          <button
            class="proposal-toolbar-btn gap-0.5 px-1.5 min-w-[2.5rem]"
            title="Font Size"
            @click="showFontSizeMenu = !showFontSizeMenu"
          >
            <span class="text-[10px] font-bold tabular-nums">{{ getCurrentFontSize() }}</span>
          </button>
          <button class="proposal-toolbar-btn" title="Increase Font Size" @click="increaseFontSize">
            <Icon name="i-lucide-plus" class="size-3" />
          </button>
          <transition name="fade">
            <div v-if="showFontSizeMenu" class="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-xl p-1 w-20 max-h-48 overflow-y-auto">
              <button
                v-for="s in fontSizes"
                :key="s"
                class="w-full text-left px-2 py-1 text-[11px] rounded hover:bg-accent transition-colors tabular-nums"
                :class="getCurrentFontSize() === s ? 'bg-primary/10 text-primary font-bold' : ''"
                @click="setFontSize(s)"
              >
                {{ s }}px
              </button>
            </div>
          </transition>
        </div>

        <!-- Line Spacing -->
        <div class="relative pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn gap-0.5 px-1.5"
            title="Line Spacing"
            @click="showLineSpacingMenu = !showLineSpacingMenu"
          >
            <Icon name="i-lucide-line-chart" class="size-3.5" />
            <span class="text-[9px] font-bold">{{ currentLineSpacing }}</span>
          </button>
          <transition name="fade">
            <div v-if="showLineSpacingMenu" class="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-xl p-1 w-24">
              <button
                v-for="ls in lineSpacings"
                :key="ls.value"
                class="w-full text-left px-2 py-1.5 text-[11px] rounded hover:bg-accent transition-colors flex items-center justify-between"
                :class="currentLineSpacing === ls.value ? 'bg-primary/10 text-primary font-bold' : ''"
                @click="setLineSpacing(ls.value)"
              >
                <span>{{ ls.label }}</span>
                <Icon v-if="currentLineSpacing === ls.value" name="i-lucide-check" class="size-3" />
              </button>
            </div>
          </transition>
        </div>

        <!-- Text Color -->
        <div class="relative pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            title="Text Color"
            @click="showColorPicker = !showColorPicker"
          >
            <Icon name="i-lucide-palette" class="size-3.5" />
          </button>
          <transition name="fade">
            <div v-if="showColorPicker" class="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-lg shadow-xl p-2 flex gap-1.5">
              <button
                v-for="c in textColors"
                :key="c.name"
                class="size-6 rounded-full border-2 transition-transform hover:scale-125 flex items-center justify-center"
                :class="c.color ? 'border-transparent' : 'border-border'"
                :style="c.color ? { backgroundColor: c.color } : {}"
                :title="c.name"
                @click="setColor(c.color)"
              >
                <Icon v-if="!c.color" name="i-lucide-ban" class="size-3 text-muted-foreground" />
              </button>
            </div>
          </transition>
        </div>

        <!-- Alignment -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
            title="Align Left"
            @click="editor.chain().focus().setTextAlign('left').run()"
          >
            <Icon name="i-lucide-align-left" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
            title="Align Center"
            @click="editor.chain().focus().setTextAlign('center').run()"
          >
            <Icon name="i-lucide-align-center" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
            title="Align Right"
            @click="editor.chain().focus().setTextAlign('right').run()"
          >
            <Icon name="i-lucide-align-right" class="size-3.5" />
          </button>
        </div>

        <!-- Insert Items -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('bulletList') }"
            title="Bullet List"
            @click="editor.chain().focus().toggleBulletList().run()"
          >
            <Icon name="i-lucide-list" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('orderedList') }"
            title="Ordered List"
            @click="editor.chain().focus().toggleOrderedList().run()"
          >
            <Icon name="i-lucide-list-ordered" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('taskList') }"
            title="Task List"
            @click="editor.chain().focus().toggleTaskList().run()"
          >
            <Icon name="i-lucide-list-checks" class="size-3.5" />
          </button>
          <button
            class="proposal-toolbar-btn"
            :class="{ 'is-active': editor.isActive('blockquote') }"
            title="Blockquote"
            @click="editor.chain().focus().toggleBlockquote().run()"
          >
            <Icon name="i-lucide-text-quote" class="size-3.5" />
          </button>
        </div>

        <!-- Insert Objects -->
        <div class="flex items-center gap-0.5 pr-2 border-r mr-2">
          <button class="proposal-toolbar-btn" title="Insert Link" @click="setLink">
            <Icon name="i-lucide-link" class="size-3.5" />
          </button>
          <button class="proposal-toolbar-btn" title="Insert Image" @click="insertImage">
            <Icon name="i-lucide-image" class="size-3.5" />
          </button>
          <button class="proposal-toolbar-btn" title="Insert Table" @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()">
            <Icon name="i-lucide-table" class="size-3.5" />
          </button>
          <button class="proposal-toolbar-btn" title="Horizontal Rule" @click="editor.chain().focus().setHorizontalRule().run()">
            <Icon name="i-lucide-separator-horizontal" class="size-3.5" />
          </button>
        </div>

        <!-- Saved Blocks -->
        <div class="flex items-center gap-0.5">
          <button
            class="proposal-toolbar-btn gap-1 px-2"
            title="Insert Saved Block"
            @click="showBlocksPanel = !showBlocksPanel"
          >
            <Icon name="i-lucide-bookmark" class="size-3.5" />
            <span class="text-[10px] font-semibold hidden sm:inline">Blocks</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ BUBBLE MENU (appears on text selection) ═══════ -->
    <BubbleMenu
      v-if="editor"
      :editor="editor"
      :tippy-options="{ duration: 150, placement: 'top' }"
      class="bubble-menu"
    >
      <div class="flex items-center gap-0.5 bg-popover border rounded-xl shadow-2xl px-1.5 py-1 backdrop-blur-xl">
        <button class="bubble-btn" :class="{ 'is-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">
          <Icon name="i-lucide-bold" class="size-3.5" />
        </button>
        <button class="bubble-btn" :class="{ 'is-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()">
          <Icon name="i-lucide-italic" class="size-3.5" />
        </button>
        <button class="bubble-btn" :class="{ 'is-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()">
          <Icon name="i-lucide-underline" class="size-3.5" />
        </button>
        <button class="bubble-btn" :class="{ 'is-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()">
          <Icon name="i-lucide-strikethrough" class="size-3.5" />
        </button>
        <div class="w-px h-4 bg-border mx-0.5" />
        <button class="bubble-btn" :class="{ 'is-active': editor.isActive('highlight') }" @click="editor.chain().focus().toggleHighlight().run()">
          <Icon name="i-lucide-highlighter" class="size-3.5" />
        </button>
        <button class="bubble-btn" @click="setLink">
          <Icon name="i-lucide-link" class="size-3.5" />
        </button>
        <div class="w-px h-4 bg-border mx-0.5" />
        <button class="bubble-btn" title="Decrease Font" @click="decreaseFontSize">
          <Icon name="i-lucide-a-arrow-down" class="size-3.5" />
        </button>
        <button class="bubble-btn" title="Increase Font" @click="increaseFontSize">
          <Icon name="i-lucide-a-arrow-up" class="size-3.5" />
        </button>
        <div class="w-px h-4 bg-border mx-0.5" />
        <button class="bubble-btn text-amber-500 hover:text-amber-600" title="Save as Reusable Block" @click="() => { if (!editor) return; const { from: sf, to: st } = editor.state.selection; if (sf !== st) { const text = editor.state.doc.textBetween(sf, st, '\n'); emit('saveBlock', text); } }">
          <Icon name="i-lucide-bookmark-plus" class="size-3.5" />
        </button>
      </div>
    </BubbleMenu>

    <!-- ═══════ EDITOR CONTENT ═══════ -->
    <EditorContent :editor="editor" class="min-h-[600px]" />

    <!-- ═══════ SLASH COMMAND MENU ═══════ -->
    <transition name="slash-menu">
      <div
        v-if="showSlashMenu && filteredSlashCommands.length > 0"
        class="absolute z-50 bg-popover border rounded-xl shadow-2xl overflow-hidden w-72"
        :style="{ top: `${slashMenuPos.top}px`, left: `${slashMenuPos.left}px` }"
      >
        <div class="max-h-80 overflow-y-auto py-1">
          <template v-for="(commands, category) in getGroupedCommands()" :key="category">
            <div class="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {{ category }}
            </div>
            <button
              v-for="cmd in commands"
              :key="cmd.id"
              class="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors"
              :class="[filteredSlashCommands.indexOf(cmd) === slashSelectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50']"
              @mouseenter="slashSelectedIndex = filteredSlashCommands.indexOf(cmd)"
              @click="executeSlashCommand(cmd.id)"
            >
              <div class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon :name="cmd.icon" class="size-4" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold truncate">
                  {{ cmd.label }}
                </p>
                <p class="text-[10px] text-muted-foreground truncate">
                  {{ cmd.description }}
                </p>
              </div>
            </button>
          </template>
        </div>
      </div>
    </transition>

    <!-- ═══════ SAVED BLOCKS PANEL (Slide-over) ═══════ -->
    <transition name="blocks-panel">
      <div v-if="showBlocksPanel" class="fixed inset-y-0 right-0 z-50 w-96 bg-card border-l shadow-2xl flex flex-col">
        <div class="px-5 py-4 border-b flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="size-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
              <Icon name="i-lucide-bookmark" class="size-4 text-white" />
            </div>
            <div>
              <h3 class="text-sm font-bold">
                Saved Blocks
              </h3>
              <p class="text-[10px] text-muted-foreground">
                {{ savedBlocks.length }} blocks available
              </p>
            </div>
          </div>
          <button class="size-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center transition-colors" @click="showBlocksPanel = false">
            <Icon name="i-lucide-x" class="size-4" />
          </button>
        </div>
        <!-- Search -->
        <div class="px-4 py-3 border-b">
          <div class="relative">
            <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              v-model="blockSearchQuery"
              type="text"
              placeholder="Search blocks..."
              class="w-full h-8 pl-9 pr-3 text-xs rounded-lg border bg-muted/50 focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            >
          </div>
        </div>
        <!-- Blocks List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
          <div
            v-for="block in filteredBlocks"
            :key="block._id"
            class="group rounded-xl border bg-card hover:bg-accent/30 transition-all duration-200 cursor-pointer overflow-hidden hover:shadow-md"
            @click="insertBlock(block)"
          >
            <div class="p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-bold group-hover:text-primary transition-colors">
                  {{ block.title }}
                </h4>
                <Badge variant="secondary" class="text-[9px] font-bold h-4 px-1.5">
                  {{ block.category }}
                </Badge>
              </div>
              <p v-if="block.description" class="text-[10px] text-muted-foreground mb-2 line-clamp-2">
                {{ block.description }}
              </p>
              <div class="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Icon name="i-lucide-clock" class="size-3" />
                {{ new Date(block.updatedAt).toLocaleDateString() }}
              </div>
            </div>
            <div class="px-4 py-2 bg-muted/30 border-t flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
              <span class="text-[10px] text-muted-foreground">Click to insert</span>
              <Icon name="i-lucide-arrow-right" class="size-3 text-primary" />
            </div>
          </div>

          <div v-if="filteredBlocks.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <div class="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon name="i-lucide-bookmark" class="size-6 text-muted-foreground/40" />
            </div>
            <p class="text-xs font-semibold">
              No Blocks Found
            </p>
            <p class="text-[10px] text-muted-foreground mt-1">
              Save content blocks using / commands or the selection toolbar.
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Overlay for blocks panel -->
    <transition name="fade">
      <div
        v-if="showBlocksPanel"
        class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        @click="showBlocksPanel = false"
      />
    </transition>
  </div>
</template>

<style>
/* ─── Editor Content Styles ─── */
.proposal-editor-content {
  padding: 1.5rem 2rem;
  outline: none;
  font-family: 'Inter', 'Georgia', serif;
  line-height: 1.75;
  color: var(--foreground);
}

.proposal-editor-content:focus {
  outline: none;
}

.proposal-editor-content h1 {
  font-size: 1.875rem;
  font-weight: 900;
  letter-spacing: -0.025em;
  margin-bottom: 1rem;
  margin-top: 2rem;
  color: hsl(var(--foreground));
}

.proposal-editor-content h2 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 0.75rem;
  margin-top: 1.5rem;
  color: hsl(var(--foreground));
}

.proposal-editor-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1.25rem;
  color: hsl(var(--foreground));
}

.proposal-editor-content h4 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
  color: hsl(var(--foreground));
}

.proposal-editor-content p {
  font-size: 0.875rem;
  line-height: 1.625;
  margin-bottom: 0.75rem;
}

.proposal-editor-content ul {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.proposal-editor-content ul > * + * {
  margin-top: 0.25rem;
}

.proposal-editor-content ol {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.proposal-editor-content ol > * + * {
  margin-top: 0.25rem;
}

.proposal-editor-content li {
  font-size: 0.875rem;
}

.proposal-editor-content blockquote {
  border-left: 4px solid hsl(var(--primary) / 0.4);
  padding-left: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  margin: 1rem 0;
  font-style: italic;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--primary) / 0.05);
  border-radius: 0 0.5rem 0.5rem 0;
}

.proposal-editor-content pre {
  background: hsl(var(--muted));
  border-radius: 0.5rem;
  padding: 1rem;
  margin: 1rem 0;
  overflow-x: auto;
}

.proposal-editor-content pre code {
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

.proposal-editor-content code {
  background: hsl(var(--muted));
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  color: hsl(var(--primary));
}

.proposal-editor-content hr {
  border-top: 2px solid hsl(var(--border) / 0.6);
  margin: 2rem 0;
}

.proposal-editor-content img {
  max-width: 100%;
  border-radius: 0.5rem;
  margin: 1rem 0;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.proposal-editor-content a,
.proposal-editor-content .editor-link {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-decoration-color: hsl(var(--primary) / 0.3);
  cursor: pointer;
  transition: text-decoration-color 0.15s ease;
}

.proposal-editor-content a:hover,
.proposal-editor-content .editor-link:hover {
  text-decoration-color: hsl(var(--primary));
}

.proposal-editor-content mark {
  background: #fef08a;
  padding: 0 0.125rem;
  border-radius: 0.125rem;
}

/* Tables */
.proposal-editor-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.proposal-editor-content th,
.proposal-editor-content td {
  border: 1px solid hsl(var(--border) / 0.6);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.proposal-editor-content th {
  background: hsl(var(--muted));
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.proposal-editor-content td {
  font-size: 0.875rem;
}

/* Task List */
.proposal-editor-content ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.proposal-editor-content ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.proposal-editor-content ul[data-type="taskList"] li label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.proposal-editor-content ul[data-type="taskList"] li input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 2px solid hsl(var(--primary) / 0.3);
  accent-color: hsl(var(--primary));
}

/* Placeholder */
.proposal-editor-content .is-empty::before {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground) / 0.4);
  pointer-events: none;
  float: left;
  height: 0;
}

/* ─── Toolbar Buttons ─── */
.proposal-toolbar-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  transition: all 0.15s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}

.proposal-toolbar-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.proposal-toolbar-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.proposal-toolbar-btn.is-active {
  background: hsl(var(--primary) / 0.1);
  color: hsl(var(--primary));
}

/* ─── Bubble Menu Buttons ─── */
.bubble-btn {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  transition: all 0.1s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}

.bubble-btn:hover {
  background: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.bubble-btn.is-active {
  background: hsl(var(--primary) / 0.15);
  color: hsl(var(--primary));
}

/* ─── Transitions ─── */
.slash-menu-enter-active { animation: slideUp 150ms ease-out; }
.slash-menu-leave-active { animation: slideUp 100ms ease-in reverse; }

.blocks-panel-enter-active { animation: slideLeft 250ms cubic-bezier(0.16, 1, 0.3, 1); }
.blocks-panel-leave-active { animation: slideLeft 200ms ease-in reverse; }

.fade-enter-active { transition: opacity 200ms ease; }
.fade-leave-active { transition: opacity 150ms ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideLeft {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
