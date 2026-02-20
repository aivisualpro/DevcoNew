<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { UseTimeAgoMessages, UseTimeAgoOptions, UseTimeAgoUnitNamesDefault } from '@vueuse/core'
import type { Column, NewTask, Task } from '~/types/kanban'
import {
  CalendarDateTime,
  DateFormatter,
  getLocalTimeZone,
  parseAbsoluteToLocal,
} from '@internationalized/date'
import Draggable from 'vuedraggable'
import { useKanban } from '~/composables/useKanban'
import CardFooter from '../ui/card/CardFooter.vue'

const { board, addTask, updateTask, removeTask, setColumns, removeColumn, updateColumn, addAttachment: _addAttachment, removeAttachment, addComment, removeComment, onTaskMoved } = useKanban()

const newCommentText = ref('')

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})
const dueDate = ref<DateValue | undefined>()
const dueTime = ref<string | undefined>('00:00')

watch(() => dueTime.value, (newVal) => {
  if (!newVal)
    return
  if (dueDate.value) {
    const [hours, minutes] = newVal.split(':').map(Number)
    dueDate.value = new CalendarDateTime(
      dueDate.value.year,
      dueDate.value.month,
      dueDate.value.day,
      hours,
      minutes,
    )
  }
})

const showModalTask = ref<{ type: 'create' | 'edit', open: boolean, columnId: string | null, taskId?: string | null }>({
  type: 'create',
  open: false,
  columnId: null,
  taskId: null,
})
const newTask = reactive<NewTask>({
  title: '',
  description: '',
  priority: undefined,
  dueDate: undefined,
  status: '',
  labels: undefined,
})
function resetData() {
  dueDate.value = undefined
  dueTime.value = '00:00'
}
watch(() => showModalTask.value.open, (newVal) => {
  if (!newVal)
    resetData()
})

function openNewTask(colId: string) {
  showModalTask.value = { type: 'create', open: true, columnId: colId }
  newTask.title = ''
  newTask.description = ''
  newTask.priority = undefined
}
function createTask() {
  if (!showModalTask.value.columnId || !newTask.title.trim())
    return
  const payload: NewTask = {
    title: newTask.title.trim(),
    description: newTask.description?.trim(),
    priority: newTask.priority,
    dueDate: dueDate.value?.toDate(getLocalTimeZone()),
    status: showModalTask.value.columnId,
    labels: newTask.labels,
  }
  addTask(showModalTask.value.columnId, payload)
  showModalTask.value.open = false
}

function editTask() {
  if (!showModalTask.value.columnId || !newTask.title.trim())
    return
  const payload: Partial<Task> = {
    title: newTask.title.trim(),
    description: newTask.description?.trim(),
    priority: newTask.priority,
    dueDate: dueDate.value?.toDate(getLocalTimeZone()),
    status: showModalTask.value.columnId,
    labels: newTask.labels,
  }
  updateTask(showModalTask.value.columnId, showModalTask.value.taskId!, payload)
  showModalTask.value.open = false
}

function showEditTask(colId: string, taskId: string) {
  const task = board.value.columns.find(c => c.id === colId)?.tasks.find(t => t.id === taskId)
  if (!task)
    return
  newTask.title = task.title
  newTask.description = task.description
  newTask.priority = task.priority
  if (typeof task.dueDate === 'object') {
    task.dueDate = task.dueDate.toISOString()
  }
  dueDate.value = parseAbsoluteToLocal(task.dueDate as string)
  dueTime.value = `${dueDate.value.hour < 10 ? `0${dueDate.value?.hour}` : dueDate.value?.hour}:${dueDate.value.minute < 10 ? `0${dueDate.value?.minute}` : dueDate.value?.minute}`
  newTask.status = task.status
  newTask.labels = task.labels
  showModalTask.value = { type: 'edit', open: true, columnId: colId, taskId }
}

function onColumnDrop(evt: any) {
  // Full columns re-ordered
  setColumns(evt.to.__draggable_component__.modelValue)
}

function renameColumn(id: string) {
  const titleRef = document.getElementById(`col-title-${id}`) as HTMLElement
  if (titleRef)
    setTimeout(() => titleRef.focus(), 500)
}

function onUpdateColumn(evt: any, id: string) {
  if (!evt.target.textContent?.trim())
    return
  updateColumn(id, evt.target.textContent?.trim())
}

function onTaskDrop(evt: any) {
  // Persist status change when task is dragged to a different column
  if (evt.to !== evt.from) {
    const taskEl = evt.item
    const taskId = taskEl?.__draggable_context?.element?.id
    // Find which column the task landed in
    const toColIdx = Array.from(evt.to.closest('[class*="w-["]')?.parentElement?.children || []).indexOf(evt.to.closest('[class*="w-["]'))
    const toCol = board.value.columns[toColIdx]
    if (taskId && toCol) {
      onTaskMoved(taskId, toCol.id)
    }
  }
  nextTick(() => setColumns([...board.value.columns]))
}

function colorPriority(p?: Task['priority']) {
  if (!p)
    return 'text-warning'
  if (p === 'low')
    return 'text-blue-500'
  if (p === 'medium')
    return 'text-warning'
  return 'text-destructive'
}

function iconPriority(p?: Task['priority']) {
  if (!p)
    return 'lucide:equal'
  if (p === 'low')
    return 'lucide:chevron-down'
  if (p === 'medium')
    return 'lucide:equal'
  return 'lucide:chevron-up'
}

const SHORT_MESSAGES = {
  justNow: 'now',
  past: (n: string, _isPast: boolean) => n,
  future: (n: string, _isPast: boolean) => n,
  invalid: '',

  second: (n: number, _isPast: boolean) => `${n}sec`,
  minute: (n: number, _isPast: boolean) => `${n}min`,
  hour: (n: number, _isPast: boolean) => `${n}h`,
  day: (n: number, _isPast: boolean) => `${n}d`,
  week: (n: number, _isPast: boolean) => `${n}w`,
  month: (n: number, _isPast: boolean) => `${n}m`,
  year: (n: number, _isPast: boolean) => `${n}y`,
} as const satisfies UseTimeAgoMessages<UseTimeAgoUnitNamesDefault>

const OPTIONS: UseTimeAgoOptions<false, UseTimeAgoUnitNamesDefault> = {
  messages: SHORT_MESSAGES,
  showSecond: true,
  rounding: 'floor',
  updateInterval: 1000,
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto overflow-y-hidden pb-4 h-full">
    <!-- Columns Draggable wrapper -->
    <Draggable
      v-model="board.columns"
      class="flex gap-4 w-full h-full"
      item-key="id"
      :animation="180"
      handle=".col-handle"
      ghost-class="opacity-50"
      @end="onColumnDrop"
    >
      <template #item="{ element: col }: { element: Column }">
        <Card class="min-w-[272px] flex-1 shrink-0 py-2 gap-4 flex flex-col h-full">
          <CardHeader class="flex flex-row items-center justify-between gap-2 px-2">
            <CardTitle class="font-semibold text-base flex items-center gap-2">
              <Icon name="lucide:grip-vertical" class="col-handle cursor-grab opacity-60" />
              <span
                :id="`col-title-${col.id}`"
                contenteditable="true" class="hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 px-1 rounded"
                @blur="onUpdateColumn($event, col.id)" @keydown.enter.prevent
              >{{ col.title }}</span>
              <Badge variant="secondary" class="h-5 min-w-5 px-1 font-mono tabular-nums">
                {{ col.tasks.length }}
              </Badge>
            </CardTitle>
            <CardAction class="flex">
              <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground" @click="openNewTask(col.id)">
                <Icon name="lucide:plus" />
              </Button>
              <DropdownMenu modal>
                <DropdownMenuTrigger as-child>
                  <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground">
                    <Icon name="lucide:ellipsis-vertical" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent class="w-20" align="start">
                  <DropdownMenuItem @click="renameColumn(col.id)">
                    <Icon name="lucide:edit-2" class="size-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" class="text-destructive" @click="removeColumn(col.id)">
                    <Icon name="lucide:trash-2" class="size-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardAction>
          </CardHeader>
          <CardContent class="px-2 overflow-y-auto overflow-x-hidden flex-1">
            <!-- Tasks within the column -->
            <Draggable
              v-model="col.tasks"
              :group="{ name: 'kanban-tasks', pull: true, put: true }"
              item-key="id"
              :animation="180"
              class="flex flex-col gap-3 min-h-[24px] p-0.5"
              ghost-class="opacity-50"
              @end="onTaskDrop"
            >
              <template #item="{ element: t }: { element: Task }">
                <div class="rounded-xl border bg-card px-3 py-2 shadow-sm hover:bg-accent/50 cursor-pointer">
                  <div class="flex items-start justify-between gap-2">
                    <div class="text-sm text-muted-foreground">
                      {{ t.id }}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button size="icon-sm" variant="ghost" class="size-7 text-muted-foreground" title="More actions">
                          <Icon name="lucide:ellipsis-vertical" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent class="w-20" align="start">
                        <DropdownMenuItem @click="showEditTask(col.id, t.id)">
                          <Icon name="lucide:edit-2" class="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Icon name="lucide:copy" class="size-4" />
                          Copy card
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Icon name="lucide:link" class="size-4" />
                          Copy link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" class="text-destructive" @click="removeTask(col.id, t.id)">
                          <Icon name="lucide:trash-2" class="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p class="font-medium leading-5 mt-1">
                    {{ t.title }}
                  </p>
                  <div v-if="t.labels?.length" class="mt-3 flex items-center gap-1.5 flex-wrap">
                    <Badge v-for="label in t.labels" :key="label" variant="outline" class="text-xs">
                      {{ label }}
                    </Badge>
                  </div>
                  <div class="mt-3 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                      <!-- Attachments Popover -->
                      <Popover>
                        <PopoverTrigger as-child>
                          <button class="flex items-center text-sm text-muted-foreground gap-1 hover:text-foreground transition-colors cursor-pointer">
                            <Icon name="lucide:paperclip" class="size-3.5" />
                            <span class="tabular-nums">{{ t.attachments?.length || 0 }}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent class="w-72 p-0" align="start" @click.stop>
                          <div class="px-3 py-2 border-b">
                            <p class="text-sm font-semibold">
                              Attachments
                            </p>
                          </div>
                          <div class="max-h-48 overflow-y-auto">
                            <div v-if="!t.attachments?.length" class="px-3 py-4 text-sm text-muted-foreground text-center">
                              No attachments yet
                            </div>
                            <div v-for="att in t.attachments" :key="att.id" class="flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 group">
                              <Icon :name="att.type === 'image' ? 'lucide:image' : 'lucide:file'" class="size-3.5 text-muted-foreground shrink-0" />
                              <span class="text-xs flex-1 truncate">{{ att.name }}</span>
                              <button class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer" @click="removeAttachment(col.id, t.id, att.id)">
                                <Icon name="lucide:x" class="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <!-- Comments Popover -->
                      <Popover>
                        <PopoverTrigger as-child>
                          <button class="flex items-center text-sm text-muted-foreground gap-1 hover:text-foreground transition-colors cursor-pointer">
                            <Icon name="lucide:message-square" class="size-3.5" />
                            <span class="tabular-nums">{{ t.comments?.length || 0 }}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent class="w-80 p-0" align="start" @click.stop>
                          <div class="px-3 py-2 border-b">
                            <p class="text-sm font-semibold">
                              Comments
                            </p>
                          </div>
                          <div class="max-h-56 overflow-y-auto">
                            <div v-if="!t.comments?.length" class="px-3 py-4 text-sm text-muted-foreground text-center">
                              No comments yet
                            </div>
                            <div v-for="cm in t.comments" :key="cm.id" class="px-3 py-2 border-b last:border-b-0 group">
                              <div class="flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                  <Avatar class="size-5">
                                    <AvatarImage :src="cm.avatar || ''" :alt="cm.author" />
                                    <AvatarFallback class="text-[8px]">
                                      {{ cm.author?.slice(0, 2).toUpperCase() }}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span class="text-xs font-medium">{{ cm.author }}</span>
                                </div>
                                <div class="flex items-center gap-1">
                                  <span class="text-[10px] text-muted-foreground">{{ useTimeAgo(cm.createdAt ?? '', OPTIONS) }}</span>
                                  <button class="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all cursor-pointer" @click="removeComment(col.id, t.id, cm.id)">
                                    <Icon name="lucide:x" class="size-3" />
                                  </button>
                                </div>
                              </div>
                              <p class="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {{ cm.text }}
                              </p>
                            </div>
                          </div>
                          <div class="border-t px-2 py-2">
                            <form class="flex gap-1.5" @submit.prevent="() => { if (newCommentText.trim()) { addComment(col.id, t.id, newCommentText.trim()); newCommentText = '' } }">
                              <Input v-model="newCommentText" placeholder="Write a comment..." class="h-7 text-xs" />
                              <Button type="submit" size="icon" variant="ghost" class="size-7 shrink-0">
                                <Icon name="lucide:send" class="size-3.5" />
                              </Button>
                            </form>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <div v-if="t.dueDate" class="flex items-center text-sm text-muted-foreground gap-1">
                        <Icon name="lucide:clock-fading" class="size-3.5" />
                        <span>{{ useTimeAgo(t.dueDate ?? '', OPTIONS) }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <Icon v-if="t.priority" :name="iconPriority(t.priority)" class="size-4" :class="colorPriority(t.priority)" />
                        </TooltipTrigger>
                        <TooltipContent class="capitalize">
                          {{ t.priority }}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip v-if="t.assignee">
                        <TooltipTrigger as-child>
                          <Avatar class="size-6">
                            <AvatarImage :src="t.assignee.avatar || '/avatars/avatartion.png'" :alt="t.assignee.name" />
                            <AvatarFallback class="text-[10px]">
                              {{ t.assignee.name?.slice(0, 2).toUpperCase() }}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>{{ t.assignee.name }}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </template>
            </Draggable>
          </CardContent>
          <CardFooter class="px-2 mt-auto">
            <Button size="sm" variant="ghost" class="text-muted-foreground" @click="openNewTask(col.id)">
              <Icon name="lucide:plus" />
              Add Task
            </Button>
          </CardFooter>
        </Card>
      </template>
    </Draggable>
  </div>

  <!-- New Task Dialog -->
  <Dialog v-model:open="showModalTask.open">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>{{ showModalTask.type === 'create' ? 'New Task' : 'Edit Task' }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{ showModalTask.type === 'create' ? 'Add a new task to the board' : 'Edit the task' }}
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-3">
        <div class="grid items-baseline grid-cols-1 md:grid-cols-4 md:[&>label]:col-span-1 *:col-span-3 gap-3">
          <Label>Title</Label>
          <Input v-model="newTask.title" placeholder="Title" />
          <Label>Description</Label>
          <Textarea v-model="newTask.description" placeholder="Description (optional)" rows="4" />
          <Label>Priority</Label>
          <Select v-model="newTask.priority">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="Select a priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">
                Low
              </SelectItem>
              <SelectItem value="medium">
                Medium
              </SelectItem>
              <SelectItem value="high">
                High
              </SelectItem>
            </SelectContent>
          </Select>
          <Label>Due Date</Label>
          <div class="flex items-center gap-1">
            <Popover>
              <PopoverTrigger as-child>
                <Button
                  variant="outline"
                  :class="cn(
                    'flex-1 justify-start text-left font-normal px-3',
                    !dueDate && 'text-muted-foreground',
                  )"
                >
                  <Icon name="lucide:calendar" class="mr-2" />
                  {{ dueDate ? df.format(dueDate.toDate(getLocalTimeZone())) : "Pick a date" }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0">
                <Calendar v-model="dueDate" initial-focus />
              </PopoverContent>
            </Popover>
            <Input
              id="time-picker"
              v-model="dueTime"
              type="time"
              step="60"
              default-value="00:00"
              class="flex-1 bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="secondary" @click="showModalTask.open = false">
          Cancel
        </Button>
        <Button @click="showModalTask.type === 'create' ? createTask() : editTask()">
          {{ showModalTask.type === 'create' ? 'Create' : 'Update' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
