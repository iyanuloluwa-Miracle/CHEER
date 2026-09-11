<template>
  <ul
    class="motion-animate motion-animate-delay-4 mt-8 flex justify-center -space-x-2 md:hidden"
    aria-label="Audiences TippyMe is built for"
  >
    <li
      v-for="item in items"
      :key="item.seed"
    >
      <img
        :src="dicebearAvatarUrl(item.seed, 72)"
        :alt="item.label"
        :title="item.label"
        class="h-9 w-9 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-cheer-leaf/10"
        width="36"
        height="36"
        loading="lazy"
        decoding="async"
      >
    </li>
  </ul>
</template>

<script setup lang="ts">
import { audienceItems } from '~/data/landing';
import { dicebearAvatarUrl } from '~/utils/avatar';

const items = audienceItems.slice(0, 7);
</script>
