<template>
  <div class="cheer-page-atmosphere relative flex min-h-dvh flex-col overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.22]"
      style="
        background-image: radial-gradient(rgba(147, 98, 255, 0.12) 1px, transparent 1px);
        background-size: 22px 22px;
      "
      aria-hidden="true"
    />
    <div
      class="dash-float pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-cheer-mint/70 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="dash-float-delay pointer-events-none absolute -right-16 top-[40%] h-72 w-72 rounded-full bg-cheer-leaf/15 blur-3xl"
      aria-hidden="true"
    />

    <header class="relative z-20 border-b border-cheer-leaf/10 bg-white/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <NuxtLink
          to="/"
          aria-label="TippyMe home"
          class="inline-flex items-center gap-2 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        >
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-6 w-auto shrink-0 object-contain"
            width="16"
            height="24"
            decoding="async"
          >
          <span class="text-base font-bold leading-none tracking-tight text-cheer-ink">TippyMe</span>
        </NuxtLink>

        <NuxtLink
          v-if="auth.isAuthenticated"
          to="/dashboard"
          class="motion-cta motion-cta-primary inline-flex items-center gap-1.5 rounded-full bg-cheer-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to dashboard
        </NuxtLink>
        <NuxtLink
          v-else
          to="/signup"
          class="motion-cta motion-cta-primary inline-flex items-center rounded-full bg-cheer-leaf px-4 py-2 text-sm font-semibold text-white transition hover:bg-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        >
          Create yours
        </NuxtLink>
      </div>
    </header>

    <main class="relative z-10 flex-1">
      <slot />
    </main>

    <footer class="relative z-10 border-t border-cheer-leaf/10 py-5">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 text-xs text-cheer-ink/45 sm:px-6">
        <span class="inline-flex items-center gap-1.5">
          <span
            class="h-1.5 w-1.5 rounded-full bg-cheer-leaf"
            aria-hidden="true"
          />
          Payments via Bachs
        </span>
        <span aria-hidden="true">·</span>
        <NuxtLink
          to="/privacy"
          class="font-semibold text-cheer-leaf transition hover:text-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Privacy</NuxtLink>
        <span aria-hidden="true">·</span>
        <NuxtLink
          to="/terms"
          class="font-semibold text-cheer-leaf transition hover:text-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >Terms</NuxtLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();

onMounted(() => {
  if (auth.status === 'idle') {
    void auth.fetchMe();
  }
});
</script>
