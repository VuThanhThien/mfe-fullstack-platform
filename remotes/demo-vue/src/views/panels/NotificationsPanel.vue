<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '@/stores/dashboard.store';

const store = useDashboardStore();
const unread = computed(() => store.notifications.filter((n) => !n.read).length);

function addDemo() {
  store.addNotification('Demo notification', 'Added from the Notifications page.', 'info');
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Notifications
        <span class="ml-1 text-slate-400">({{ unread }} unread)</span>
      </h2>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
          @click="addDemo"
        >
          Add demo
        </button>
        <button
          type="button"
          class="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
          @click="store.markAllRead()"
        >
          Mark all read
        </button>
      </div>
    </div>

    <ul class="space-y-2">
      <li
        v-for="n in store.notifications"
        :key="n.id"
        class="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        :class="{ 'opacity-60': n.read }"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ n.title }}</p>
            <p class="text-xs text-slate-500">{{ n.message }}</p>
          </div>
          <button
            type="button"
            class="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            @click="store.removeNotification(n.id)"
          >
            Dismiss
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
