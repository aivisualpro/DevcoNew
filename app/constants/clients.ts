import type { CrudColumn } from '~/composables/useCrud'

export const clientColumns: CrudColumn[] = [
  { key: 'name', label: 'Client Name' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'projectCount', label: 'Projects' },
  { key: 'address', label: 'Address' },
  { key: 'createdAt', label: 'Created', type: 'date' },
  { key: 'updatedAt', label: 'Updated', type: 'date' },
]

// Tab filters — all rendered at /clients with client-side filtering
export interface ClientTabFilter {
  id: string
  label: string
  icon: string
  color: string
  filterFn: (client: any) => boolean
}

export const clientTabFilters: ClientTabFilter[] = [
  {
    id: 'lte-10',
    label: '≤ 10 Projects',
    icon: 'i-lucide-folder',
    color: 'text-blue-500',
    filterFn: (c: any) => (c.projectCount || 0) <= 10,
  },
  {
    id: 'gt-10',
    label: '> 10 Projects',
    icon: 'i-lucide-folder-open',
    color: 'text-emerald-500',
    filterFn: (c: any) => (c.projectCount || 0) > 10,
  },
  {
    id: 'gt-20',
    label: '> 20 Projects',
    icon: 'i-lucide-folder-check',
    color: 'text-amber-500',
    filterFn: (c: any) => (c.projectCount || 0) > 20,
  },
  {
    id: 'gt-30',
    label: '> 30 Projects',
    icon: 'i-lucide-folder-heart',
    color: 'text-red-500',
    filterFn: (c: any) => (c.projectCount || 0) > 30,
  },
]
