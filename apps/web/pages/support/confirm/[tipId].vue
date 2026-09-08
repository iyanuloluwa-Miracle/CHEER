<template>
  <div class="mx-auto max-w-md px-4 py-16">
    <div
      v-if="loading"
      class="text-center text-sm text-cheer-ink/60"
    >
      Checking your support…
    </div>
    <div
      v-else-if="error"
      class="text-center"
    >
      <h1 class="text-2xl font-bold text-cheer-ink">
        Something’s off
      </h1>
      <p class="mt-2 text-sm text-cheer-ink/65">
        {{ error }}
      </p>
      <NuxtLink
        to="/"
        class="mt-6 inline-flex rounded-full bg-cheer-leaf px-5 py-2 text-sm font-semibold text-white"
      >
        Back home
      </NuxtLink>
    </div>
    <div
      v-else-if="tip"
      class="space-y-6"
    >
      <div class="rounded-2xl border border-cheer-leaf/20 bg-cheer-mint/25 p-8 text-center">
        <p class="text-sm font-semibold text-cheer-leaf">
          {{ headline }}
        </p>
        <h1 class="mt-2 text-2xl font-bold text-cheer-ink">
          {{ title }}
        </h1>
        <p class="mt-3 text-sm leading-relaxed text-cheer-ink/70">
          {{ body }}
        </p>
        <p
          v-if="polling"
          class="mt-3 text-xs text-cheer-ink/45"
          role="status"
        >
          Waiting for payment confirmation…
        </p>
        <p class="mt-5 text-lg font-semibold text-cheer-ink">
          {{ formattedAmount }}
        </p>
        <p class="mt-1 text-sm text-cheer-ink/55">
          for {{ tip.creator.displayName }}
        </p>
      </div>

      <div
        v-if="tip.message"
        class="rounded-xl border border-black/8 bg-white px-4 py-3 text-sm text-cheer-ink/80"
      >
        <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
          Your note
        </p>
        <p class="mt-1 whitespace-pre-wrap">
          {{ tip.message }}
        </p>
        <p
          v-if="!tip.isAnonymous && tip.supporterName"
          class="mt-2 text-xs text-cheer-ink/50"
        >
          — {{ tip.supporterName }}
        </p>
        <p
          v-else-if="tip.isAnonymous"
          class="mt-2 text-xs text-cheer-ink/50"
        >
          — Anonymous
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <NuxtLink
          :to="`/${tip.creator.username}`"
          class="inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white"
        >
          Back to {{ tip.creator.displayName }}
        </NuxtLink>
        <NuxtLink
          to="/"
          class="inline-flex items-center justify-center rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-cheer-ink"
        >
          TippyMe home
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicTip, TipStatus } from '~/types/api';
import { ApiClientError } from '~/services/api';

const route = useRoute();
const api = useApi();

const tipId = computed(() => String(route.params.tipId || ''));
const loading = ref(true);
const error = ref<string | null>(null);
const tip = ref<PublicTip | null>(null);
const polling = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const formattedAmount = computed(() => {
  if (!tip.value) return '';
  const n = Number(tip.value.amount);
  if (!Number.isFinite(n)) return tip.value.amount;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: tip.value.currency,
    maximumFractionDigits: 2,
  }).format(n);
});

/**
 * Redirect success is never proof of payment.
 * Only PAID (via webhook/verify) means money landed — polled from backend.
 */
const headline = computed(() => {
  if (!tip.value) return '';
  if (tip.value.status === 'PAID') return 'Support received';
  if (tip.value.status === 'FAILED' || tip.value.status === 'EXPIRED') {
    return 'Payment didn’t complete';
  }
  return 'Thanks for supporting';
});

const title = computed(() => {
  if (!tip.value) return '';
  if (tip.value.status === 'PAID') return 'You’re all set';
  if (tip.value.status === 'FAILED' || tip.value.status === 'EXPIRED') {
    return 'Try again when you’re ready';
  }
  return 'We’re confirming your payment';
});

const body = computed(() => {
  if (!tip.value) return '';
  if (tip.value.status === 'PAID') {
    return `${tip.value.creator.displayName} will see your support shortly.`;
  }
  if (tip.value.status === 'FAILED' || tip.value.status === 'EXPIRED') {
    return 'No charge was completed for this tip.';
  }
  return 'Landing here after checkout does not mean the tip is paid yet. TippyMe confirms payment only after the provider verifies it.';
});

useHead({
  title: 'Support confirmation — TippyMe',
});

onMounted(() => {
  void load();
});

onBeforeUnmount(() => {
  stopPolling();
});

function isTerminal(status: TipStatus) {
  return status === 'PAID' || status === 'FAILED' || status === 'EXPIRED';
}

function stopPolling() {
  polling.value = false;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  if (pollTimer || !tip.value || isTerminal(tip.value.status)) return;
  polling.value = true;
  pollTimer = setInterval(() => {
    void refreshStatus();
  }, 2500);
}

async function refreshStatus() {
  try {
    const status = await api.getPaymentStatus(tipId.value);
    if (tip.value) {
      tip.value = { ...tip.value, status: status.tipStatus };
    }
    if (isTerminal(status.tipStatus)) {
      stopPolling();
    }
  } catch {
    // Keep showing last known tip state; webhook may still arrive
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const result = await api.getPublicTip(tipId.value);
    tip.value = result.tip;
    if (!isTerminal(result.tip.status)) {
      startPolling();
    }
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 404) {
      error.value = 'This tip could not be found.';
    } else {
      error.value = 'Unable to load confirmation right now.';
    }
  } finally {
    loading.value = false;
  }
}
</script>
