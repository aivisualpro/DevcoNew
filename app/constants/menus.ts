import type { NavMenu, NavMenuItems } from '~/types/nav'

export const navMenu: NavMenu[] = [
  {
    heading: 'General',
    items: [
      {
        title: 'Dashboard',
        icon: 'i-lucide-layout-dashboard',
        link: '/',
      },
      {
        title: 'Upcoming Jobs',
        icon: 'i-lucide-calendar-days',
        link: '/upcoming-jobs',
      },
      {
        title: 'Employees',
        icon: 'i-lucide-user-round-check',
        link: '/employees/super-admin',
      },
      {
        title: 'Clients',
        icon: 'i-lucide-building-2',
        link: '/clients',
      },
      {
        title: 'Auctions',
        icon: 'i-lucide-gavel',
        link: '/auctions/upcoming',
      },
      {
        title: 'Tasks',
        icon: 'i-lucide-calendar-check-2',
        link: '/tasks',
      },
    ],
  },
  {
    heading: 'Apps',
    items: [
      {
        title: 'Kanban Board',
        icon: 'i-lucide-kanban',
        link: '/kanban',
        new: true,
      },
      {
        title: 'Gantt Chart',
        icon: 'i-lucide-gantt-chart',
        link: '/gantt',
        new: true,
      },
    ],
  },
  {
    heading: 'Sales & Commerce',
    items: [
      {
        title: 'Quotes',
        icon: 'i-lucide-file-text',
        link: '/sales/quotes',
      },
      {
        title: 'Invoices',
        icon: 'i-lucide-receipt',
        link: '/sales/invoices',
      },
      {
        title: 'Orders',
        icon: 'i-lucide-shopping-cart',
        link: '/sales/orders',
      },
      {
        title: 'Products',
        icon: 'i-lucide-package',
        link: '/sales/products',
      },
      {
        title: 'Customers',
        icon: 'i-lucide-users',
        link: '/sales/customers',
      },
    ],
  },
  {
    heading: 'Inventory & Warehouse',
    items: [
      {
        title: 'Stock Overview',
        icon: 'i-lucide-warehouse',
        link: '/inventory/stock',
      },
      {
        title: 'Transfers',
        icon: 'i-lucide-arrow-left-right',
        link: '/inventory/transfers',
      },
      {
        title: 'Purchase Orders',
        icon: 'i-lucide-clipboard-list',
        link: '/inventory/purchase-orders',
      },
      {
        title: 'Vendors',
        icon: 'i-lucide-truck',
        link: '/inventory/vendors',
      },
    ],
  },
  {
    heading: 'HR & Workforce',
    items: [
      {
        title: 'Employees',
        icon: 'i-lucide-user-round-check',
        link: '/hr/employees',
      },
      {
        title: 'Attendance',
        icon: 'i-lucide-clock',
        link: '/hr/attendance',
      },
      {
        title: 'Payroll',
        icon: 'i-lucide-banknote',
        link: '/hr/payroll',
      },
      {
        title: 'Recruitment',
        icon: 'i-lucide-briefcase',
        link: '/hr/recruitment',
      },
      {
        title: 'Leave Mgmt',
        icon: 'i-lucide-calendar-off',
        link: '/hr/leaves',
      },
    ],
  },
  {
    heading: 'Finance & Accounting',
    items: [
      {
        title: 'Accounts',
        icon: 'i-lucide-wallet',
        link: '/finance/accounts',
      },
      {
        title: 'Transactions',
        icon: 'i-lucide-arrow-right-left',
        link: '/finance/transactions',
      },
      {
        title: 'Expenses',
        icon: 'i-lucide-credit-card',
        link: '/finance/expenses',
      },
      {
        title: 'Tax Management',
        icon: 'i-lucide-percent',
        link: '/finance/taxes',
      },
      {
        title: 'Balance Sheet',
        icon: 'i-lucide-landmark',
        link: '/finance/balance-sheet',
        new: true,
      },
      {
        title: 'Income Statement',
        icon: 'i-lucide-receipt',
        link: '/finance/income-statement',
        new: true,
      },
      {
        title: 'Financial Ratios',
        icon: 'i-lucide-chart-no-axes-combined',
        link: '/finance/ratios',
        new: true,
      },
      {
        title: 'Business Health',
        icon: 'i-lucide-heart-pulse',
        link: '/finance/business-health',
        new: true,
      },
    ],
  },
  {
    heading: 'Project Management',
    items: [
      {
        title: 'Projects',
        icon: 'i-lucide-folder-kanban',
        link: '/projects/list',
      },
      {
        title: 'Timesheets',
        icon: 'i-lucide-timer',
        link: '/projects/timesheets',
      },
      {
        title: 'Milestones',
        icon: 'i-lucide-flag',
        link: '/projects/milestones',
      },
    ],
  },
  {
    heading: 'Support',
    items: [
      {
        title: 'Tickets',
        icon: 'i-lucide-ticket',
        link: '/support/tickets',
      },
      {
        title: 'Knowledge Base',
        icon: 'i-lucide-book-open',
        link: '/support/knowledge-base',
      },
      {
        title: 'Live Chat',
        icon: 'i-lucide-message-circle',
        link: '/support/chat',
        new: true,
      },
    ],
  },

  {
    heading: 'Reports',
    items: [
      {
        title: 'Sales Reports',
        icon: 'i-lucide-trending-up',
        link: '/reports/sales',
      },
      {
        title: 'Financial Reports',
        icon: 'i-lucide-pie-chart',
        link: '/reports/financial',
      },

    ],
  },

]

export const navMenuBottom: NavMenuItems = []
