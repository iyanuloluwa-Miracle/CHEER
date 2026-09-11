<template>
  <div class="mx-auto max-w-md px-4 py-16 text-center">
    <h1 class="text-2xl font-bold text-cheer-ink">
      Bachs Connect
    </h1>
    <p class="mt-3 text-sm leading-relaxed text-cheer-ink/65">
      {{ message }}
    </p>
    <div class="mt-8 flex flex-col gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        :disabled="busy"
        @click="continueOnboarding"
      >
        {{ busy ? 'Working…' : primaryLabel }}
      </button>
      <NuxtLink
        to="/dashboard"
        class="text-sm font-semibold text-cheer-leaf"
      >
        Back to dashboard
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

useHead({ title: 'Connect — TippyMe' });

const route = useRoute();
const api = useApi();
const busy = ref(false);
const message = ref(
  route.path.includes('refresh')
    ? 'Your Bachs onboarding link expired. Generate a fresh one to finish Connect setup.'
    : 'Welcome back. Confirm settlement status on your dashboard — redirects alone do not prove onboarding finished.',
);
const primaryLabel = computed(() =>
  route.path.includes('refresh') ? 'Get a fresh link' : 'Refresh Connect status',
);

async function continueOnboarding() {
  busy.value = true;
  try {
    const result = await api.startConnectOnboarding();
    if (result.onboardingUrl) {
      window.location.href = result.onboardingUrl;
      return;
    }
    if (result.settlement.automatedFridayPayout !== 'CONFIGURED') {
      await api.enableFridayPayout();
    }
    await navigateTo('/dashboard?connect=1');
  } catch (err) {
    message.value =
      err instanceof ApiClientError
        ? err.message
        : 'Could not continue Connect onboarding.';
  } finally {
    busy.value = false;
  }
}
</script>
