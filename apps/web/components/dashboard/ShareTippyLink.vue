<template>
  <div class="flex flex-wrap gap-2">
    <button
      type="button"
      class="rounded-full bg-cheer-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-cheer-ink disabled:opacity-60"
      @click="copyLink"
    >
      {{ copied ? 'Copied!' : 'Copy Tippy link' }}
    </button>
    <NuxtLink
      :to="publicPath"
      class="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cheer-ink transition hover:border-cheer-leaf/40"
    >
      View public page
    </NuxtLink>
    <details class="relative">
      <summary
        class="cursor-pointer list-none rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-cheer-ink transition hover:border-cheer-leaf/40 [&::-webkit-details-marker]:hidden"
      >
        Share
      </summary>
      <div
        class="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-black/10 bg-white p-3 shadow-lg"
        role="menu"
      >
        <p class="px-2 pb-2 text-xs text-cheer-ink/55">
          Share your Tippy link
        </p>
        <a
          v-for="item in shareItems"
          :key="item.label"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noopener noreferrer' : undefined"
          class="block rounded-xl px-3 py-2 text-sm font-medium text-cheer-ink hover:bg-cheer-mint/40"
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
const props = defineProps<{
  publicUrl: string;
  publicPath: string;
  displayName: string;
}>();

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
    // Fallback for older browsers
    window.prompt('Copy your Tippy link:', props.publicUrl);
  }
}
</script>
