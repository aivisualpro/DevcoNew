import type { CrudColumn } from '~/composables/useCrud'

export const peopleColumns: CrudColumn[] = [
  { key: 'userName', label: 'Name', type: 'avatar' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'userRole', label: 'Role', type: 'badge' },
  { key: 'dealershipName', label: 'Dealership' },
  { key: 'location', label: 'Location' },
  { key: 'entityType', label: 'Entity Type' },
  { key: 'primaryContactPerson', label: 'Primary Contact' },
  { key: 'approvalStatus', label: 'Status', type: 'badge' },
  { key: 'createdAt', label: 'Joined', type: 'date' },
]

// Each sub-route defines how to filter the global users list
export interface PeopleRouteFilter {
  label: string
  filterFn: (user: any) => boolean
  showStatusCounts: boolean
}

export const peopleRouteFilters: Record<string, PeopleRouteFilter> = {
  devco: {
    label: 'Devco',
    filterFn: (user: any) => user.isStaff === true,
    showStatusCounts: false,
  },
  dealers: {
    label: 'Dealers',
    filterFn: (user: any) => user.userRole === 'Dealer',
    showStatusCounts: true,
  },
  customers: {
    label: 'Customers',
    filterFn: (user: any) => user.userRole === 'Customer',
    showStatusCounts: true,
  },
}
