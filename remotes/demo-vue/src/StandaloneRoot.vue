<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { login, refresh } from '@mfe/sdk';
import SessionGate from '@/auth/SessionGate.vue';
import LoginForm from '@/auth/LoginForm.vue';
import { resolveLoginError } from '@/auth/resolveLoginError';
import type { LoginFormValues } from '@/auth/loginSchema';
import RemoteHost from '@/RemoteHost.vue';
import { getMode, subscribeMode } from '@/theme/mode';
import '@/style.css';

const formError = ref<string | null>(null);
const mode = ref(getMode());

onMounted(() => {
  applyDocMode(mode.value);
});

const unsub = subscribeMode((next) => {
  mode.value = next;
  applyDocMode(next);
});

onUnmounted(() => {
  unsub();
});

function applyDocMode(m: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', m === 'dark');
}

function bootstrap(): Promise<void> {
  return refresh().then(() => undefined);
}

async function onLoginSubmit(
  values: LoginFormValues,
  retry: () => void,
): Promise<void> {
  formError.value = null;
  try {
    await login(values);
    retry();
  } catch (err) {
    formError.value = resolveLoginError(err);
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    data-demo-vue
  >
    <SessionGate :bootstrap="bootstrap">
      <template #login="{ unreachable, retry }">
        <div class="mx-auto flex max-w-sm flex-col px-4 pt-24">
          <div
            v-if="unreachable"
            class="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <p class="mb-2">
              Cannot reach the API. Start the backend (and check the Vite
              <code class="text-xs">/api</code> proxy).
            </p>
            <button
              type="button"
              class="rounded border border-amber-300 px-2 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/50"
              @click="
                formError = null;
                retry();
              "
            >
              Retry
            </button>
          </div>
          <LoginForm
            :error="formError"
            :on-submit="(values) => onLoginSubmit(values, retry)"
          />
        </div>
      </template>
      <RemoteHost />
    </SessionGate>
  </div>
</template>
