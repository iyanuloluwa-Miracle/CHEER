<template>
  <div class="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 lg:py-12">
    <div
      v-if="pending && !profile"
      class="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
      role="status"
      aria-live="polite"
    >
      <div class="overflow-hidden rounded-[1.75rem] bg-cheer-ink/90 p-8 sm:p-10">
        <div class="flex flex-col items-center lg:items-start">
          <div class="dash-shimmer h-24 w-24 rounded-full opacity-30" />
          <div class="dash-shimmer mt-6 h-8 w-48 rounded-2xl opacity-25" />
          <div class="dash-shimmer mt-3 h-4 w-36 rounded-full opacity-20" />
          <div class="dash-shimmer mt-8 h-24 w-full rounded-2xl opacity-15" />
        </div>
      </div>
      <div class="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/70 p-8 sm:p-10">
        <div class="dash-shimmer h-5 w-28 rounded-full opacity-30" />
        <div class="dash-shimmer mt-4 h-8 w-56 rounded-2xl opacity-25" />
        <div class="dash-shimmer mt-8 h-12 w-full rounded-2xl opacity-20" />
        <div class="dash-shimmer mt-3 h-12 w-full rounded-2xl opacity-15" />
        <div class="dash-shimmer mt-8 h-32 w-full rounded-2xl opacity-15" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="mx-auto max-w-md rounded-[1.75rem] border border-black/8 bg-white/90 px-6 py-14 text-center shadow-[0_20px_60px_-40px_rgba(15,28,23,0.35)]"
    >
      <div
        class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cheer-sand text-2xl font-bold text-cheer-ink/40"
        aria-hidden="true"
      >
        ?
      </div>
      <h1 class="mt-6 text-2xl font-bold tracking-tight text-cheer-ink sm:text-3xl">
        Page not found
      </h1>
      <p class="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-cheer-ink/65">
        {{ error }}
      </p>
      <NuxtLink
        to="/"
        class="motion-cta motion-cta-primary mt-8 inline-flex rounded-full bg-cheer-leaf px-6 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
      >
        Back home
      </NuxtLink>
    </div>

    <div
      v-else-if="profile"
      class="space-y-8 lg:space-y-10"
    >
      <div
        class="overflow-hidden rounded-[1.75rem] border border-black/6 bg-white shadow-[0_28px_70px_-42px_rgba(15,28,23,0.45)] lg:grid lg:grid-cols-[minmax(17rem,0.92fr)_minmax(0,1.08fr)]"
      >
        <aside
          class="relative overflow-hidden px-6 py-8 text-white sm:px-8 sm:py-10 lg:px-9 lg:py-11"
          style="
            background:
              radial-gradient(ellipse 80% 70% at 100% 0%, rgba(200, 240, 221, 0.2), transparent 55%),
              radial-gradient(ellipse 60% 50% at 0% 100%, rgba(240, 162, 2, 0.1), transparent 50%),
              linear-gradient(160deg, #1a4f38 0%, #134032 45%, #0f1c17 100%);
          "
        >
          <div
            class="pointer-events-none absolute inset-0 opacity-[0.16]"
            style="
              background-image: radial-gradient(rgba(200, 240, 221, 0.45) 1px, transparent 1px);
              background-size: 18px 18px;
            "
            aria-hidden="true"
          />

          <div class="relative flex flex-col items-center text-center lg:items-start lg:text-left">
            <div class="relative inline-flex">
              <div
                class="h-24 w-24 overflow-hidden rounded-full bg-cheer-mint shadow-[0_14px_36px_-12px_rgba(200,240,221,0.75)] ring-[5px] ring-white/15 sm:h-28 sm:w-28"
              >
                <img
                  :src="avatarSrc"
                  :alt="`${profile.displayName} profile photo`"
                  class="h-full w-full object-cover"
                  width="112"
                  height="112"
                  decoding="async"
                  fetchpriority="high"
                >
              </div>
              <span
                class="absolute bottom-1 right-1 h-3 w-3 rounded-full bg-cheer-glow ring-[3px] ring-[#134032]"
                aria-hidden="true"
              />
            </div>

            <h1 class="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:leading-none">
              {{ profile.displayName }}
            </h1>
            <p class="mt-1.5 text-sm font-semibold text-cheer-mint/80">
              {{ pathLabel }}
            </p>

            <p
              v-if="profile.bio"
              class="mt-4 max-w-sm text-sm leading-relaxed text-white/70 sm:text-[0.95rem]"
            >
              {{ profile.bio }}
            </p>

            <p
              v-if="profile.supportMessage"
              class="mt-5 max-w-sm border-l-2 border-cheer-mint/40 pl-3 text-left text-sm leading-relaxed text-white/85"
            >
              {{ profile.supportMessage }}
            </p>

            <nav
              v-if="profile.socialLinks?.length"
              class="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
              aria-label="Social links"
            >
              <a
                v-for="(link, i) in profile.socialLinks"
                :key="link.id ?? `${link.platform}-${i}`"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="motion-cta inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:border-cheer-mint/40 hover:bg-white/15 hover:text-cheer-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint"
              >
                {{ link.label || link.platform }}
              </a>
            </nav>
          </div>
        </aside>

        <section
          class="px-5 py-7 sm:px-8 sm:py-9 lg:px-9 lg:py-10"
          aria-labelledby="support-heading"
        >
          <header class="mb-7">
            <p class="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cheer-leaf">
              Send support
            </p>
            <h2
              id="support-heading"
              class="mt-1.5 text-2xl font-bold tracking-tight text-cheer-ink sm:text-[1.65rem]"
            >
              Support {{ profile.displayName }}
            </h2>
            <p class="mt-2 max-w-md text-sm leading-relaxed text-cheer-ink/60">
              Choose an amount, leave a note if you like, then continue to secure payment.
            </p>
          </header>

          <SupportForm
            :username="profile.username"
            :display-name="profile.displayName"
            :currency="profile.currency"
            :suggested-amounts="profile.suggestedTipAmounts ?? []"
          />
        </section>
      </div>

      <CreatorPublicActivity
        v-if="recentSupporterNotes.length"
        :recent-supporter-notes="recentSupporterNotes"
      />

      <p class="text-center text-xs leading-relaxed text-cheer-ink/45">
        TippyMe confirms support after Bachs verifies payment.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicCreatorPage } from '~/types/api';
import { ApiClientError } from '~/services/api';
import { resolveAvatarUrl } from '~/utils/avatar';

definePageMeta({
  layout: 'creator',
});

const route = useRoute();
const api = useApi();
const { track } = useSabilytics();

const username = computed(() =>
  String(route.params.username || '').toLowerCase(),
);

const {
  data,
  pending,
  error: fetchError,
} = await useAsyncData(
  () => `public-creator:${username.value}`,
  () => api.getCreatorByUsername(username.value),
  {
    watch: [username],
    // Keep prior profile visible while refetching a different username.
    lazy: false,
  },
);

const profile = computed(() => data.value?.profile ?? null);
const recentSupporterNotes = computed(
  () => data.value?.recentSupporterNotes ?? [],
);

const error = computed(() => {
  if (!fetchError.value) return null;
  const err = fetchError.value;
  if (err instanceof ApiClientError && err.statusCode === 404) {
    return 'This Tippy page does not exist.';
  }
  if (
    typeof err === 'object' &&
    err &&
    'statusCode' in err &&
    (err as { statusCode?: number }).statusCode === 404
  ) {
    return 'This Tippy page does not exist.';
  }
  return 'Unable to load this page right now.';
});

const avatarSrc = computed(() => {
  if (!profile.value) return resolveAvatarUrl(null, username.value || 'creator', 128);
  return resolveAvatarUrl(profile.value.avatarUrl, profile.value.username, 128);
});

const pathLabel = computed(() => {
  const path = profile.value?.publicPath || `/${username.value}`;
  return path.startsWith('/') ? path : `/${path}`;
});

useHead(() => ({
  title: profile.value
    ? `Support ${profile.value.displayName} — TippyMe`
    : 'Creator — TippyMe',
  meta: [
    {
      name: 'description',
      content: profile.value?.supportMessage
        || profile.value?.bio
        || 'Send support and a message through TippyMe.',
    },
  ],
  link: [
    { rel: 'preconnect', href: 'https://api.dicebear.com', crossorigin: '' },
    { rel: 'dns-prefetch', href: 'https://api.dicebear.com' },
  ],
}));

// Analytics after first paint — never block rendering.
onMounted(() => {
  const page = data.value as PublicCreatorPage | null;
  if (!page?.profile?.username) return;
  track('tip_page_view', { username: page.profile.username });
  void api.recordCreatorPageView(page.profile.username).catch(() => {
    // View counting must not block the tip page.
  });
});
</script>
