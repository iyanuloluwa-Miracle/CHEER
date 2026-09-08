<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-black/5 bg-[#faf8f4]/90 backdrop-blur-sm">
      <div class="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <NuxtLink
          to="/"
          aria-label="TippyMe home"
          class="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-5 w-auto object-contain"
            width="17"
            height="24"
            decoding="async"
          >
          <span class="text-sm font-bold tracking-tight text-cheer-ink">TippyMe</span>
        </NuxtLink>
        <NuxtLink
          to="/signup"
          class="text-sm font-semibold text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >
          Create yours
        </NuxtLink>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-black/5 py-4">
      <div class="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-xs text-cheer-ink/45">
        <span>Payments via Bachs</span>
        <span aria-hidden="true">·</span>
        <NuxtLink
          to="/privacy"
          class="font-medium text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Privacy</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink
          to="/terms"
          class="font-medium text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Terms</NuxtLink>
      </div>
    </footer>
  </div>
</template>
