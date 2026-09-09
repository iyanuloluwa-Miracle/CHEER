<template>
  <div class="mx-auto max-w-xl px-4 py-8 sm:px-5 sm:py-12">
    <div
      v-if="pending"
      class="overflow-hidden rounded-[2rem] border border-black/5 bg-white/60 p-8 sm:p-10"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-col items-center">
        <div class="dash-shimmer h-28 w-28 rounded-full opacity-40" />
        <div class="dash-shimmer mt-6 h-8 w-48 rounded-2xl opacity-35" />
        <div class="dash-shimmer mt-3 h-4 w-36 rounded-full opacity-30" />
        <div class="dash-shimmer mt-8 h-40 w-full rounded-3xl opacity-25" />
      </div>
    </div>

    <div
      v-else-if="error"
      class="motion-animate rounded-[2rem] border border-black/8 bg-white/90 px-6 py-14 text-center shadow-[0_20px_60px_-40px_rgba(15,28,23,0.35)]"
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
      class="space-y-5"
    >
      <!-- Creator presence -->
      <header
        class="motion-animate relative overflow-hidden rounded-[2rem] px-5 py-9 text-center text-white shadow-[0_30px_80px_-40px_rgba(15,28,23,0.75)] sm:px-8 sm:py-11"
        style="
          background:
            radial-gradient(ellipse 70% 80% at 100% 0%, rgba(200, 240, 221, 0.22), transparent 55%),
            radial-gradient(ellipse 50% 60% at 0% 100%, rgba(240, 162, 2, 0.12), transparent 50%),
            linear-gradient(155deg, #1a4f38 0%, #134032 42%, #0f1c17 100%);
        "
      >
        <div
          class="pointer-events-none absolute inset-0 opacity-[0.18]"
          style="
            background-image: radial-gradient(rgba(200, 240, 221, 0.4) 1px, transparent 1px);
            background-size: 18px 18px;
          "
          aria-hidden="true"
        />
        <div
          class="dash-float pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cheer-mint/25 blur-3xl"
          aria-hidden="true"
        />

        <div class="relative">
          <div class="relative mx-auto inline-flex">
            <div
              class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-cheer-mint text-4xl font-bold text-cheer-ink shadow-[0_16px_40px_-12px_rgba(200,240,221,0.85)] ring-[6px] ring-white/15 sm:h-32 sm:w-32 sm:text-5xl"
            >
              <img
                :src="avatarSrc"
                :alt="`${profile.displayName} profile photo`"
                class="h-full w-full object-cover"
                width="128"
                height="128"
                decoding="async"
              >
            </div>
            <span
              class="dash-pulse-dot absolute bottom-1 right-2 h-3.5 w-3.5 rounded-full bg-cheer-glow text-cheer-glow ring-[3px] ring-[#134032]"
              aria-hidden="true"
            />
          </div>

          <p class="mt-6 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cheer-mint/75">
            Tippy page
          </p>
          <h1 class="mt-2 text-4xl font-bold tracking-tight sm:text-5xl sm:leading-none">
            {{ profile.displayName }}
          </h1>
          <p class="mt-2 text-sm font-semibold text-cheer-mint/80">
            {{ pathLabel }}
          </p>

          <p
            v-if="profile.bio"
            class="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/70"
          >
            {{ profile.bio }}
          </p>

          <blockquote
            v-if="profile.supportMessage"
            class="mx-auto mt-6 max-w-md rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-base leading-relaxed text-white/90 backdrop-blur-sm"
          >
            {{ profile.supportMessage }}
          </blockquote>

          <nav
            v-if="profile.socialLinks?.length"
            class="mt-6 flex flex-wrap justify-center gap-2"
            aria-label="Social links"
          >
            <a
              v-for="(link, i) in profile.socialLinks"
              :key="link.id ?? `${link.platform}-${i}`"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="motion-cta inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white/85 transition hover:border-cheer-mint/40 hover:bg-white/15 hover:text-cheer-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-mint"
            >
              {{ link.label || link.platform }}
            </a>
          </nav>
        </div>
      </header>

      <!-- Support panel -->
      <section
        class="motion-animate motion-animate-delay-1 overflow-hidden rounded-[2rem] border border-black/6 bg-white/90 shadow-[0_24px_60px_-36px_rgba(15,28,23,0.35)] backdrop-blur-md"
        aria-labelledby="support-heading"
      >
        <div
          class="border-b border-black/6 bg-gradient-to-r from-cheer-mint/25 via-white to-cheer-sand/40 px-5 py-5 sm:px-7 sm:py-6"
        >
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cheer-leaf">
            Send support
          </p>
          <h2
            id="support-heading"
            class="mt-1 text-xl font-bold tracking-tight text-cheer-ink sm:text-2xl"
          >
            Support {{ profile.displayName }}
          </h2>
          <p class="mt-1.5 text-sm leading-relaxed text-cheer-ink/60">
            Choose an amount, add a message if you’d like, then continue to secure payment.
          </p>
        </div>
        <div class="px-5 py-6 sm:px-7 sm:py-7">
          <SupportForm
            :username="profile.username"
            :display-name="profile.displayName"
            :currency="profile.currency"
            :suggested-amounts="profile.suggestedTipAmounts ?? []"
          />
        </div>
      </section>

      <CreatorPublicActivity
        v-if="tipsThisWeek"
        class="motion-animate motion-animate-delay-2"
        :tips-this-week="tipsThisWeek"
        :recent-supporter-notes="recentSupporterNotes"
      />

      <p class="motion-animate motion-animate-delay-2 text-center text-xs leading-relaxed text-cheer-ink/45">
        TippyMe confirms support after Bachs verifies payment.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CreatorProfile,
  PublicSupporterNote,
  TipsThisWeek,
} from '~/types/api';
import { ApiClientError } from '~/services/api';
import { resolveAvatarUrl } from '~/utils/avatar';

definePageMeta({
  layout: 'creator',
});

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
const tipsThisWeek = ref<TipsThisWeek | null>(null);
const recentSupporterNotes = ref<PublicSupporterNote[]>([]);

const avatarSrc = computed(() => {
  if (!profile.value) return resolveAvatarUrl(null, username.value || 'creator');
  return resolveAvatarUrl(profile.value.avatarUrl, profile.value.username);
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
  meta: [
    {
      name: 'description',
      content: profile.value?.supportMessage
        || profile.value?.bio
        || 'Send support and a message through TippyMe.',
    },
  ],
}));

await load();

async function load() {
  pending.value = true;
  error.value = null;
  try {
    const result = await api.getCreatorByUsername(username.value);
    profile.value = result.profile;
    tipsThisWeek.value = result.tipsThisWeek;
    recentSupporterNotes.value = result.recentSupporterNotes ?? [];
  } catch (err) {
    if (err instanceof ApiClientError && err.statusCode === 404) {
      error.value = 'This Tippy page does not exist.';
    } else {
      error.value = 'Unable to load this page right now.';
    }
    profile.value = null;
    tipsThisWeek.value = null;
    recentSupporterNotes.value = [];
  } finally {
    pending.value = false;
  }
}
</script>
