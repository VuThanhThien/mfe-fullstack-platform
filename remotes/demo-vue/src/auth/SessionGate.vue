<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';

export type SessionGateLoginContext = {
  /** True when bootstrap failed with transport/unreachable (`status === 0`). */
  unreachable: boolean;
  /** Re-run bootstrap (e.g. Retry after API unreachable). */
  retry: () => void;
};

const props = defineProps<{
  /** App supplies `() => refresh()` from `@mfe/sdk`. */
  bootstrap: () => Promise<void>;
}>();

defineSlots<{
  default: () => unknown;
  login: (ctx: SessionGateLoginContext) => unknown;
}>();

type GateState =
  | { kind: 'checking' }
  | { kind: 'ready' }
  | { kind: 'login'; unreachable: boolean };

const state = ref<GateState>({ kind: 'checking' });

/** Keep latest bootstrap without re-firing on every inline lambda identity change. */
const bootstrapRef = shallowRef(props.bootstrap);
watch(
  () => props.bootstrap,
  (fn) => {
    bootstrapRef.value = fn;
  },
);

function isUnreachableError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'status' in err &&
    (err as { status: unknown }).status === 0
  );
}

function runBootstrap(): void {
  state.value = { kind: 'checking' };
  bootstrapRef
    .value()
    .then(() => {
      state.value = { kind: 'ready' };
    })
    .catch((err: unknown) => {
      state.value = {
        kind: 'login',
        unreachable: isUnreachableError(err),
      };
    });
}

onMounted(() => {
  runBootstrap();
});
</script>

<template>
  <template v-if="state.kind === 'checking'" />
  <slot
    v-else-if="state.kind === 'login'"
    name="login"
    :unreachable="state.unreachable"
    :retry="runBootstrap"
  />
  <slot v-else />
</template>
