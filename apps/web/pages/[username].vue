<template>
  <div class="relative min-h-[70vh]">
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      aria-hidden="true"
      style="
        background:
          radial-gradient(ellipse 90% 55% at 15% -10%, rgba(200, 240, 221, 0.85), transparent 55%),
          radial-gradient(ellipse 70% 45% at 95% 5%, rgba(31, 107, 74, 0.12), transparent 50%),
          linear-gradient(180deg, #faf8f4 0%, #f3efe6 100%);
      "
    />

    <div class="mx-auto max-w-lg px-4 py-12 sm:py-16">
      <div
        v-if="pending"
        class="text-center text-sm text-cheer-ink/60"
      >
        Loading…
      </div>

      <div
        v-else-if="error"
        class="text-center"
      >
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

      <div
        v-else-if="profile"
        class="space-y-8"
      >
        <header class="flex flex-col items-center text-center">
          <div
            class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-cheer-mint/50 text-3xl font-bold text-cheer-leaf shadow-md"
          >
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.displayName"
              class="h-full w-full object-cover"
              width="96"
              height="96"
            >
            <span v-else>{{ initials }}</span>
          </div>
          <h1 class="mt-5 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl">
            {{ profile.displayName }}
          </h1>
          <p class="mt-1 text-sm font-semibold text-cheer-leaf">
            {{ pathLabel }}
          </p>
          <p
            v-if="profile.bio"
            class="mt-4 max-w-md text-base leading-relaxed text-cheer-ink/70"
          >
            {{ profile.bio }}
          </p>
          <p
            v-if="profile.supportMessage"
            class="mt-5 max-w-md text-base leading-relaxed text-cheer-ink/85"
          >
            {{ profile.supportMessage }}
          </p>

          <div
            v-if="profile.socialLinks?.length"
            class="mt-5 flex flex-wrap justify-center gap-4"
          >
            <a
              v-for="(link, i) in profile.socialLinks"
              :key="link.id ?? `${link.platform}-${i}`"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm font-semibold text-cheer-leaf hover:text-cheer-ink"
            >
              {{ link.label || link.platform }}
            </a>
          </div>
        </header>

        <section
          class="rounded-2xl border border-black/8 bg-white/80 p-6 shadow-sm backdrop-blur-sm sm:p-8"
          aria-label="Support form"
        >
          <h2 class="text-lg font-bold text-cheer-ink">
            Support {{ profile.displayName }}
          </h2>
          <p class="mt-1 text-sm text-cheer-ink/60">
            Pick an amount, add a note if you like, and continue to checkout.
          </p>
          <div class="mt-6">
            <SupportForm
              :username="profile.username"
              :display-name="profile.displayName"
              :currency="profile.currency"
              :suggested-amounts="profile.suggestedTipAmounts ?? []"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CreatorProfile } from '~/types/api';
import { ApiClientError } from '~/services/api';

const route = useRoute();
const api = useApi();
const config = useRuntimeConfig();

const username = computed(() =>
  String(route.params.username || '').toLowerCase(),
);
const appOrigin = computed(() => (config.public.appUrl as string) || '');

const pending = ref(true);
const error = ref<string | null>(null);
const profile = ref<CreatorProfile | null>(null);

const initials = computed(() => {
  if (!profile.value) return '';
  const parts = profile.value.displayName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
});

const pathLabel = computed(() => {
  const path = profile.value?.publicPath || `/${username.value}`;
  if (appOrigin.value) {
    try {
      return `${new URL(appOrigin.value).host}${path}`;
    } catch {
      return path;
    }
  }
  return path;
});

useHead(() => ({
  title: profile.value
    ? `Support ${profile.value.displayName} — TippyMe`
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
