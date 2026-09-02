<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-black/5 bg-white/50 backdrop-blur-sm">
      <div class="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <NuxtLink to="/" class="text-xl font-semibold tracking-tight text-[var(--cheer-ink)]">
          Cheer
        </NuxtLink>
        <nav class="flex items-center gap-4 text-sm text-[var(--cheer-ink)]/70">
          <NuxtLink to="/" class="hover:text-[var(--cheer-leaf)]">Home</NuxtLink>
          <NuxtLink to="/status" class="hover:text-[var(--cheer-leaf)]">Status</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <slot />
    </main>

    <footer class="border-t border-black/5 py-6 text-center text-xs text-[var(--cheer-ink)]/50">
      Cheer — one link for support. Payments by Bachs.
    </footer>
  </div>
</template>
