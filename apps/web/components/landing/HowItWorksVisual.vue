<template>
  <div v-if="visual === 'share'" class="space-y-4">
    <div class="grid grid-cols-3 gap-2.5">
      <div
        v-for="channel in shareChannels"
        :key="channel"
        class="flex aspect-square items-center justify-center rounded-xl border border-black/10 bg-white text-[11px] font-semibold text-cheer-ink/50"
      >
        {{ channel }}
      </div>
    </div>
    <div
      class="flex h-10 items-center justify-center rounded-xl border border-dashed border-cheer-leaf/30 bg-cheer-leaf/[0.04] text-sm font-semibold text-cheer-leaf"
    >
      cheer.cash/dina
    </div>
  </div>

  <div v-else-if="visual === 'receive'" class="space-y-3">
    <div class="grid grid-cols-3 gap-2">
      <div
        class="flex h-[52px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/55"
      >
        ₦500
      </div>
      <div
        class="flex h-[52px] items-center justify-center rounded-xl border border-cheer-mint/40 bg-cheer-leaf/30 text-xs font-bold text-white"
      >
        ₦1,000
      </div>
      <div
        class="flex h-[52px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/55"
      >
        ₦2,000
      </div>
    </div>
    <div
      class="flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs text-white/35"
    >
      Say something kind...
    </div>
    <div
      class="flex h-10 items-center justify-center rounded-full bg-cheer-leaf text-sm font-semibold text-white"
    >
      Send tip →
    </div>
  </div>
</template>

<script setup lang="ts">
import type { HowItWorksVisualType } from '~/types/landing';

defineProps<{
  visual: HowItWorksVisualType;
}>();

const shareChannels = ['Bio', 'Story', 'DM'] as const;
</script>
