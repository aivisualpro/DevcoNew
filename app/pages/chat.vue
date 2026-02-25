<script setup lang="ts">
import { toast } from 'vue-sonner'

const { setHeader } = usePageHeader()
setHeader({ title: 'Chat', icon: 'i-lucide-message-circle' })

// ─── State ───
const chats = ref<any[]>([])
const isLoading = ref(true)
const isSyncing = ref(false)
const activeContactId = ref('')
const newMessage = ref('')
const searchQuery = ref('')
const messagesContainer = ref<HTMLElement>()

// ─── Fetch chats from Firebase ───
async function fetchChats() {
  isLoading.value = true
  try {
    const res = await $fetch<any>('/api/chats')
    chats.value = res.chats || []
    // Auto-select first chat if none selected
    if (chats.value.length > 0 && !activeContactId.value) {
      activeContactId.value = chats.value[0]._id
    }
    nextTick(() => scrollToBottom())
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Failed to load chats'
    toast.error('Error', { description: msg })
  }
  finally {
    isLoading.value = false
  }
}

// ─── Sync from MongoDB → Firebase ───
async function syncChats() {
  if (isSyncing.value)
    return

  isSyncing.value = true
  try {
    const result = await $fetch<any>('/api/chats/sync', { method: 'POST' })
    toast.success(result.message, {
      description: `Created: ${result.stats.created} | Updated: ${result.stats.updated} | Duration: ${result.stats.duration}ms`,
    })
    // Reload from Firebase after sync
    await fetchChats()
  }
  catch (err: any) {
    const msg = err?.data?.message || err?.statusMessage || 'Sync failed'
    toast.error('Chat sync failed', { description: msg })
  }
  finally {
    isSyncing.value = false
  }
}

// ─── Derived ───
const activeChat = computed(() => chats.value.find(c => c._id === activeContactId.value))

const chatMessages = computed(() => {
  const chat = activeChat.value
  if (!chat)
    return []
  // Support messages as array field or sub-collection
  return chat.messages || []
})

const filteredChats = computed(() => {
  if (!searchQuery.value)
    return chats.value
  const q = searchQuery.value.toLowerCase()
  return chats.value.filter((c: any) => {
    const name = getChatName(c).toLowerCase()
    const lastMsg = getLastMessage(c).toLowerCase()
    return name.includes(q) || lastMsg.includes(q)
  })
})

function selectChat(id: string) {
  activeContactId.value = id
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function sendMessage() {
  if (!newMessage.value.trim() || !activeChat.value)
    return

  // Push locally for instant feedback
  const msg = {
    id: `m${Date.now()}`,
    text: newMessage.value.trim(),
    sender: 'me',
    time: new Date().toISOString(),
    read: false,
  }

  if (!activeChat.value.messages)
    activeChat.value.messages = []
  activeChat.value.messages.push(msg)
  newMessage.value = ''
  nextTick(() => scrollToBottom())
}

// ─── Helpers ───
function getChatName(chat: any): string {
  if (!chat)
    return ''
  // Try common field patterns
  return chat.name || chat.contactName || chat.title
    || chat.participant?.name || chat.participants?.map((p: any) => p.name || p).join(', ')
    || chat.user?.name || chat.userName
    || 'Chat'
}

function getChatAvatar(chat: any): string {
  const name = getChatName(chat)
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

function getChatRole(chat: any): string {
  return chat.role || chat.department || chat.type || chat.category || ''
}

function getLastMessage(chat: any): string {
  if (chat.lastMessage)
    return typeof chat.lastMessage === 'string' ? chat.lastMessage : chat.lastMessage.text || ''
  const msgs = chat.messages || []
  if (msgs.length > 0) {
    const last = msgs[msgs.length - 1]
    return last.text || last.message || last.content || ''
  }
  return 'No messages yet'
}

function getLastTime(chat: any): string {
  const dateStr = chat.lastMessageAt || chat.updatedAt || chat.lastTime || chat.createdAt
  if (!dateStr)
    return ''
  return formatRelativeTime(dateStr)
}

function getUnreadCount(chat: any): number {
  return chat.unread || chat.unreadCount || 0
}

function isOnline(chat: any): boolean {
  return chat.online || chat.isOnline || false
}

function getMessageSender(msg: any): string {
  if (msg.sender === 'me' || msg.from === 'me' || msg.direction === 'outgoing')
    return 'me'
  return 'them'
}

function getMessageText(msg: any): string {
  return msg.text || msg.message || msg.content || msg.body || ''
}

function getMessageTime(msg: any): string {
  const t = msg.time || msg.timestamp || msg.createdAt || msg.sentAt
  if (!t)
    return ''
  try {
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  catch { return String(t) }
}

function getMessageId(msg: any, idx: number): string {
  return msg.id || msg._id || `msg-${idx}`
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr)
    return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1)
      return 'now'
    if (diffMin < 60)
      return `${diffMin}m`
    if (diffHr < 24)
      return `${diffHr}h`
    if (diffDay < 2)
      return 'Yesterday'
    if (diffDay < 7)
      return `${diffDay}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  catch { return String(dateStr) }
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length] ?? 'bg-blue-500'
}

onMounted(() => fetchChats())
</script>

<template>
  <div class="flex h-full bg-background overflow-hidden">
    <!-- Teleport refresh button into the main header -->
    <ClientOnly>
      <Teleport to="#header-actions">
        <Button
          variant="outline"
          size="sm"
          class="h-8 gap-1.5"
          :disabled="isSyncing"
          @click="syncChats"
        >
          <Icon
            name="i-lucide-refresh-cw"
            class="size-3.5"
            :class="{ 'animate-spin': isSyncing }"
          />
          {{ isSyncing ? 'Syncing...' : 'Refresh' }}
        </Button>
      </Teleport>
    </ClientOnly>

    <!-- ─── Left Sidebar: Contact List ─── -->
    <div class="w-80 shrink-0 border-r flex flex-col bg-card">
      <!-- Sidebar Header -->
      <div class="px-4 py-3 border-b bg-muted/20">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold">
            Messages
            <Badge v-if="chats.length" variant="secondary" class="ml-1.5 text-[10px] tabular-nums">
              {{ chats.length }}
            </Badge>
          </h2>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" class="h-7 w-7 p-0">
              <Icon name="i-lucide-edit" class="size-4" />
            </Button>
          </div>
        </div>
        <!-- Search -->
        <div class="relative">
          <Icon name="i-lucide-search" class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search conversations..."
            class="h-8 pl-8 text-xs bg-background/60"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <Icon name="i-lucide-loader-2" class="size-6 animate-spin text-primary/60" />
          <p class="text-xs text-muted-foreground">
            Loading chats...
          </p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredChats.length === 0" class="flex-1 flex flex-col items-center justify-center px-4">
        <div class="size-14 rounded-full bg-muted/40 flex items-center justify-center mb-3">
          <Icon name="i-lucide-message-circle" class="size-7 text-muted-foreground/40" />
        </div>
        <p class="text-sm font-medium text-center">
          {{ chats.length === 0 ? 'No chats yet' : 'No results' }}
        </p>
        <p class="text-xs text-muted-foreground text-center mt-1">
          {{ chats.length === 0 ? 'Click Refresh to sync from database' : 'Try a different search' }}
        </p>
        <Button v-if="chats.length === 0" variant="outline" size="sm" class="mt-3 gap-1.5" @click="syncChats">
          <Icon name="i-lucide-refresh-cw" class="size-3.5" />
          Sync Chats
        </Button>
      </div>

      <!-- Contact List -->
      <div v-else class="flex-1 overflow-y-auto">
        <button
          v-for="chat in filteredChats"
          :key="chat._id"
          class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-muted/40"
          :class="{ 'bg-primary/5 border-l-2 border-l-primary': activeContactId === chat._id }"
          @click="selectChat(chat._id)"
        >
          <!-- Avatar -->
          <div class="relative shrink-0">
            <div
              class="size-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
              :class="getAvatarColor(getChatName(chat))"
            >
              {{ getChatAvatar(chat) }}
            </div>
            <!-- Online indicator -->
            <span
              v-if="isOnline(chat)"
              class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-primary border-2 border-card"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium truncate">{{ getChatName(chat) }}</span>
              <span class="text-[10px] text-muted-foreground shrink-0">{{ getLastTime(chat) }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <p class="text-xs text-muted-foreground truncate pr-2">
                {{ getLastMessage(chat) }}
              </p>
              <Badge
                v-if="getUnreadCount(chat) > 0"
                class="h-4 min-w-4 px-1 text-[9px] font-bold bg-primary text-primary-foreground shrink-0"
              >
                {{ getUnreadCount(chat) }}
              </Badge>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- ─── Right: Chat Area ─── -->
    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="activeChat">
        <!-- Chat Header -->
        <div class="shrink-0 px-5 py-3 border-b bg-card flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div
                class="size-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                :class="getAvatarColor(getChatName(activeChat))"
              >
                {{ getChatAvatar(activeChat) }}
              </div>
              <span
                v-if="isOnline(activeChat)"
                class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-primary border-2 border-card"
              />
            </div>
            <div>
              <h3 class="text-sm font-semibold">
                {{ getChatName(activeChat) }}
              </h3>
              <p class="text-[11px] text-muted-foreground">
                <span v-if="isOnline(activeChat)" class="text-primary font-medium">online</span>
                <span v-else>{{ getChatRole(activeChat) || 'offline' }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Icon name="i-lucide-phone" class="size-4" />
            </Button>
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Icon name="i-lucide-video" class="size-4" />
            </Button>
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Icon name="i-lucide-search" class="size-4" />
            </Button>
            <Button variant="ghost" size="sm" class="h-8 w-8 p-0">
              <Icon name="i-lucide-more-vertical" class="size-4" />
            </Button>
          </div>
        </div>

        <!-- Messages Area -->
        <div
          ref="messagesContainer"
          class="flex-1 overflow-y-auto px-6 py-4 space-y-1"
          style="background: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(0,0,0,0.008) 35px, rgba(0,0,0,0.008) 70px);"
        >
          <!-- Empty messages -->
          <div v-if="chatMessages.length === 0" class="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Icon name="i-lucide-message-square-dashed" class="size-10 mb-3 opacity-30" />
            <p class="text-sm">
              No messages in this conversation
            </p>
          </div>

          <template v-else>
            <!-- Date separator -->
            <div class="flex items-center justify-center py-3">
              <span class="px-3 py-1 bg-muted/60 rounded-lg text-[10px] text-muted-foreground font-medium shadow-sm">
                Messages
              </span>
            </div>

            <!-- Message Bubbles -->
            <div
              v-for="(msg, idx) in chatMessages"
              :key="getMessageId(msg, Number(idx))"
              class="flex animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
              :class="getMessageSender(msg) === 'me' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[70%] px-3 py-2 rounded-2xl shadow-sm relative group"
                :class="[
                  getMessageSender(msg) === 'me'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card dark:bg-muted border border-border/50 rounded-bl-sm',
                ]"
              >
                <p class="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                  {{ getMessageText(msg) }}
                </p>
                <div
                  class="flex items-center justify-end gap-1 mt-0.5"
                  :class="getMessageSender(msg) === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'"
                >
                  <span class="text-[9px]">{{ getMessageTime(msg) }}</span>
                  <!-- Read receipts for sent messages -->
                  <Icon
                    v-if="getMessageSender(msg) === 'me'"
                    :name="msg.read ? 'i-lucide-check-check' : 'i-lucide-check'"
                    class="size-3"
                    :class="msg.read ? 'text-primary-foreground' : 'text-primary-foreground/50'"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Message Input -->
        <div class="shrink-0 px-4 py-3 border-t bg-card">
          <form class="flex items-end gap-2" @submit.prevent="sendMessage">
            <Button variant="ghost" size="sm" class="h-9 w-9 p-0 shrink-0" type="button">
              <Icon name="i-lucide-smile" class="size-5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" class="h-9 w-9 p-0 shrink-0" type="button">
              <Icon name="i-lucide-paperclip" class="size-5 text-muted-foreground" />
            </Button>
            <div class="flex-1 relative">
              <Input
                v-model="newMessage"
                placeholder="Type a message..."
                class="h-10 pr-12 text-sm rounded-full bg-muted/30"
                @keydown.enter.exact.prevent="sendMessage"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              class="h-10 w-10 p-0 rounded-full shrink-0"
              :class="newMessage.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-muted'"
              :disabled="!newMessage.trim()"
            >
              <Icon
                :name="newMessage.trim() ? 'i-lucide-send' : 'i-lucide-mic'"
                class="size-4"
                :class="newMessage.trim() ? 'text-primary-foreground' : 'text-muted-foreground'"
              />
            </Button>
          </form>
        </div>
      </template>

      <!-- No Contact Selected -->
      <template v-else>
        <div class="flex-1 flex items-center justify-center bg-muted/10">
          <div class="text-center">
            <div class="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="i-lucide-message-circle" class="size-10 text-primary" />
            </div>
            <h3 class="text-lg font-semibold">
              DEVCO Chat
            </h3>
            <p v-if="isLoading" class="text-sm text-muted-foreground mt-1">
              Loading conversations...
            </p>
            <p v-else-if="chats.length === 0" class="text-sm text-muted-foreground mt-1">
              Click Refresh to sync conversations from the database
            </p>
            <p v-else class="text-sm text-muted-foreground mt-1">
              Select a conversation to start messaging
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
