<template>
  <div class="flex min-h-screen flex-col bg-white">
    <header class="border-b border-cheer-leaf/10">
      <div class="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        <NuxtLink
          to="/"
          aria-label="TippyMe home"
          class="inline-flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
        >
          <img
            src="/cheers-logo-nav.png"
            alt=""
            aria-hidden="true"
            class="h-5 w-auto object-contain cheer-logo-tint"
            width="17"
            height="24"
            decoding="async"
          >
          <span class="text-sm font-bold tracking-tight text-cheer-ink">TippyMe</span>
        </NuxtLink>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
