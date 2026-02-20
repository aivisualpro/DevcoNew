interface PageHeaderState {
  title: string
  description?: string
  icon?: string
  backLink?: { label: string, href: string }
  extras?: Record<string, any>
}

const headerState = reactive<PageHeaderState>({
  title: '',
  description: '',
  icon: '',
})

export function usePageHeader() {
  function setHeader(opts: PageHeaderState) {
    headerState.title = opts.title
    headerState.description = opts.description || ''
    headerState.icon = opts.icon || ''
    headerState.backLink = opts.backLink
    headerState.extras = opts.extras
  }

  function clearHeader() {
    headerState.title = ''
    headerState.description = ''
    headerState.icon = ''
    headerState.backLink = undefined
    headerState.extras = undefined
  }

  return {
    headerState: readonly(headerState),
    setHeader,
    clearHeader,
  }
}
