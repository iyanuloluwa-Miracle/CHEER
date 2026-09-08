<template>
  <div class="mx-auto max-w-md px-4 py-16">
    <div
      v-if="loading"
      class="text-center text-sm text-cheer-ink/60"
    >
      Loading checkout…
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
        class="mt-6 inline-flex rounded-full bg-cheer-leaf px-5 py-2 text-sm font-semibold text-white"
      >
        Back home
      </NuxtLink>
    </div>
    <div
      v-else-if="tip"
      class="rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
        Local checkout stub
      </p>
      <h1 class="mt-3 text-2xl font-bold text-cheer-ink">
        Continue to TippyMe
      </h1>
      <p class="mt-3 text-sm leading-relaxed text-cheer-ink/70">
        No Bachs API key is configured, so TippyMe is using the local stub
        checkout. With <code class="text-xs">BACHS_API_KEY</code> set, supporters
        are sent to Bachs hosted checkout instead.
      </p>
      <p class="mt-4 text-lg font-semibold text-cheer-ink">
        {{ formattedAmount }}
      </p>
      <p class="mt-1 text-sm text-cheer-ink/55">
        for {{ tip.creator.displayName }}
      </p>
      <NuxtLink
        :to="`/support/confirm/${tip.id}`"
        class="mt-8 inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-3 text-sm font-semibold text-white"
      >
        Simulate payment return
      </NuxtLink>
      <NuxtLink
        :to="`/${tip.creator.username}`"
        class="mt-3 inline-flex w-full items-center justify-center rounded-full border border-black/10 px-6 py-3 text-sm font-semibold text-cheer-ink"
      >
        Cancel
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicTip } from '~/types/api';
import { ApiClientError } from '~/services/api';

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
