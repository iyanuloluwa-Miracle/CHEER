<template>
  <div
    class="relative flex min-h-dvh flex-col overflow-hidden"
    style="
      background-color: #efeae1;
      background-image:
        radial-gradient(ellipse 85% 55% at 10% -5%, rgba(200, 240, 221, 0.7), transparent 55%),
        radial-gradient(ellipse 60% 45% at 95% 0%, rgba(31, 107, 74, 0.12), transparent 50%),
        radial-gradient(ellipse 50% 40% at 80% 100%, rgba(240, 162, 2, 0.08), transparent 55%),
        linear-gradient(180deg, #f7f3eb 0%, #ebe5da 100%);
    "
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.22]"
      style="
        background-image: radial-gradient(rgba(15, 28, 23, 0.07) 1px, transparent 1px);
        background-size: 22px 22px;
      "
      aria-hidden="true"
    />
    <div
      class="dash-float pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-cheer-mint/40 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="dash-float-delay pointer-events-none absolute -right-16 top-[40%] h-72 w-72 rounded-full bg-cheer-leaf/10 blur-3xl"
      aria-hidden="true"
    />

    <header class="relative z-20 border-b border-black/5 bg-[#f7f3eb]/75 backdrop-blur-md">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
        <NuxtLink
          to="/"
          aria-label="TippyMe home"
          class="inline-flex items-center gap-2.5 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-xl bg-cheer-ink shadow-sm"
          >
            <img
              src="/cheers-logo-nav.png"
              alt=""
              aria-hidden="true"
              class="h-4 w-auto brightness-0 invert"
              width="14"
              height="20"
              decoding="async"
            >
          </span>
          <span class="text-base font-bold tracking-tight text-cheer-ink">TippyMe</span>
        </NuxtLink>
        <NuxtLink
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

    <footer class="relative z-10 border-t border-black/5 py-5">
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
