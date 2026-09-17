import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import { stripBasePath } from '@mfe/sdk';
import DashboardLayout from '@/views/DashboardLayout.vue';
import OverviewPanel from '@/views/panels/OverviewPanel.vue';
import AnalyticsPanel from '@/views/panels/AnalyticsPanel.vue';
import ReportsPanel from '@/views/panels/ReportsPanel.vue';
import NotificationsPanel from '@/views/panels/NotificationsPanel.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DashboardLayout,
    children: [
      {
        path: '',
        name: 'overview',
        component: OverviewPanel,
        meta: { tab: 'overview' },
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: AnalyticsPanel,
        meta: { tab: 'analytics' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: ReportsPanel,
        meta: { tab: 'reports' },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: NotificationsPanel,
        meta: { tab: 'notifications' },
      },
    ],
  },
];

export type RouterMode = 'embedded' | 'standalone';

export function createAppRouter(mode: RouterMode = 'embedded'): Router {
  const history =
    mode === 'embedded'
      ? createMemoryHistory()
      : createWebHistory(import.meta.env.BASE_URL);

  return createRouter({
    history,
    routes,
  });
}

/** Seed memory history from the address bar before binding location sync. */
export async function seedEmbeddedLocation(
  router: Router,
  basePath: string,
): Promise<void> {
  const initial = stripBasePath(basePath, window.location.pathname);
  await router.replace(initial);
  await router.isReady();
}
