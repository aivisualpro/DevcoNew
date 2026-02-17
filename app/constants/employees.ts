import type { CrudColumn } from '~/composables/useCrud'

export const employeeColumns: CrudColumn[] = [
  { key: 'fullName', label: 'Name', type: 'avatar' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'appRole', label: 'Role', type: 'badge' },
  { key: 'companyPosition', label: 'Position' },
  { key: 'designation', label: 'Designation' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'dateHired', label: 'Date Hired', type: 'date' },
]

// Each sub-route defines how to filter the global users list
export interface EmployeeRouteFilter {
  label: string
  filterFn: (user: any) => boolean
  showStatusCounts: boolean
}

export const employeeRouteFilters: Record<string, EmployeeRouteFilter> = {
  'super-admin': {
    label: 'Super Admin',
    filterFn: (user: any) => user.appRole === 'Super Admin',
    showStatusCounts: false,
  },
  'admin': {
    label: 'Admin',
    filterFn: (user: any) => user.appRole === 'Admin',
    showStatusCounts: false,
  },
  'employees': {
    label: 'Employees',
    filterFn: (user: any) =>
      user.appRole === 'Employee'
      || (user.appRole && !['Super Admin', 'Admin', 'Dealer', 'Customer'].includes(user.appRole)),
    showStatusCounts: true,
  },
}
