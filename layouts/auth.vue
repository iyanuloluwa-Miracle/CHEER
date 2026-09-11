<template>
  <div class="cheer-page-atmosphere relative flex min-h-dvh flex-col overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.35]"
      style="
        background-image: radial-gradient(rgba(147, 98, 255, 0.1) 1px, transparent 1px);
        background-size: 22px 22px;
      "
      aria-hidden="true"
    />

    <header class="relative z-10 flex justify-center px-4 pt-6 sm:pt-8">
      <NuxtLink
        to="/"
        aria-label="TippyMe home"
        class="inline-flex items-center gap-2 rounded-sm transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
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
        <span class="text-base font-bold leading-none tracking-tight text-cheer-ink">
          TippyMe
        </span>
      </NuxtLink>
    </header>

    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
      <slot />
    </main>
  </div>
</template>
