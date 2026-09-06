<template>
  <div class="mx-auto max-w-3xl px-4 py-12 sm:py-16">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-cheer-leaf">
          Creator dashboard
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink">
          {{ profile?.displayName || 'Your TippyMe' }}
        </h1>
        <p class="mt-2 text-cheer-ink/65">
          Signed in as
          <span class="font-semibold text-cheer-ink">{{ auth.user?.email }}</span>.
        </p>
        <p
          v-if="profile"
          class="mt-3 text-sm"
        >
          Public page:
          <NuxtLink
            :to="profile.publicPath"
            class="font-semibold text-cheer-leaf hover:text-cheer-ink"
          >
            {{ publicLabel }}
          </NuxtLink>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <NuxtLink
          v-if="profile"
          :to="profile.publicPath"
          class="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cheer-ink"
        >
          View page
        </NuxtLink>
        <button
          type="button"
          class="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cheer-ink transition hover:border-cheer-leaf/40"
          :disabled="loggingOut"
          @click="onLogout"
        >
          {{ loggingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>
    </header>

    <p class="mt-10 text-sm text-cheer-ink/55">
      Tip analytics and Bachs payouts arrive in later phases.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { CreatorProfile } from '~/types/api';

definePageMeta({
  middleware: 'auth',
});

useHead({
  title: 'Dashboard — TippyMe',
});

const auth = useAuthStore();
const api = useApi();
const config = useRuntimeConfig();
const loggingOut = ref(false);
const profile = ref<CreatorProfile | null>(null);

const publicLabel = computed(() => {
  if (!profile.value) return '';
  try {
    return `${new URL(config.public.appUrl as string).host}${profile.value.publicPath}`;
  } catch {
    return profile.value.publicPath;
  }
});

onMounted(async () => {
  try {
    const result = await api.getMyCreator();
    profile.value = result.profile;
  } catch {
    profile.value = null;
  }
});

async function onLogout() {
  loggingOut.value = true;
  try {
    await auth.logout();
    await navigateTo('/login');
  } finally {
    loggingOut.value = false;
  }
}
</script>
