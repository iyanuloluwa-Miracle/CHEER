<template>
  <footer class="border-t border-black/5">
    <div
      class="mx-auto flex max-w-5xl items-center justify-between gap-3 whitespace-nowrap px-4 py-5 sm:gap-6 sm:px-6"
    >
      <NuxtLink
        to="/"
        aria-label="TippyMe"
        class="inline-flex shrink-0 items-center gap-2 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
      >
        <img
          src="/cheers-logo-nav.png"
          alt=""
          aria-hidden="true"
          class="h-5 w-auto shrink-0 object-contain"
          width="17"
          height="24"
          decoding="async"
        />
        <span class="text-sm font-bold leading-none tracking-tight text-cheer-ink sm:text-base">
          TippyMe
        </span>
      </NuxtLink>

      <nav
        class="flex min-w-0 items-center justify-center gap-0.5 sm:gap-1"
        aria-label="Footer"
      >
        <NuxtLink
          v-for="link in footerLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-full px-2 py-1 text-xs font-medium text-cheer-ink/70 transition-colors duration-200 hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf sm:px-3.5 sm:py-1.5 sm:text-sm"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <p class="shrink-0 text-xs text-cheer-ink/50">
        © {{ year }} TippyMe
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { footerLinks } from '~/data/navigation';

const year = new Date().getFullYear();
</script>
