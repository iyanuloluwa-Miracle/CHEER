<template>
  <form
    class="space-y-6"
    novalidate
    @submit.prevent="onSubmit"
  >
    <fieldset :disabled="pending">
      <legend
        id="tip-amount-legend"
        class="text-xs font-semibold uppercase tracking-wide text-cheer-ink/45"
      >
        Choose an amount · {{ currency }}
      </legend>
      <div
        class="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-labelledby="tip-amount-legend"
      >
        <button
          v-for="preset in presets"
          :key="preset"
          type="button"
          class="rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
          :class="
            selectedPreset === preset && !useCustom
              ? 'border-cheer-leaf bg-cheer-leaf text-white'
              : 'border-black/10 bg-[#faf8f4] text-cheer-ink hover:border-cheer-leaf/40'
          "
          :aria-pressed="selectedPreset === preset && !useCustom"
          @click="selectPreset(preset)"
        >
          {{ formatAmount(preset) }}
        </button>
        <button
          type="button"
          class="rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2"
          :class="
            useCustom
              ? 'border-cheer-leaf bg-cheer-leaf text-white'
              : 'border-black/10 bg-[#faf8f4] text-cheer-ink hover:border-cheer-leaf/40'
          "
          :aria-pressed="useCustom"
          @click="enableCustom"
        >
          Custom
        </button>
      </div>
      <div
        v-if="useCustom"
        class="mt-3"
      >
        <label
          for="tip-custom-amount"
          class="sr-only"
        >Custom amount in {{ currency }}</label>
        <div class="flex items-center gap-2 rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 focus-within:border-cheer-leaf/40 focus-within:ring-2 focus-within:ring-cheer-leaf/30">
          <span
            class="text-sm text-cheer-ink/45"
            aria-hidden="true"
          >{{ currency }}</span>
          <input
            id="tip-custom-amount"
            v-model="customAmount"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            class="w-full bg-transparent py-2.5 text-base text-cheer-ink outline-none"
            placeholder="1000.00"
            :aria-invalid="Boolean(error && !resolvedAmount)"
            :aria-describedby="error && !resolvedAmount ? 'tip-form-error' : undefined"
          >
        </div>
      </div>
    </fieldset>

    <div>
      <label
        for="tip-message"
        class="block text-sm text-cheer-ink"
      >Message <span class="text-cheer-ink/45">(optional)</span></label>
      <textarea
        id="tip-message"
        v-model="message"
        rows="3"
        maxlength="500"
        class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
        :placeholder="`A note for ${displayName}…`"
        :disabled="pending"
      />
      <p
        id="tip-message-count"
        class="mt-1 text-xs text-cheer-ink/45"
      >
        {{ message.length }}/500
      </p>
    </div>

    <div class="space-y-1.5">
      <label
        for="tip-email"
        class="block text-sm text-cheer-ink"
      >Email</label>
      <input
        id="tip-email"
        v-model="supporterEmail"
        type="email"
        autocomplete="email"
        required
        maxlength="254"
        class="w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
        placeholder="you@example.com"
        :disabled="pending"
        :aria-invalid="Boolean(error && !supporterEmail.trim())"
        :aria-describedby="emailHelpId"
      >
      <p
        :id="emailHelpId"
        class="text-xs text-cheer-ink/45"
      >
        Needed for secure checkout. Not shown publicly when you tip anonymously.
      </p>
    </div>

    <div
      v-if="!isAnonymous"
      class="space-y-1.5"
    >
      <label
        for="tip-name"
        class="block text-sm text-cheer-ink"
      >Your name <span class="text-cheer-ink/45">(optional)</span></label>
      <input
        id="tip-name"
        v-model="supporterName"
        type="text"
        maxlength="80"
        autocomplete="name"
        class="w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-2.5 text-base outline-none focus:border-cheer-leaf/40 focus:ring-2 focus:ring-cheer-leaf/30"
        placeholder="How should they see you?"
        :disabled="pending"
      >
    </div>

    <label class="flex cursor-pointer items-center gap-3 text-sm text-cheer-ink">
      <input
        v-model="isAnonymous"
        type="checkbox"
        class="h-4 w-4 rounded border-black/20 text-cheer-leaf focus:ring-cheer-leaf/40"
        :disabled="pending"
      >
      <span>Send anonymously</span>
    </label>

    <p
      v-if="error"
      id="tip-form-error"
      class="text-sm text-red-700"
      role="alert"
    >
      {{ error }}
    </p>

    <button
      type="submit"
      class="inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-3.5 text-base font-semibold text-white transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="pending || !resolvedAmount || !supporterEmail.trim()"
      :aria-busy="pending"
    >
      {{ pending ? 'Continuing to payment…' : ctaLabel }}
    </button>
    <p class="text-center text-xs leading-relaxed text-cheer-ink/45">
      No TippyMe account needed. You’ll finish payment on Bachs secure checkout.
    </p>
  </form>
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';

const props = defineProps<{
  username: string;
  displayName: string;
  currency: string;
  suggestedAmounts: string[];
}>();

const api = useApi();

const presets = computed(() =>
  props.suggestedAmounts.length
    ? props.suggestedAmounts
    : ['1000.00', '2500.00', '5000.00'],
);

const selectedPreset = ref(presets.value[0] ?? '1000.00');
const useCustom = ref(false);
const customAmount = ref('');
const message = ref('');
const supporterName = ref('');
const supporterEmail = ref('');
const isAnonymous = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);
const emailHelpId = 'tip-email-help';

const resolvedAmount = computed(() => {
  const raw = useCustom.value ? customAmount.value.trim() : selectedPreset.value;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n.toFixed(2);
});

const ctaLabel = computed(() => {
  if (!resolvedAmount.value) return `Support ${props.displayName}`;
  return `Support ${props.displayName} · ${formatAmount(resolvedAmount.value)}`;
});

function selectPreset(amount: string) {
  useCustom.value = false;
  selectedPreset.value = amount;
  error.value = null;
}

function enableCustom() {
  useCustom.value = true;
  error.value = null;
}

function formatAmount(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.currency || 'NGN',
    maximumFractionDigits: 0,
  }).format(n);
}

function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  return `k${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

function mapError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.errorCode === 'BELOW_MINIMUM' || err.errorCode === 'ABOVE_MAXIMUM') {
      return err.message;
    }
    if (err.errorCode === 'CREATOR_NOT_FOUND') {
      return 'This creator page is no longer available.';
    }
    if (err.statusCode >= 500) {
      return 'Something went wrong. Please try again.';
    }
    return err.message || 'Unable to start support.';
  }
  return 'Something went wrong. Please try again.';
}

async function onSubmit() {
  error.value = null;
  if (!resolvedAmount.value) {
    error.value = 'Enter a valid amount.';
    return;
  }
  if (!supporterEmail.value.trim()) {
    error.value = 'Enter your email to continue to payment.';
    return;
  }

  pending.value = true;
  const idempotencyKey = newIdempotencyKey();
  try {
    const result = await api.createTip(
      {
        username: props.username,
        amount: resolvedAmount.value,
        currency: props.currency,
        message: message.value.trim() || undefined,
        isAnonymous: isAnonymous.value,
        supporterName: isAnonymous.value
          ? undefined
          : supporterName.value.trim() || undefined,
        supporterEmail: supporterEmail.value.trim(),
        idempotencyKey,
      },
      { idempotencyKey },
    );

    try {
      const url = new URL(result.checkoutUrl);
      if (
        typeof window !== 'undefined' &&
        url.origin === window.location.origin
      ) {
        await navigateTo(url.pathname + url.search + url.hash);
      } else {
        await navigateTo(result.checkoutUrl, { external: true });
      }
    } catch {
      await navigateTo(result.checkoutUrl, { external: true });
    }
  } catch (err) {
    error.value = mapError(err);
  } finally {
    pending.value = false;
  }
}
</script>
