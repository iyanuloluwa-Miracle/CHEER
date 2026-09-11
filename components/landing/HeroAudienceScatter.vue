<template>
  <div
    class="pointer-events-none absolute inset-0 z-0 hidden lg:block"
    aria-hidden="true"
  >
    <div
      v-for="item in items"
      :key="item.seed"
      class="absolute -translate-x-1/2 -translate-y-1/2"
      :style="{
        top: item.top,
        left: item.left,
        width: `${item.size}px`,
        height: `${item.size}px`,
      }"
    >
      <div
        class="hero-audience-float h-full w-full"
        :style="{ animationDelay: item.delay }"
      >
        <img
          :src="dicebearAvatarUrl(item.seed, item.size * 2)"
          alt=""
          class="h-full w-full rounded-full border-2 border-white object-cover shadow-[0_10px_28px_-12px_rgba(26,18,40,0.45)] ring-1 ring-cheer-leaf/15"
          width="96"
          height="96"
          loading="eager"
          decoding="async"
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { audienceItems } from '~/data/landing';
import { dicebearAvatarUrl } from '~/utils/avatar';

const items = audienceItems;
</script>
