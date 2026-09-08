<template>
  <article class="mx-auto max-w-2xl py-4 sm:py-8">
    <header class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-wide text-cheer-leaf">
        Legal
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl">
        Terms of use
      </h1>
      <p class="mt-3 text-sm text-cheer-ink/60">
        Last updated: September 8, 2026
      </p>
    </header>

    <div class="space-y-6 text-base leading-relaxed text-cheer-ink/80">
      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          What TippyMe is
        </h2>
        <p class="mt-2">
          TippyMe provides personal pages where people can receive support and messages through a single link. TippyMe is not a bank, wallet, or payment institution.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Payments
        </h2>
        <p class="mt-2">
          Support payments are processed by Bachs. By continuing to checkout, supporters agree to Bachs’ payment terms. TippyMe confirms a tip as paid only after Bachs verifies the payment.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Creator responsibilities
        </h2>
        <p class="mt-2">
          You are responsible for the content on your Tippy page, how you use support you receive, and complying with applicable laws in your location. Do not use TippyMe for fraud, prohibited goods, or misleading fundraising.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Accounts
        </h2>
        <p class="mt-2">
          Creators must provide accurate account information and keep login credentials secure. Supporters do not need a TippyMe account to send support.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Contact
        </h2>
        <p class="mt-2">
          Questions about these terms:
          <a
            href="mailto:hello@tippy.me"
            class="font-semibold text-cheer-leaf underline-offset-2 hover:underline"
          >hello@tippy.me</a>.
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
useHead({
  title: 'Terms — TippyMe',
  meta: [
    {
      name: 'description',
      content: 'Terms of use for TippyMe creator pages and supporter payments.',
    },
  ],
});
</script>
