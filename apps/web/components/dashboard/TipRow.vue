<template>
  <li class="border-b border-black/5 py-4 last:border-b-0">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <p class="text-lg font-semibold tabular-nums text-cheer-ink">
        {{ formatMoney(tip.amount, tip.currency) }}
      </p>
      <p class="text-xs text-cheer-ink/45">
        {{ formatDate(tip.createdAt) }}
      </p>
    </div>
    <div class="mt-1 flex flex-wrap items-center gap-2 text-sm text-cheer-ink/70">
      <span>{{ supporterLabel }}</span>
      <span
        class="rounded-full px-2 py-0.5 text-xs font-medium"
        :class="statusClass"
      >
        {{ tip.status }}
      </span>
      <span
        v-if="tip.paymentStatus"
        class="text-xs text-cheer-ink/45"
      >
        payment {{ tip.paymentStatus.toLowerCase() }}
      </span>
    </div>
    <p
      v-if="tip.message"
      class="mt-2 text-sm leading-relaxed text-cheer-ink/80"
    >
      “{{ tip.message }}”
    </p>
  </li>
</template>

<script setup lang="ts">
import type { CreatorTip } from '~/types/api';

const props = defineProps<{
  tip: CreatorTip;
}>();

const supporterLabel = computed(() => {
  if (props.tip.isAnonymous) return 'Anonymous';
  return props.tip.supporterName?.trim() || 'Supporter';
});

const statusClass = computed(() => {
  switch (props.tip.status) {
    case 'PAID':
      return 'bg-cheer-mint/60 text-cheer-leaf';
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
