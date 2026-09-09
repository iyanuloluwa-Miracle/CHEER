<template>
  <li class="group py-4 first:pt-1 last:pb-1">
    <div class="flex items-start gap-3.5">
      <img
        :src="avatarSrc"
        :alt="supporterLabel"
        class="mt-0.5 h-10 w-10 shrink-0 rounded-2xl object-cover ring-1 ring-black/5"
        width="40"
        height="40"
        loading="lazy"
        decoding="async"
      >
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-lg font-bold tabular-nums tracking-tight text-cheer-ink">
            {{ formatMoney(tip.amount, tip.currency) }}
          </p>
          <p class="text-xs font-medium text-cheer-ink/40">
            {{ formatDate(tip.createdAt) }}
          </p>
        </div>
        <div class="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-cheer-ink/65">
          <span class="font-medium">{{ supporterLabel }}</span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="statusClass"
          >
            {{ tip.status }}
          </span>
          <span
            v-if="tip.paymentStatus"
            class="text-xs text-cheer-ink/40"
          >
            payment {{ tip.paymentStatus.toLowerCase() }}
          </span>
        </div>
        <p
          v-if="tip.message"
          class="mt-2.5 rounded-2xl border border-black/5 bg-cheer-sand/55 px-3.5 py-2.5 text-sm leading-relaxed text-cheer-ink/80 transition group-hover:bg-cheer-mint/25"
        >
          “{{ tip.message }}”
        </p>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { CreatorTip } from '~/types/api';
import { resolveAvatarUrl } from '~/utils/avatar';

const props = defineProps<{
  tip: CreatorTip;
}>();

const supporterLabel = computed(() => {
  if (props.tip.isAnonymous) return 'Anonymous';
  return props.tip.supporterName?.trim() || 'Supporter';
});

const avatarSrc = computed(() => {
  const seed = props.tip.isAnonymous
    ? 'anonymous'
    : props.tip.supporterName?.trim() || 'supporter';
  return resolveAvatarUrl(null, seed);
});

const statusClass = computed(() => {
  switch (props.tip.status) {
    case 'PAID':
      return 'bg-cheer-mint/70 text-cheer-leaf';
    case 'FAILED':
    case 'EXPIRED':
      return 'bg-red-50 text-red-700';
    default:
      return 'bg-amber-50 text-amber-800';
  }
});

function formatMoney(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>
