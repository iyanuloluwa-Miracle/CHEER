<template>
  <div
    class="relative flex min-h-dvh flex-col overflow-hidden"
    style="
      background-color: #f7f4ee;
      background-image:
        radial-gradient(ellipse 80% 50% at 10% -10%, rgba(200, 240, 221, 0.55), transparent 55%),
        radial-gradient(ellipse 70% 45% at 100% 0%, rgba(31, 107, 74, 0.08), transparent 50%),
        radial-gradient(ellipse 60% 40% at 50% 110%, rgba(243, 239, 230, 0.9), transparent 55%);
    "
  >
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.35]"
      style="
        background-image: radial-gradient(rgba(15, 28, 23, 0.06) 1px, transparent 1px);
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
          class="h-5 w-auto shrink-0 object-contain"
          width="17"
          height="24"
          decoding="async"
        />
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
