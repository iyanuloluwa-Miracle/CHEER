<template>
  <footer class="border-t border-black/5">
    <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="max-w-xs">
          <NuxtLink
            to="/"
            aria-label="TippyMe"
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
            >
            <span class="text-base font-bold leading-none tracking-tight text-cheer-ink">
              TippyMe
            </span>
          </NuxtLink>
          <p class="mt-3 text-sm leading-relaxed text-cheer-ink/60">
            One link for everyone who wants to support your work.
          </p>
          <p class="mt-2 text-xs text-cheer-ink/45">
            Payments processed through Bachs.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-8 sm:gap-12">
          <nav aria-label="Product">
            <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
              Product
            </p>
            <ul class="mt-3 space-y-2">
              <li
                v-for="link in footerLinks"
                :key="link.to"
              >
                <NuxtLink
                  :to="link.to"
                  class="text-sm font-medium text-cheer-ink/70 transition-colors hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45">
              Legal
            </p>
            <ul class="mt-3 space-y-2">
              <li
                v-for="link in legalLinks"
                :key="link.to"
              >
                <NuxtLink
                  :to="link.to"
                  class="text-sm font-medium text-cheer-ink/70 transition-colors hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
                >
                  {{ link.label }}
                </NuxtLink>
              </li>
              <li>
                <a
                  href="mailto:hello@tippy.me"
                  class="text-sm font-medium text-cheer-ink/70 transition-colors hover:text-cheer-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf"
                >
                  Contact
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <p class="mt-8 border-t border-black/5 pt-5 text-xs text-cheer-ink/45">
        © {{ year }} TippyMe
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { footerLinks, legalLinks } from '~/data/navigation';

const year = new Date().getFullYear();
</script>
