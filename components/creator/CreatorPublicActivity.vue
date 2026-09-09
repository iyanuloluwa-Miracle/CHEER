<template>
  <div class="space-y-5">
    <section
      class="overflow-hidden rounded-[2rem] border border-black/6 bg-white/90 shadow-[0_24px_60px_-36px_rgba(15,28,23,0.35)] backdrop-blur-md"
      aria-labelledby="tips-week-heading"
    >
      <div class="px-5 py-6 sm:px-7 sm:py-7">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-cheer-leaf">
          Tips this week
        </p>
        <h2
          id="tips-week-heading"
          class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl"
        >
          {{ formattedSum }}
        </h2>
        <p class="mt-2 text-sm text-cheer-ink/60">
          <template v-if="tipsThisWeek.count > 0">
            {{ tipsThisWeek.count }}
            {{ tipsThisWeek.count === 1 ? 'supporter' : 'supporters' }}
            this week
          </template>
          <template v-else>
            No tips yet this week
          </template>
        </p>
      </div>
    </section>

    <section
      v-if="notes.length"
      class="overflow-hidden rounded-[2rem] border border-black/6 bg-white/90 shadow-[0_24px_60px_-36px_rgba(15,28,23,0.35)] backdrop-blur-md"
      aria-labelledby="supporter-notes-heading"
    >
      <div class="border-b border-black/6 px-5 py-5 sm:px-7">
        <h2
          id="supporter-notes-heading"
          class="text-xl font-bold tracking-tight text-cheer-ink"
        >
          Notes from supporters
        </h2>
      </div>
      <ul class="divide-y divide-black/5 px-5 sm:px-7">
        <li
          v-for="(note, index) in notes"
          :key="`${note.createdAt}-${index}`"
          class="flex gap-3.5 py-5"
        >
          <img
            :src="noteAvatar(note)"
            :alt="noteLabel(note)"
            class="mt-0.5 h-10 w-10 shrink-0 rounded-2xl bg-cheer-sand object-cover"
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
          >
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline justify-between gap-2">
              <p class="font-semibold text-cheer-ink">
                {{ noteLabel(note) }}
              </p>
              <p class="text-sm font-bold tabular-nums text-cheer-ink">
                {{ formatMoney(note.amount, note.currency) }}
              </p>
            </div>
            <p class="mt-1 text-xs text-cheer-ink/45">
              {{ formatRelativeDay(note.createdAt) }}
            </p>
            <p class="mt-2.5 text-sm leading-relaxed text-cheer-ink/80">
              “{{ note.message }}”
            </p>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PublicSupporterNote, TipsThisWeek } from '~/types/api';
import { resolveAvatarUrl } from '~/utils/avatar';

const props = defineProps<{
  tipsThisWeek: TipsThisWeek;
  recentSupporterNotes: PublicSupporterNote[];
}>();

const notes = computed(() => props.recentSupporterNotes);

const formattedSum = computed(() =>
  formatMoney(props.tipsThisWeek.sum, props.tipsThisWeek.currency),
);

function noteLabel(note: PublicSupporterNote) {
  if (note.isAnonymous || !note.displayName?.trim()) return 'Anonymous';
  return note.displayName.trim();
}

function noteAvatar(note: PublicSupporterNote) {
  const seed = note.isAnonymous
    ? 'anonymous'
    : note.displayName?.trim() || 'supporter';
  return resolveAvatarUrl(null, seed);
}

function formatMoney(amount: string, currency: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatRelativeDay(iso: string) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const startOfToday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const startOfDay = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    const dayDiff = Math.round((startOfToday - startOfDay) / 86400000);
    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Yesterday';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
    }).format(date);
  } catch {
    return iso;
  }
}
</script>
