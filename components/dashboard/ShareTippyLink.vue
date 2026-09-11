<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2.5">
      <button
        type="button"
        class="motion-cta motion-cta-primary rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60"
        :class="
          isDark
            ? 'bg-cheer-mint text-cheer-ink shadow-[0_10px_28px_-12px_rgba(238, 230, 255,0.65)] hover:bg-white'
            : 'bg-cheer-leaf text-white hover:bg-cheer-ink'
        "
        @click="copyLink"
      >
        {{ copied ? 'Copied!' : 'Copy Tippy link' }}
      </button>
      <a
        :href="whatsappHref"
        target="_blank"
        rel="noopener noreferrer"
        class="motion-cta rounded-full px-4 py-2.5 text-sm font-semibold transition"
        :class="
          isDark
            ? 'border border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15'
            : 'border border-black/10 bg-white/90 text-cheer-ink hover:border-cheer-leaf/40 hover:bg-white'
        "
        @click="trackShare('whatsapp')"
      >
        Share on WhatsApp
      </a>
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
          More share
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
            @click="onShareClick(item, $event)"
          >
            {{ item.label }}
          </a>
        </div>
      </details>
    </div>

    <div
      v-if="showKit"
      class="grid gap-3 sm:grid-cols-[auto_1fr]"
      :class="isDark ? 'text-white' : 'text-cheer-ink'"
    >
      <div
        class="flex flex-col items-center gap-2 rounded-2xl border p-3"
        :class="isDark ? 'border-white/15 bg-white/10' : 'border-black/8 bg-white'"
      >
        <img
          :src="qrUrl"
          alt="QR code for your Tippy link"
          width="140"
          height="140"
          class="rounded-lg bg-white p-1"
        >
        <button
          type="button"
          class="text-xs font-semibold underline-offset-2 hover:underline"
          :class="isDark ? 'text-cheer-mint' : 'text-cheer-leaf'"
          @click="downloadCard"
        >
          Download support card
        </button>
      </div>
      <div class="flex flex-col justify-center gap-1.5 text-sm leading-relaxed">
        <p :class="isDark ? 'text-white/70' : 'text-cheer-ink/65'">
          Paste your Tippy link in WhatsApp, X, or your bio — no bank details in the chat.
        </p>
        <p
          v-if="goalLine"
          class="font-semibold"
          :class="isDark ? 'text-cheer-mint' : 'text-cheer-leaf'"
        >
          {{ goalLine }}
        </p>
        <p
          class="font-mono text-xs break-all"
          :class="isDark ? 'text-white/45' : 'text-cheer-ink/45'"
        >
          {{ publicUrl }}
        </p>
      </div>
    </div>

    <canvas
      ref="cardCanvas"
      class="hidden"
      width="720"
      height="400"
      aria-hidden="true"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    publicUrl: string;
    publicPath: string;
    displayName: string;
    variant?: 'light' | 'dark';
    showKit?: boolean;
    goalTitle?: string | null;
    goalPercent?: number | null;
  }>(),
  {
    variant: 'light',
    showKit: true,
    goalTitle: null,
    goalPercent: null,
  },
);

const { track } = useSabilytics();

const isDark = computed(() => props.variant === 'dark');
const cardCanvas = ref<HTMLCanvasElement | null>(null);

const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const username = computed(() =>
  props.publicPath.replace(/^\//, '').toLowerCase(),
);

const goalLine = computed(() => {
  if (!props.goalTitle) return null;
  const pct =
    props.goalPercent != null ? ` (${props.goalPercent}% there)` : '';
  return `Goal: ${props.goalTitle}${pct}`;
});

const shareText = computed(() => {
  const base = `Support ${props.displayName} on TippyMe — ${props.publicUrl}`;
  return goalLine.value ? `${base}\n${goalLine.value}` : base;
});

const whatsappHref = computed(
  () => `https://wa.me/?text=${encodeURIComponent(shareText.value)}`,
);

const qrUrl = computed(
  () =>
    `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(props.publicUrl)}`,
);

const shareItems = computed(() => [
  {
    label: 'WhatsApp',
    channel: 'whatsapp',
    href: whatsappHref.value,
    external: true,
  },
  {
    label: 'X (Twitter)',
    channel: 'x',
    href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Support ${props.displayName} on TippyMe`)}&url=${encodeURIComponent(props.publicUrl)}`,
    external: true,
  },
  {
    label: 'LinkedIn',
    channel: 'linkedin',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(props.publicUrl)}`,
    external: true,
  },
  {
    label: 'Copy for Instagram bio',
    channel: 'instagram',
    href: '#',
    external: false,
    onClick: (e: Event) => {
      e.preventDefault();
      void copyLink();
    },
  },
  {
    label: 'Copy for TikTok bio',
    channel: 'tiktok',
    href: '#',
    external: false,
    onClick: (e: Event) => {
      e.preventDefault();
      void copyLink();
    },
  },
]);

function trackShare(channel: string) {
  track('tip_link_share', {
    username: username.value,
    channel,
  });
}

function onShareClick(
  item: {
    channel: string;
    external: boolean;
    onClick?: (e: Event) => void;
  },
  event: Event,
) {
  if (item.external) {
    trackShare(item.channel);
  }
  item.onClick?.(event);
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.publicUrl);
    copied.value = true;
    track('tip_link_copy', { username: username.value });
    if (copyTimer) clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    window.prompt('Copy your Tippy link:', props.publicUrl);
    track('tip_link_copy', { username: username.value });
  }
}

async function downloadCard() {
  const canvas = cardCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#5b2db8');
  grad.addColorStop(0.45, '#3b1d7a');
  grad.addColorStop(1, '#1a1228');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(238, 230, 255,0.9)';
  ctx.font = '600 18px Darker Grotesque, sans-serif';
  ctx.fillText('TippyMe', 40, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 42px Darker Grotesque, sans-serif';
  ctx.fillText(`Support ${props.displayName}`, 40, 120);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '500 22px Darker Grotesque, sans-serif';
  const line = goalLine.value || 'One link. No bank details in the chat.';
  ctx.fillText(line.slice(0, 52), 40, 168);

  ctx.fillStyle = '#eee6ff';
  ctx.font = '600 20px Darker Grotesque, sans-serif';
  ctx.fillText(props.publicUrl.slice(0, 48), 40, 230);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('qr'));
      img.src = qrUrl.value;
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w - 190, h - 190, 150, 150);
    ctx.drawImage(img, w - 182, h - 182, 134, 134);
  } catch {
    // QR optional for download
  }

  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `tippyme-${username.value || 'support'}.png`;
  a.click();
  trackShare('support_card');
}
</script>
