<template>
  <article class="mx-auto max-w-2xl py-4 sm:py-8">
    <header class="mb-8">
      <p class="text-sm font-semibold uppercase tracking-wide text-cheer-leaf">
        Legal
      </p>
      <h1 class="mt-2 text-3xl font-bold tracking-tight text-cheer-ink sm:text-4xl">
        Privacy
      </h1>
      <p class="mt-3 text-sm text-cheer-ink/60">
        Last updated: September 8, 2026
      </p>
    </header>

    <div class="space-y-6 text-base leading-relaxed text-cheer-ink/80">
      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Overview
        </h2>
        <p class="mt-2">
          TippyMe collects only what we need to run creator pages, accounts, and support flows. We do not sell personal data.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Information we collect
        </h2>
        <ul class="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong class="font-semibold text-cheer-ink">Creators:</strong>
            email, password (hashed), profile details, social links, and tip settings you provide.
          </li>
          <li>
            <strong class="font-semibold text-cheer-ink">Supporters:</strong>
            email (for checkout), optional name, optional message, tip amount, and payment status from Bachs.
          </li>
          <li>
            <strong class="font-semibold text-cheer-ink">Technical:</strong>
            basic logs needed to operate and secure the service.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Payments and financial data
        </h2>
        <p class="mt-2">
          Card and bank payment details are handled by Bachs during checkout. TippyMe does not store full card numbers. We store tip amounts, currency, status, and references needed for confirmations and the creator dashboard.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Messages and anonymity
        </h2>
        <p class="mt-2">
          Messages you leave with a tip may be shown to the creator. If you tip anonymously, your name is not shown on the public page or in public-facing message views.
        </p>
      </section>

      <section>
        <h2 class="text-lg font-bold text-cheer-ink">
          Contact
        </h2>
        <p class="mt-2">
          Privacy questions:
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
  title: 'Privacy — TippyMe',
  meta: [
    {
      name: 'description',
      content:
        'How TippyMe handles creator and supporter information, including payments processed through Bachs.',
    },
  ],
});
</script>
