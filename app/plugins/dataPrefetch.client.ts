/**
 * Smart Data Prefetcher Plugin
 *
 * Watches route changes and eagerly prefetches data for the section the user
 * is navigating to. Because all composables use global caches with deduplication,
 * by the time the target page mounts, the data is already available — zero loading!
 *
 * This runs client-side only (.client suffix).
 */
export default defineNuxtPlugin(() => {
    const router = useRouter()

    router.beforeEach((to) => {
        const path = to.path

        // Prefetch scheduled jobs data when navigating to any /scheduled-jobs/* route
        if (path.startsWith('/scheduled-jobs')) {
            const { fetchAllSchedules } = useScheduledJobsApi()
            fetchAllSchedules() // Fire-and-forget: uses global cache, instant if already loaded
        }

        // Prefetch employees data when navigating to any /employees/* route
        if (path.startsWith('/employees')) {
            const { fetchAllUsers } = usePeopleApi()
            fetchAllUsers()
        }

        // Prefetch pre-bore data when navigating to pre-bore logs
        if (path.startsWith('/job-docs/pre-bore-logs')) {
            const { fetchAllPreBore } = usePreBoreApi()
            fetchAllPreBore()
        }

        // Prefetch pothole logs data when navigating to pothole logs
        if (path.startsWith('/job-docs/pothole-logs')) {
            const { fetchAllPotholeLogs } = usePotholeLogsApi()
            fetchAllPotholeLogs()
        }
    })
})
