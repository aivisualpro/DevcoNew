import { nanoid } from 'nanoid'

export interface CrudColumn {
  key: string
  label: string
  type?: 'text' | 'badge' | 'avatar' | 'currency' | 'date' | 'progress' | 'email' | 'number' | 'tags' | 'avatar-only' | 'boolean' | 'percent'
}

export interface CrudFormField {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'select' | 'date' | 'textarea' | 'url'
  options?: { label: string, value: string }[]
  required?: boolean
  placeholder?: string
}

export function useCrud<T extends Record<string, any>>(storeKey: string, initialData: T[] = []) {
  const items = ref<T[]>([]) as Ref<T[]>
  const isLoaded = ref(false)

  function load() {
    if (import.meta.server)
      return
    try {
      const stored = localStorage.getItem(`fsc_${storeKey}`)
      if (stored) {
        items.value = JSON.parse(stored)
      }
      else {
        items.value = initialData.map(item => ({ ...item, id: item.id || nanoid(8) }))
        save()
      }
    }
    catch {
      items.value = initialData.map(item => ({ ...item, id: item.id || nanoid(8) }))
    }
    isLoaded.value = true
  }

  function save() {
    if (import.meta.server)
      return
    try {
      localStorage.setItem(`fsc_${storeKey}`, JSON.stringify(items.value))
    }
    catch { /* quota exceeded */ }
  }

  function create(item: Partial<T>): T {
    const newItem = { ...item, id: nanoid(8), createdAt: new Date().toISOString() } as unknown as T
    items.value.unshift(newItem)
    save()
    return newItem
  }

  function update(id: string, data: Partial<T>) {
    const index = items.value.findIndex((i: any) => i.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...data } as T
      save()
    }
  }

  function remove(id: string) {
    items.value = items.value.filter((i: any) => i.id !== id)
    save()
  }

  function reset() {
    items.value = initialData.map(item => ({ ...item, id: item.id || nanoid(8) }))
    save()
  }

  onMounted(load)

  return { items, isLoaded, create, update, remove, reset }
}
