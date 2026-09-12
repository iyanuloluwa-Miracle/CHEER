<template>
  <section
    class="overflow-hidden rounded-[1.75rem] border border-black/6 bg-white/90 shadow-[0_20px_50px_-36px_rgba(26, 18, 40,0.3)]"
    aria-labelledby="supporter-notes-heading"
  >
    <div class="border-b border-black/6 px-5 py-5 sm:px-7 sm:py-6">
      <p class="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-cheer-leaf">
        From supporters
      </p>
      <h2
        id="supporter-notes-heading"
        class="mt-1 text-xl font-bold tracking-tight text-cheer-ink"
      >
        Notes with tips
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
          <p class="mt-2.5 text-sm font-semibold leading-relaxed text-cheer-ink/90">
            “{{ note.message }}”
          </p>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { PublicSupporterNote } from '~/types/api';
import { resolveAvatarUrl } from '~/utils/avatar';

const props = defineProps<{
  recentSupporterNotes: PublicSupporterNote[];
}>();

const notes = computed(() => props.recentSupporterNotes);

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
