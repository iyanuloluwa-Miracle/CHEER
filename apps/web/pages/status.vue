<template>
  <section class="mx-auto max-w-lg space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">API status</h1>
      <p class="mt-2 text-sm text-[var(--cheer-ink)]/65">
        Calls NestJS <code class="rounded bg-black/5 px-1">GET /api/health</code>
      </p>
    </div>

    <div class="rounded-xl border border-black/10 bg-white/70 p-5 shadow-sm">
      <p class="text-sm font-medium">
        Status:
        <span :class="statusClass">{{ label }}</span>
      </p>
      <pre
        v-if="health"
        class="mt-4 overflow-x-auto rounded-lg bg-[var(--cheer-ink)] p-4 text-xs text-[var(--cheer-mint)]"
      >{{ JSON.stringify(health, null, 2) }}</pre>
      <p v-if="error" class="mt-4 text-sm text-red-700">{{ error }}</p>
      <button
        type="button"
        class="mt-4 rounded-md border border-black/10 px-3 py-1.5 text-sm hover:bg-black/5"
        :disabled="pending"
        @click="refresh"
      >
        {{ pending ? 'Checking…' : 'Refresh' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HealthResponse } from '~/types/api';

useHead({ title: 'Status — Cheer' });

const { getHealth } = useApi();

const health = ref<HealthResponse | null>(null);
const error = ref<string | null>(null);
const pending = ref(false);

const label = computed(() => {
  if (pending.value) return 'checking';
  if (error.value) return 'unreachable';
  if (health.value?.status === 'ok') return 'ok';
  if (health.value?.status === 'degraded') return 'degraded';
  return 'unknown';
});

const statusClass = computed(() => {
  if (health.value?.status === 'ok') return 'text-[var(--cheer-leaf)]';
  if (health.value?.status === 'degraded') return 'text-amber-700';
  if (error.value) return 'text-red-700';
  return 'text-[var(--cheer-ink)]/60';
});

async function refresh() {
  pending.value = true;
  error.value = null;
  try {
    health.value = await getHealth();
  } catch (e) {
    health.value = null;
    error.value = e instanceof Error ? e.message : 'Failed to reach API';
  } finally {
    pending.value = false;
  }
}

onMounted(() => {
  void refresh();
});
</script>
