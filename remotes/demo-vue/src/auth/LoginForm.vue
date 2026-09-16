<script setup lang="ts">
import { reactive, ref } from 'vue';
import { loginSchema, type LoginFormValues } from './loginSchema';

const props = withDefaults(
  defineProps<{
    onSubmit: (values: LoginFormValues) => Promise<void>;
    /** App-resolved form error (invalid credentials, unreachable, etc.). */
    error?: string | null;
    disabled?: boolean;
    title?: string;
  }>(),
  {
    error: null,
    disabled: false,
    title: 'Sign in',
  },
);

const email = ref('');
const password = ref('');
const fieldErrors = reactive<{ email?: string; password?: string }>({});
const isSubmitting = ref(false);

const busy = () => props.disabled || isSubmitting.value;

async function onFormSubmit(event: Event): Promise<void> {
  event.preventDefault();
  fieldErrors.email = undefined;
  fieldErrors.password = undefined;

  const parsed = loginSchema.safeParse({
    email: email.value,
    password: password.value,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password') {
        fieldErrors[key] = issue.message;
      }
    }
    return;
  }

  isSubmitting.value = true;
  try {
    await props.onSubmit(parsed.data);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <h1
      class="mb-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
    >
      {{ title }}
    </h1>

    <div
      v-if="error"
      class="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
      role="alert"
    >
      {{ error }}
    </div>

    <form class="flex flex-col gap-3" novalidate @submit="onFormSubmit">
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-700 dark:text-slate-300"
          >Email</span
        >
        <input
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          :disabled="busy()"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :aria-invalid="!!fieldErrors.email"
        />
        <span
          v-if="fieldErrors.email"
          class="text-xs text-red-600 dark:text-red-400"
          >{{ fieldErrors.email }}</span
        >
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium text-slate-700 dark:text-slate-300"
          >Password</span
        >
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
          :disabled="busy()"
          class="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          :aria-invalid="!!fieldErrors.password"
        />
        <span
          v-if="fieldErrors.password"
          class="text-xs text-red-600 dark:text-red-400"
          >{{ fieldErrors.password }}</span
        >
      </label>

      <button
        type="submit"
        :disabled="busy()"
        class="mt-1 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
