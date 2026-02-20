export interface Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'file'
  size?: number
  uploadedAt: Date | number | string
}

export interface Comment {
  id: string
  author: string
  avatar?: string
  text: string
  createdAt: Date | number | string
}

export interface Task {
  id: string
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: {
    id: string
    name: string
    avatar?: string
  }
  dueDate?: Date | number | string
  status?: string
  labels?: string[]
  attachments?: Attachment[]
  comments?: Comment[]
  createdAt: Date | number | string
}

export interface NewTask extends Omit<Task, 'id' | 'assignee' | 'createdAt'> {
}

export interface Column {
  id: string
  title: string
  tasks: Task[]
}

export interface BoardState {
  columns: Column[]
}
