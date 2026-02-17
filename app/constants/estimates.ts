import type { CrudColumn } from '~/composables/useCrud'

    export const estimateColumns: CrudColumn[] = [
      { key: 'estimate', label: 'Estimate' },
      { key: 'projectName', label: 'Project Name' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'customerName', label: 'Client' },
      { key: 'proposalWriterName', label: 'Writer', type: 'avatar-only' },
      { key: 'fringe', label: 'Fringe', type: 'boolean' },
      { key: 'certifiedPayroll', label: 'CP', type: 'boolean' },
      { key: 'services', label: 'Services', type: 'tags' },
      { key: 'subTotal', label: 'SubTotal', type: 'currency' },
      { key: 'bidMarkUp', label: 'Markup %', type: 'percent' },
      { key: 'margin', label: 'Margin', type: 'currency' },
      { key: 'grandTotal', label: 'Total', type: 'currency' },
      { key: 'status', label: 'Status', type: 'badge' },
    ]

    export interface EstimateRouteFilter {
      label: string
      filterFn: (est: any) => boolean
      icon: string
      color: string
    }

    const isThisMonth = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    const isLastMonth = (dateStr: string) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }

    export const estimateRouteFilters: Record<string, EstimateRouteFilter> = {
      all: {
        label: 'All Estimates',
        filterFn: () => true,
        icon: 'i-lucide-list',
        color: 'text-gray-500',
      },
      'this-month': {
        label: 'This Month',
        filterFn: (est: any) => isThisMonth(est.date || est.createdAt),
        icon: 'i-lucide-calendar',
        color: 'text-blue-500',
      },
      'last-month': {
        label: 'Last Month',
        filterFn: (est: any) => isLastMonth(est.date || est.createdAt),
        icon: 'i-lucide-calendar-clock',
        color: 'text-indigo-500',
      },
      pending: {
        label: 'Pending',
        filterFn: (est: any) => est.status === 'Pending',
        icon: 'i-lucide-clock',
        color: 'text-amber-500',
      },
      completed: {
        label: 'Completed',
        filterFn: (est: any) => est.status === 'Completed',
        icon: 'i-lucide-check-circle',
        color: 'text-emerald-500',
      },
      won: {
        label: 'Won',
        filterFn: (est: any) => est.status === 'Won',
        icon: 'i-lucide-trophy',
        color: 'text-green-600',
      },
      lost: {
        label: 'Lost',
        filterFn: (est: any) => est.status === 'Lost',
        icon: 'i-lucide-thumbs-down',
        color: 'text-red-500',
      },
    }
