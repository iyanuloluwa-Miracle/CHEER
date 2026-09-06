<template>
  <div class="mx-auto max-w-lg px-4 py-12 sm:py-16">
    <div v-if="pending" class="text-center text-sm text-cheer-ink/60">
      Loading…
    </div>
    <div v-else-if="error" class="text-center">
      <h1 class="text-2xl font-bold text-cheer-ink">
        Page not found
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
    <CreatorPagePreview
      v-else-if="profile"
      :profile="profile"
      :app-origin="appOrigin"
      :show-tip-cta="true"
    />
  </div>
</template>

<script setup lang="ts">
import type { CreatorProfile } from '~/types/api';
import { ApiClientError } from '~/services/api';

const route = useRoute();
const api = useApi();
const config = useRuntimeConfig();

const username = computed(() => String(route.params.username || '').toLowerCase());
const appOrigin = computed(() => (config.public.appUrl as string) || '');

const pending = ref(true);
const error = ref<string | null>(null);
const profile = ref<CreatorProfile | null>(null);

useHead(() => ({
  title: profile.value
    ? `${profile.value.displayName} — TippyMe`
    : 'Creator — TippyMe',
}));

await load();

async function load() {
  pending.value = true;
  error.value = null;
  try {
    const result = await api.getCreatorByUsername(username.value);
    profile.value = result.profile;
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 404) {
      error.value = 'This Tippy page does not exist.';
    } else {
      error.value = 'Unable to load this page right now.';
    }
    profile.value = null;
  } finally {
    pending.value = false;
  }
}
</script>
