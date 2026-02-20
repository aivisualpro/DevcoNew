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
        title: 'Scheduled Jobs',
        icon: 'i-lucide-calendar-days',
        link: '/scheduled-jobs',
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
        title: 'Estimates',
        icon: 'i-lucide-scroll-text',
        link: '/estimates/all',
      },
    ],
  },
  {
    heading: 'Job Docs',
    items: [
      {
        title: 'Job Hazard Analysis (JHA)',
        icon: 'i-lucide-shield-alert',
        link: '/job-docs/jha',
      },
      {
        title: 'Daily Job Tickets (DJT)',
        icon: 'i-lucide-clipboard-list',
        link: '/job-docs/djt',
      },
      {
        title: 'Billing Tickets',
        icon: 'i-lucide-receipt',
        link: '/job-docs/billing-tickets',
      },
      {
        title: 'Receipts & Costs',
        icon: 'i-lucide-wallet',
        link: '/job-docs/receipts-costs',
      },
      {
        title: 'Prelims / Legal / Lien',
        icon: 'i-lucide-scale',
        link: '/job-docs/prelims',
      },
      {
        title: 'Releases',
        icon: 'i-lucide-file-check',
        link: '/job-docs/releases',
      },
      {
        title: 'Certified Payroll',
        icon: 'i-lucide-badge-dollar-sign',
        link: '/job-docs/certified-payroll',
      },
      {
        title: 'Planning',
        icon: 'i-lucide-gantt-chart',
        link: '/job-docs/planning',
      },
      {
        title: 'Signed Contracts',
        icon: 'i-lucide-file-signature',
        link: '/job-docs/signed-contracts',
      },
      {
        title: 'Company Docs',
        icon: 'i-lucide-building',
        link: '/job-docs/company-docs',
      },
      {
        title: 'Vehicle & Equipment Docs',
        icon: 'i-lucide-truck',
        link: '/job-docs/vehicle-equipment',
      },
      {
        title: 'Pothole Logs',
        icon: 'i-lucide-construction',
        link: '/job-docs/pothole-logs',
      },
      {
        title: 'Pre-Bore Logs',
        icon: 'i-lucide-drill',
        link: '/job-docs/pre-bore-logs',
      },
      {
        title: 'USA 811 Tickets',
        icon: 'i-lucide-ticket',
        link: '/job-docs/usa-811',
      },
    ],
  },
  {
    heading: 'Apps',
    items: [
      {
        title: 'Tasks',
        icon: 'i-lucide-kanban',
        link: '/tasks',
      },
      {
        title: 'Chat',
        icon: 'i-lucide-message-circle',
        link: '/chat',
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
      {
        title: 'Income Statement',
        icon: 'i-lucide-receipt',
        link: '/reports/income-statement',
      },
      {
        title: 'Financial Ratios',
        icon: 'i-lucide-chart-no-axes-combined',
        link: '/reports/ratios',
      },
      {
        title: 'Business Health',
        icon: 'i-lucide-heart-pulse',
        link: '/reports/business-health',
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
    ],
  },

]

export const navMenuBottom: NavMenuItems = []
