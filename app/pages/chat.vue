<script setup lang="ts">
const { setHeader } = usePageHeader()
setHeader({ title: 'Chat', icon: 'i-lucide-message-circle' })

// ─── Types ───
interface Message {
  id: string
  text: string
  sender: 'me' | 'them'
  time: string
  read?: boolean
}

interface Contact {
  id: string
  name: string
  avatar: string
  role: string
  online: boolean
  lastMessage: string
  lastTime: string
  unread: number
  messages: Message[]
}

// ─── Demo Contacts ───
const contacts = ref<Contact[]>([
  {
    id: '1',
    name: 'John Martinez',
    avatar: 'JM',
    role: 'Foreman',
    online: true,
    lastMessage: 'The crew is ready for tomorrow',
    lastTime: '2:15 PM',
    unread: 2,
    messages: [
      { id: 'm1', text: 'Hey, how\'s the 5th Street project going?', sender: 'me', time: '1:30 PM', read: true },
      { id: 'm2', text: 'Going well! We finished the trenching ahead of schedule', sender: 'them', time: '1:32 PM' },
      { id: 'm3', text: 'That\'s great news. Any issues with the soil conditions?', sender: 'me', time: '1:45 PM', read: true },
      { id: 'm4', text: 'Some rocky areas near the east side but we managed', sender: 'them', time: '1:48 PM' },
      { id: 'm5', text: 'Perfect. I\'ll update the client.', sender: 'me', time: '2:00 PM', read: true },
      { id: 'm6', text: 'The crew is ready for tomorrow', sender: 'them', time: '2:15 PM' },
    ],
  },
  {
    id: '2',
    name: 'Sarah Chen',
    avatar: 'SC',
    role: 'Project Manager',
    online: true,
    lastMessage: 'Updated the estimate for Oak Ave',
    lastTime: '1:45 PM',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Sarah, can you review EST-26-0142?', sender: 'me', time: '11:00 AM', read: true },
      { id: 'm2', text: 'Sure, I\'ll take a look this afternoon', sender: 'them', time: '11:15 AM' },
      { id: 'm3', text: 'Updated the estimate for Oak Ave', sender: 'them', time: '1:45 PM' },
    ],
  },
  {
    id: '3',
    name: 'Mike Rodriguez',
    avatar: 'MR',
    role: 'Equipment Operator',
    online: false,
    lastMessage: 'Backhoe needs maintenance by Friday',
    lastTime: 'Yesterday',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Mike, the CAT 420 is scheduled for Elm St next week', sender: 'me', time: 'Yesterday 9:00 AM', read: true },
      { id: 'm2', text: 'Got it. I\'ll prep it this weekend', sender: 'them', time: 'Yesterday 9:30 AM' },
      { id: 'm3', text: 'Also, the backhoe is making some noise', sender: 'them', time: 'Yesterday 2:00 PM' },
      { id: 'm4', text: 'Backhoe needs maintenance by Friday', sender: 'them', time: 'Yesterday 2:01 PM' },
    ],
  },
  {
    id: '4',
    name: 'Lisa Park',
    avatar: 'LP',
    role: 'Office Manager',
    online: true,
    lastMessage: 'Payroll submitted for this week ✅',
    lastTime: '12:30 PM',
    unread: 1,
    messages: [
      { id: 'm1', text: 'Lisa, are the timesheets in for this week?', sender: 'me', time: '10:00 AM', read: true },
      { id: 'm2', text: 'Almost! Missing 2 from the night crew', sender: 'them', time: '10:20 AM' },
      { id: 'm3', text: 'I\'ll follow up with them', sender: 'me', time: '10:25 AM', read: true },
      { id: 'm4', text: 'Payroll submitted for this week ✅', sender: 'them', time: '12:30 PM' },
    ],
  },
  {
    id: '5',
    name: 'David Kim',
    avatar: 'DK',
    role: 'Subcontractor',
    online: false,
    lastMessage: 'Invoice #4521 sent',
    lastTime: 'Monday',
    unread: 0,
    messages: [
      { id: 'm1', text: 'David, when can you start on the drainage work?', sender: 'me', time: 'Monday 8:00 AM', read: true },
      { id: 'm2', text: 'We can start Wednesday if permits are ready', sender: 'them', time: 'Monday 8:45 AM' },
      { id: 'm3', text: 'Permits are good to go', sender: 'me', time: 'Monday 9:00 AM', read: true },
      { id: 'm4', text: 'Invoice #4521 sent', sender: 'them', time: 'Monday 4:00 PM' },
    ],
  },
  {
    id: '6',
    name: 'Amanda Torres',
    avatar: 'AT',
    role: 'Safety Officer',
    online: false,
    lastMessage: 'JHA approved for the downtown site',
    lastTime: 'Feb 17',
    unread: 0,
    messages: [
      { id: 'm1', text: 'Amanda, did you review the JHA for downtown?', sender: 'me', time: 'Feb 17 2:00 PM', read: true },
      { id: 'm2', text: 'JHA approved for the downtown site', sender: 'them', time: 'Feb 17 3:30 PM' },
    ],
  },
])

const activeContactId = ref('1')
const newMessage = ref('')
const searchQuery = ref('')
const messagesContainer = ref<HTMLElement>()

const activeContact = computed(() => contacts.value.find(c => c.id === activeContactId.value))

const filteredContacts = computed(() => {
  if (!searchQuery.value)
    return contacts.value
  const q = searchQuery.value.toLowerCase()
  return contacts.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
  )
})

function selectContact(id: string) {
  activeContactId.value = id
  const contact = contacts.value.find(c => c.id === id)
  if (contact)
    contact.unread = 0
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function sendMessage() {
  if (!newMessage.value.trim() || !activeContact.value)
    return

  const msg: Message = {
    id: `m${Date.now()}`,
    text: newMessage.value.trim(),
    sender: 'me',
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    read: false,
  }

  activeContact.value.messages.push(msg)
  activeContact.value.lastMessage = msg.text
  activeContact.value.lastTime = msg.time
  newMessage.value = ''

  nextTick(() => scrollToBottom())
}

onMounted(() => scrollToBottom())

// Avatar colors based on initials
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
</script>

<template>
  <div class="flex h-full bg-background overflow-hidden">
    <!-- ─── Left Sidebar: Contact List ─── -->
    <div class="w-80 shrink-0 border-r flex flex-col bg-card">
      <!-- Sidebar Header -->
      <div class="px-4 py-3 border-b bg-muted/20">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold">
            Messages
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

      <!-- Contact List -->
      <div class="flex-1 overflow-y-auto">
        <button
          v-for="contact in filteredContacts"
          :key="contact.id"
          class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-border/30 hover:bg-muted/40"
          :class="{ 'bg-primary/5 border-l-2 border-l-primary': activeContactId === contact.id }"
          @click="selectContact(contact.id)"
        >
          <!-- Avatar -->
          <div class="relative shrink-0">
            <div
              class="size-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
              :class="getAvatarColor(contact.name)"
            >
              {{ contact.avatar }}
            </div>
            <!-- Online indicator -->
            <span
              v-if="contact.online"
              class="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-card"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium truncate">{{ contact.name }}</span>
              <span class="text-[10px] text-muted-foreground shrink-0">{{ contact.lastTime }}</span>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <p class="text-xs text-muted-foreground truncate pr-2">
                {{ contact.lastMessage }}
              </p>
              <Badge
                v-if="contact.unread > 0"
                class="h-4 min-w-4 px-1 text-[9px] font-bold bg-emerald-500 text-white shrink-0"
              >
                {{ contact.unread }}
              </Badge>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- ─── Right: Chat Area ─── -->
    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="activeContact">
        <!-- Chat Header -->
        <div class="shrink-0 px-5 py-3 border-b bg-card flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div
                class="size-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                :class="getAvatarColor(activeContact.name)"
              >
                {{ activeContact.avatar }}
              </div>
              <span
                v-if="activeContact.online"
                class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-card"
              />
            </div>
            <div>
              <h3 class="text-sm font-semibold">
                {{ activeContact.name }}
              </h3>
              <p class="text-[11px] text-muted-foreground">
                <span v-if="activeContact.online" class="text-emerald-500 font-medium">online</span>
                <span v-else>{{ activeContact.role }}</span>
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
          <!-- Date separator -->
          <div class="flex items-center justify-center py-3">
            <span class="px-3 py-1 bg-muted/60 rounded-lg text-[10px] text-muted-foreground font-medium shadow-sm">
              Today
            </span>
          </div>

          <!-- Message Bubbles -->
          <div
            v-for="msg in activeContact.messages"
            :key="msg.id"
            class="flex animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
            :class="msg.sender === 'me' ? 'justify-end' : 'justify-start'"
          >
            <div
              class="max-w-[70%] px-3 py-2 rounded-2xl shadow-sm relative group"
              :class="[
                msg.sender === 'me'
                  ? 'bg-emerald-500 dark:bg-emerald-600 text-white rounded-br-sm'
                  : 'bg-card dark:bg-muted border border-border/50 rounded-bl-sm',
              ]"
            >
              <p class="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                {{ msg.text }}
              </p>
              <div
                class="flex items-center justify-end gap-1 mt-0.5"
                :class="msg.sender === 'me' ? 'text-white/70' : 'text-muted-foreground'"
              >
                <span class="text-[9px]">{{ msg.time }}</span>
                <!-- Read receipts for sent messages -->
                <Icon
                  v-if="msg.sender === 'me'"
                  :name="msg.read ? 'i-lucide-check-check' : 'i-lucide-check'"
                  class="size-3"
                  :class="msg.read ? 'text-blue-200' : 'text-white/50'"
                />
              </div>
            </div>
          </div>
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
              :class="newMessage.trim() ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-muted'"
              :disabled="!newMessage.trim()"
            >
              <Icon
                :name="newMessage.trim() ? 'i-lucide-send' : 'i-lucide-mic'"
                class="size-4"
                :class="newMessage.trim() ? 'text-white' : 'text-muted-foreground'"
              />
            </Button>
          </form>
        </div>
      </template>

      <!-- No Contact Selected -->
      <template v-else>
        <div class="flex-1 flex items-center justify-center bg-muted/10">
          <div class="text-center">
            <div class="size-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Icon name="i-lucide-message-circle" class="size-10 text-emerald-500" />
            </div>
            <h3 class="text-lg font-semibold">
              DEVCO Chat
            </h3>
            <p class="text-sm text-muted-foreground mt-1">
              Select a conversation to start messaging
            </p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
