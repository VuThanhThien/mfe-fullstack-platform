import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';
import DashboardView from '@/views/DashboardView.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'overview', component: DashboardView, meta: { tab: 'overview' } },
  {
    path: '/analytics',
    name: 'analytics',
    component: DashboardView,
    meta: { tab: 'analytics' },
  },
  {
    path: '/reports',
    name: 'reports',
    component: DashboardView,
    meta: { tab: 'reports' },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: DashboardView,
    meta: { tab: 'notifications' },
  },
];

export type RouterMode = 'embedded' | 'standalone';

export function createAppRouter(mode: RouterMode = 'embedded'): Router {
  const history =
    mode === 'embedded' ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL);

  return createRouter({
    history,
    routes,
  });
}
