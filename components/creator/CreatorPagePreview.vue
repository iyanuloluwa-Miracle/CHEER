<template>
  <article
    class="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm shadow-black/5"
  >
    <div
      class="relative px-6 pb-8 pt-10"
      style="
        background:
          radial-gradient(ellipse 80% 60% at 10% 0%, rgba(238, 230, 255, 0.7), transparent 55%),
          radial-gradient(ellipse 70% 50% at 100% 10%, rgba(147, 98, 255, 0.1), transparent 50%),
          #f7f4ff;
      "
    >
      <div class="flex flex-col items-center text-center">
        <div
          class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-cheer-mint/40 text-2xl font-bold text-cheer-leaf shadow-md"
        >
          <img
            :src="avatarSrc"
            :alt="profile.displayName"
            class="h-full w-full object-cover"
            width="80"
            height="80"
          >
        </div>
        <h2 class="mt-4 text-2xl font-bold tracking-tight text-cheer-ink">
          {{ profile.displayName }}
        </h2>
        <p class="mt-1 text-sm font-semibold text-cheer-leaf">
          {{ pathLabel }}
        </p>
        <p
          v-if="profile.bio"
          class="mt-3 max-w-md text-sm leading-relaxed text-cheer-ink/70"
        >
          {{ profile.bio }}
        </p>
        <p
          v-if="profile.supportMessage"
          class="mt-4 max-w-md rounded-xl bg-white/70 px-4 py-3 text-sm text-cheer-ink/80"
        >
          {{ profile.supportMessage }}
        </p>
      </div>
    </div>

    <div class="border-t border-black/5 px-6 py-5">
      <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
        Suggested tips · {{ profile.currency }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="amount in tipAmounts"
          :key="amount"
          class="rounded-full border border-black/10 bg-[#f7f4ff] px-3.5 py-1.5 text-sm font-semibold text-cheer-ink"
        >
          {{ formatAmount(amount) }}
        </span>
        <span
          v-if="!tipAmounts.length"
          class="text-sm text-cheer-ink/50"
        >
          Custom amounts welcome
        </span>
      </div>

      <div
        v-if="profile.socialLinks?.length"
        class="mt-5 flex flex-wrap gap-3"
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

      <p
        v-if="showTipCta"
        class="mt-6 text-center text-sm text-cheer-ink/50"
      >
        Open the public page to send a tip.
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CreatorProfile } from '~/types/api';
import { resolveAvatarUrl } from '~/utils/avatar';

const props = withDefaults(
  defineProps<{
    profile: Pick<
      CreatorProfile,
      | 'displayName'
      | 'username'
      | 'bio'
      | 'avatarUrl'
      | 'supportMessage'
      | 'currency'
      | 'suggestedTipAmounts'
      | 'socialLinks'
      | 'publicPath'
    >;
    showTipCta?: boolean;
    appOrigin?: string;
  }>(),
  {
    showTipCta: true,
    appOrigin: '',
  },
);

const avatarSrc = computed(() =>
  resolveAvatarUrl(props.profile.avatarUrl, props.profile.username),
);

const pathLabel = computed(() => {
  const path = props.profile.publicPath || `/${props.profile.username}`;
  if (props.appOrigin) {
    try {
      const host = new URL(props.appOrigin).host;
      return `${host}${path}`;
    } catch {
      return path;
    }
  }
  return path;
});

const tipAmounts = computed(() => props.profile.suggestedTipAmounts ?? []);

function formatAmount(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.profile.currency || 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}
</script>
