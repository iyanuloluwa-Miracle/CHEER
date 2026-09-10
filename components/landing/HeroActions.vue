<template>
  <div class="flex w-full max-w-xl flex-col items-center gap-3">
    <form
      class="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch"
      @submit.prevent="claimLink"
    >
      <label class="sr-only" for="hero-claim-username">
        Choose your Tippy username
      </label>
      <div
        class="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-black/10 bg-white px-4 shadow-sm focus-within:border-cheer-leaf/40 focus-within:ring-2 focus-within:ring-cheer-leaf/30"
      >
        <span class="shrink-0 text-sm font-medium text-cheer-ink/45">
          tippy.me/
        </span>
        <input
          id="hero-claim-username"
          v-model="username"
          type="text"
          autocomplete="username"
          maxlength="30"
          placeholder="yourname"
          class="w-full bg-transparent py-3 text-base text-cheer-ink outline-none placeholder:text-cheer-ink/35"
          @input="onInput"
        >
      </div>
      <button
        type="submit"
        class="motion-cta motion-cta-primary inline-flex shrink-0 items-center justify-center rounded-full bg-cheer-leaf px-6 py-3 text-sm font-semibold text-white transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="!canSubmit"
      >
        {{ primaryCta.label }}
      </button>
    </form>

    <p
      v-if="hint"
      class="text-sm text-cheer-ink/55"
      role="status"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { CtaLink } from '~/types/landing';
import { normalizeClaimUsername } from '~/utils/username-claim';

defineProps<{
  primaryCta: CtaLink;
}>();

const username = ref('');
const hint = ref<string | null>(null);

const canSubmit = computed(() => username.value.length >= 3);

function onInput() {
  username.value = normalizeClaimUsername(username.value);
  if (username.value.length > 0 && username.value.length < 3) {
    hint.value = 'Usernames need at least 3 characters.';
  } else {
    hint.value = null;
  }
}

function claimLink() {
  const normalized = normalizeClaimUsername(username.value);
  if (normalized.length < 3) {
    hint.value = 'Usernames need at least 3 characters.';
    return;
  }
  return navigateTo({
    path: '/signup',
    query: { username: normalized },
  });
}
</script>
