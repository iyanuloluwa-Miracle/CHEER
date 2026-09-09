<template>
  <div class="flex flex-wrap gap-2.5">
    <button
      type="button"
      class="motion-cta motion-cta-primary rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60"
      :class="
        isDark
          ? 'bg-cheer-mint text-cheer-ink shadow-[0_10px_28px_-12px_rgba(200,240,221,0.65)] hover:bg-white'
          : 'bg-cheer-leaf text-white hover:bg-cheer-ink'
      "
      @click="copyLink"
    >
      {{ copied ? 'Copied!' : 'Copy Tippy link' }}
    </button>
    <NuxtLink
      :to="publicPath"
      class="motion-cta rounded-full px-4 py-2.5 text-sm font-semibold transition"
      :class="
        isDark
          ? 'border border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15'
          : 'border border-black/10 bg-white/90 text-cheer-ink hover:border-cheer-leaf/40 hover:bg-white'
      "
    >
      View public page
    </NuxtLink>
    <details class="relative">
      <summary
        class="motion-cta cursor-pointer list-none rounded-full px-4 py-2.5 text-sm font-semibold transition [&::-webkit-details-marker]:hidden"
        :class="
          isDark
            ? 'border border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15'
            : 'border border-black/10 bg-white/90 text-cheer-ink hover:border-cheer-leaf/40 hover:bg-white'
        "
      >
        Share
      </summary>
      <div
        class="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-black/8 bg-white p-2 shadow-xl shadow-cheer-ink/15"
        role="menu"
      >
        <p class="px-3 pb-2 pt-1.5 text-xs font-medium text-cheer-ink/50">
          Share your Tippy link
        </p>
        <a
          v-for="item in shareItems"
          :key="item.label"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          class="block rounded-xl px-3 py-2.5 text-sm font-semibold text-cheer-ink transition hover:bg-cheer-mint/45"
          role="menuitem"
          @click="item.onClick?.($event)"
        >
          {{ item.label }}
        </a>
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    publicUrl: string;
    publicPath: string;
    displayName: string;
    variant?: 'light' | 'dark';
  }>(),
  { variant: 'light' },
);

const isDark = computed(() => props.variant === 'dark');

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const shareText = computed(
  () => `Support ${props.displayName} on TippyMe — ${props.publicUrl}`,
);

const shareItems = computed(() => [
  {
    label: 'WhatsApp',
    href: `https://wa.me/?text=${encodeURIComponent(shareText.value)}`,
    external: true,
  },
  {
    label: 'X (Twitter)',
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support ${props.displayName} on TippyMe`)}&url=${encodeURIComponent(props.publicUrl)}`,
    external: true,
  },
  {
    label: 'LinkedIn',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.publicUrl)}`,
    external: true,
  },
  {
    label: 'Copy for Instagram bio',
    href: '#',
    external: false,
    onClick: (e: Event) => {
      e.preventDefault();
      void copyLink();
    },
  },
  {
    label: 'Copy for TikTok bio',
    href: '#',
    external: false,
    onClick: (e: Event) => {
      e.preventDefault();
      void copyLink();
    },
  },
]);

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.publicUrl);
    copied.value = true;
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt('Copy your Tippy link:', props.publicUrl);
  }
}
</script>
