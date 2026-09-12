<template>
  <div class="mx-auto max-w-md px-4 py-16 text-center">
    <h1 class="text-2xl font-bold text-cheer-ink">
      Refresh Connect link
    </h1>
    <p class="mt-3 text-sm font-semibold leading-relaxed text-cheer-ink/85">
      {{ message }}
    </p>
    <button
      type="button"
      class="mt-8 inline-flex items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      :disabled="busy"
      @click="refresh"
    >
      {{ busy ? 'Working…' : 'Get a fresh Bachs link' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
});

useHead({ title: 'Refresh Connect — TippyMe' });

const api = useApi();
const busy = ref(false);
const message = ref(
  'This Bachs onboarding link is no longer usable. TippyMe will issue a new one.',
);

async function refresh() {
  busy.value = true;
  try {
    const result = await api.startConnectOnboarding();
    if (result.onboardingUrl) {
      window.location.href = result.onboardingUrl;
      return;
    }
    await navigateTo('/dashboard?connect=1');
  } catch (err) {
    message.value =
      err instanceof ApiClientError
        ? err.message
        : 'Could not refresh Connect onboarding.';
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void refresh();
});
</script>
