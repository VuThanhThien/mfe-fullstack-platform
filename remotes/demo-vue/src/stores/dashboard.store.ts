import { defineStore } from 'pinia';
import { ref } from 'vue';

export type DashboardTab =
  'overview' | 'analytics' | 'reports' | 'notifications';

export interface DashboardNotification {
  id: number;
  title: string;
  message: string;
  kind: 'success' | 'info' | 'warning';
  read: boolean;
}

export const useDashboardStore = defineStore('dashboard', () => {
  const tabVisits = ref<Record<DashboardTab, number>>({
    overview: 0,
    analytics: 0,
    reports: 0,
    notifications: 0,
  });

  const notifications = ref<DashboardNotification[]>([
    {
      id: 3,
      title: 'Weekly report ready',
      message: 'Your weekly sales report is ready to view.',
      kind: 'info',
      read: true,
    },
    {
      id: 2,
      title: 'Server alert',
      message: 'CPU usage exceeded 80% on web-01.',
      kind: 'warning',
      read: false,
    },
    {
      id: 1,
      title: 'New sale',
      message: 'A new order worth $1,240 was placed.',
      kind: 'success',
      read: false,
    },
  ]);

  /** Mock analytics series (reference-inspired; no Unovis this phase). */
  const analyticsBars = ref([
    { label: 'Mon', value: 42 },
    { label: 'Tue', value: 58 },
    { label: 'Wed', value: 35 },
    { label: 'Thu', value: 70 },
    { label: 'Fri', value: 55 },
    { label: 'Sat', value: 28 },
    { label: 'Sun', value: 40 },
  ]);

  function recordVisit(tab: DashboardTab) {
    tabVisits.value[tab] += 1;
  }

  function addNotification(
    title: string,
    message: string,
    kind: DashboardNotification['kind'] = 'info',
  ) {
    notifications.value.unshift({
      id: Date.now(),
      title,
      message,
      kind,
      read: false,
    });
  }

  function markAllRead() {
    notifications.value.forEach((n) => {
      n.read = true;
    });
  }

  function removeNotification(id: number) {
    notifications.value = notifications.value.filter((n) => n.id !== id);
  }

  return {
    tabVisits,
    notifications,
    analyticsBars,
    recordVisit,
    addNotification,
    markAllRead,
    removeNotification,
  };
});
