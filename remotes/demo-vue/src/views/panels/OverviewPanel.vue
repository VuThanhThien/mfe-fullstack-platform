<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, ApiError } from '@mfe/sdk';

interface MeDto {
  id: string;
  email?: string;
  username?: string;
}

const me = ref<MeDto | null>(null);
const error = ref<string | null>(null);
const loading = ref(true);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await api.get<MeDto>('/api/v1/users/me');
    me.value = res.data;
  } catch (err) {
    error.value =
      err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to load /users/me';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="space-y-4">
    <div
      class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      data-testid="vue-overview-me"
    >
      <h2
        class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Session proof
      </h2>
      <p v-if="loading" class="text-sm text-slate-500">Loading /users/me…</p>
      <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </p>
      <dl v-else-if="me" class="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt class="text-slate-500">Email</dt>
          <dd class="font-medium text-slate-900 dark:text-slate-100">
            {{ me.email ?? '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-slate-500">Username</dt>
          <dd class="font-medium text-slate-900 dark:text-slate-100">
            {{ me.username ?? '—' }}
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-slate-500">User id</dt>
          <dd class="font-mono text-xs text-slate-700 dark:text-slate-300">
            {{ me.id }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div
        v-for="card in [
          { label: 'Revenue', value: '$12,450' },
          { label: 'Subscriptions', value: '1,204' },
          { label: 'Active now', value: '87' },
        ]"
        :key="card.label"
        class="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <p class="text-xs uppercase tracking-wide text-slate-500">
          {{ card.label }}
        </p>
        <p class="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
          {{ card.value }}
        </p>
      </div>
    </div>
  </div>
</template>
