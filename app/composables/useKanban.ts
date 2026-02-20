import type { BoardState, Column, NewTask, Task } from '~/types/kanban'
import { nanoid } from 'nanoid'

function generateColumnId(title: string) {
  return title.toLowerCase().replace(/\s+/g, '-')
}

// Only 3 columns
const defaultBoard: BoardState = {
  columns: [
    { id: 'todo', title: 'To Do', tasks: [] },
    { id: 'in-progress', title: 'In Progress', tasks: [] },
    { id: 'done', title: 'Done', tasks: [] },
  ],
}

// Map task status string to column ID
function statusToColumnId(status: string | undefined): string {
  if (!status)
    return 'todo'
  const s = status.toLowerCase().trim()
  if (s === 'in progress' || s === 'in-progress' || s === 'inprogress')
    return 'in-progress'
  if (s === 'done' || s === 'completed' || s === 'complete')
    return 'done'
  return 'todo'
}

function columnIdToStatus(colId: string): string {
  if (colId === 'in-progress')
    return 'in progress'
  if (colId === 'done')
    return 'done'
  return 'todo'
}

function findTask(board: BoardState, columnId: string, taskId: string): Task | undefined {
  const col = board.columns.find(c => c.id === columnId)
  return col?.tasks.find(t => t.id === taskId)
}

export function useKanban() {
  const board = useState<BoardState>('kanban-board', () => structuredClone(defaultBoard))
  const isLoading = ref(false)

  // ── Load tasks from Firebase API ──
  async function loadFromApi() {
    isLoading.value = true
    try {
      const resp = await $fetch<any>('/api/tasks')
      const tasks: any[] = resp.tasks || []

      const freshBoard = structuredClone(defaultBoard)

      for (const t of tasks) {
        const colId = statusToColumnId(t.status)
        const col = freshBoard.columns.find(c => c.id === colId)
        if (!col)
          continue

        const kanbanTask: Task = {
          id: t._id,
          title: t.task || t.title || 'Untitled Task',
          description: t.description || '',
          status: colId,
          priority: t.priority || undefined,
          createdAt: t.createdAt || new Date().toISOString(),
          dueDate: t.dueDate || undefined,
          labels: t.labels || [],
          attachments: t.attachments || [],
          comments: t.comments || [],
        }

        if (Array.isArray(t.assignees) && t.assignees.length > 0) {
          const first = t.assignees[0]
          kanbanTask.assignee = {
            id: first.employeeId || first._id || '',
            name: first.name || first.firstName || 'Assignee',
            avatar: first.profilePicture || first.avatar || '',
          }
        }

        col.tasks.push(kanbanTask)
      }

      board.value = freshBoard
    }
    catch (err) {
      console.error('[useKanban] Failed to load tasks:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  onMounted(() => loadFromApi())

  // ── CREATE → Firebase ──
  async function addTask(columnId: string, payload: NewTask) {
    const col = board.value.columns.find(c => c.id === columnId)
    if (!col)
      return

    try {
      const resp = await $fetch<any>('/api/tasks/create', {
        method: 'POST',
        body: {
          task: payload.title,
          description: payload.description || '',
          status: columnIdToStatus(columnId),
          priority: payload.priority || null,
          labels: payload.labels || [],
        },
      })

      const created = resp.task
      col.tasks.unshift({
        id: created._id,
        title: created.task,
        description: created.description || '',
        status: columnId,
        priority: created.priority || undefined,
        createdAt: created.createdAt,
        labels: created.labels || [],
        attachments: [],
        comments: [],
      })
    }
    catch (err) {
      console.error('[useKanban] Failed to create task:', err)
    }
  }

  // ── UPDATE → Firebase ──
  async function updateTask(columnId: string, taskId: string, patch: Partial<Task>) {
    const col = board.value.columns.find(c => c.id === columnId)
    if (!col)
      return
    const t = col.tasks.find(t => t.id === taskId)
    if (!t)
      return

    Object.assign(t, patch)

    try {
      const body: Record<string, any> = {}
      if (patch.title !== undefined)
        body.task = patch.title
      if (patch.description !== undefined)
        body.description = patch.description
      if (patch.priority !== undefined)
        body.priority = patch.priority
      if (patch.status !== undefined)
        body.status = columnIdToStatus(patch.status)
      if (patch.labels !== undefined)
        body.labels = patch.labels
      if (patch.dueDate !== undefined)
        body.dueDate = patch.dueDate

      await $fetch(`/api/tasks/${taskId}`, { method: 'PUT', body })
    }
    catch (err) {
      console.error('[useKanban] Failed to update task:', err)
    }
  }

  // ── DELETE → Firebase ──
  async function removeTask(columnId: string, taskId: string) {
    const col = board.value.columns.find(c => c.id === columnId)
    if (!col)
      return

    col.tasks = col.tasks.filter(t => t.id !== taskId)

    try {
      await $fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
    }
    catch (err) {
      console.error('[useKanban] Failed to delete task:', err)
    }
  }

  // ── Update status when dragged between columns ──
  async function onTaskMoved(taskId: string, newColumnId: string) {
    try {
      await $fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        body: { status: columnIdToStatus(newColumnId) },
      })
    }
    catch (err) {
      console.error('[useKanban] Failed to update task status:', err)
    }
  }

  function addColumn(title: string) {
    const newCol: Column = { id: generateColumnId(title), title, tasks: [] }
    board.value.columns.push(newCol)
  }

  function removeColumn(id: string) {
    board.value.columns = board.value.columns.filter(c => c.id !== id)
  }

  function updateColumn(id: string, title: string) {
    const col = board.value.columns.find(c => c.id === id)
    if (!col)
      return
    col.title = title
  }

  function setColumns(next: Column[]) {
    board.value.columns = next
  }

  // ── Attachment CRUD (client-side only for now) ──
  function addAttachment(columnId: string, taskId: string, attachment: { name: string, url: string, type: 'image' | 'file', size?: number }) {
    const task = findTask(board.value, columnId, taskId)
    if (!task)
      return
    if (!task.attachments)
      task.attachments = []
    task.attachments.push({ id: nanoid(8), ...attachment, uploadedAt: new Date().toISOString() })
  }

  function removeAttachment(columnId: string, taskId: string, attachmentId: string) {
    const task = findTask(board.value, columnId, taskId)
    if (!task?.attachments)
      return
    task.attachments = task.attachments.filter(a => a.id !== attachmentId)
  }

  // ── Comment CRUD (client-side only for now) ──
  function addComment(columnId: string, taskId: string, text: string) {
    const task = findTask(board.value, columnId, taskId)
    if (!task)
      return
    if (!task.comments)
      task.comments = []
    task.comments.push({
      id: nanoid(8),
      author: 'You',
      avatar: '',
      text,
      createdAt: new Date().toISOString(),
    })
  }

  function removeComment(columnId: string, taskId: string, commentId: string) {
    const task = findTask(board.value, columnId, taskId)
    if (!task?.comments)
      return
    task.comments = task.comments.filter(c => c.id !== commentId)
  }

  return {
    board,
    isLoading,
    loadFromApi,
    onTaskMoved,
    addColumn,
    removeColumn,
    updateColumn,
    addTask,
    updateTask,
    removeTask,
    setColumns,
    addAttachment,
    removeAttachment,
    addComment,
    removeComment,
  }
}
