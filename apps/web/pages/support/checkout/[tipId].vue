<template>
  <div class="mx-auto max-w-md px-4 py-16">
    <div
      v-if="loading"
      class="text-center text-sm text-cheer-ink/60"
      role="status"
      aria-live="polite"
    >
      Preparing secure checkout…
    </div>
    <div
      v-else-if="error"
      class="text-center"
    >
      <h1 class="text-2xl font-bold text-cheer-ink">
        Checkout unavailable
      </h1>
      <p class="mt-2 text-sm text-cheer-ink/65">
        {{ error }}
      </p>
      <NuxtLink
        to="/"
        class="mt-6 inline-flex rounded-full bg-cheer-leaf px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
      >
        Back home
      </NuxtLink>
    </div>
    <div
      v-else-if="tip"
      class="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-cheer-leaf">
        Secure checkout
      </p>
      <h1 class="mt-3 text-2xl font-bold text-cheer-ink">
        Continue to payment
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-cheer-ink/70">
        You’re supporting {{ tip.creator.displayName }}. Payment is processed through Bachs.
        In this demo environment, you can continue to the confirmation step.
      </p>
      <p class="mt-4 text-lg font-semibold text-cheer-ink">
        {{ formattedAmount }}
      </p>
      <p class="mt-1 text-sm text-cheer-ink/55">
        for {{ tip.creator.displayName }}
      </p>
      <NuxtLink
        :to="`/support/confirm/${tip.id}`"
        class="mt-8 inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
      >
        Continue
      </NuxtLink>
      <NuxtLink
        :to="`/${tip.creator.username}`"
        class="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
      >
        Cancel
      </NuxtLink>
      <p class="mt-5 text-xs text-cheer-ink/45">
        TippyMe does not store full card numbers. Sensitive payment details are handled by Bachs.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicTip } from '~/types/api';
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'support',
});

const route = useRoute();
const api = useApi();

const tipId = computed(() => String(route.params.tipId || ''));
const loading = ref(true);
const error = ref<string | null>(null);
const tip = ref<PublicTip | null>(null);

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

useHead({
  title: 'Checkout — TippyMe',
});

await load();

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const result = await api.getPublicTip(tipId.value);
    tip.value = result.tip;
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 404) {
      error.value = 'This tip could not be found.';
    } else {
      error.value = 'Unable to load checkout right now.';
    }
  } finally {
    loading.value = false;
  }
}
</script>
