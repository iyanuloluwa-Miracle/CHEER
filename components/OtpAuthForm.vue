<template>
  <form
    class="motion-animate w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-md shadow-black/5 sm:p-8"
    @submit.prevent="onSubmit"
  >
    <header class="text-center">
      <h1 class="text-2xl font-bold tracking-tight text-cheer-ink sm:text-3xl">
        {{ title }}
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-cheer-ink/65 sm:text-base">
        <template v-if="step === 'email'">
          Start with your email. We’ll send a one-time code, then you set a password and claim your link.
        </template>
        <template v-else-if="step === 'otp'">
          Enter the code sent to
          <span class="font-semibold text-cheer-ink">{{ email }}</span>.
        </template>
        <template v-else>
          Choose a password for
          <span class="font-semibold text-cheer-ink">{{ email }}</span>.
        </template>
      </p>
    </header>

    <div class="mt-8 space-y-4">
      <div v-if="step === 'email'">
        <label for="signup-email" class="block text-sm text-cheer-ink">
          Email
        </label>
        <input
          id="signup-email"
          v-model="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
          :disabled="pending"
          class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base text-cheer-ink placeholder:text-cheer-ink/35 transition-colors duration-200 focus:border-cheer-leaf/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cheer-leaf/30 disabled:opacity-60"
        >
      </div>

      <template v-else-if="step === 'otp'">
        <div>
          <label for="signup-otp" class="block text-sm text-cheer-ink">
            Verification code
          </label>
          <input
            id="signup-otp"
            v-model="code"
            type="text"
            name="otp"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]*"
            maxlength="6"
            required
            placeholder="••••••"
            :disabled="pending"
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-center text-2xl tracking-[0.35em] text-cheer-ink placeholder:tracking-[0.35em] placeholder:text-cheer-ink/35 transition-colors duration-200 focus:border-cheer-leaf/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cheer-leaf/30 disabled:opacity-60"
          >
        </div>

        <div class="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            class="font-semibold text-cheer-leaf transition-colors hover:text-cheer-ink disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="pending || resendSeconds > 0"
            @click="resendOtp"
          >
            <template v-if="resendSeconds > 0">
              Resend in {{ resendSeconds }}s
            </template>
            <template v-else>
              Resend code
            </template>
          </button>
          <button
            type="button"
            class="text-cheer-ink/55 transition-colors hover:text-cheer-ink"
            :disabled="pending"
            @click="backToEmail"
          >
            Change email
          </button>
        </div>
      </template>

      <template v-else>
        <div>
          <label for="signup-password" class="block text-sm text-cheer-ink">
            Password
          </label>
          <input
            id="signup-password"
            v-model="password"
            type="password"
            name="password"
            autocomplete="new-password"
            required
            minlength="8"
            placeholder="At least 8 characters"
            :disabled="pending"
            class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#f7f4ff] px-3.5 py-2.5 text-base text-cheer-ink placeholder:text-cheer-ink/35 transition-colors duration-200 focus:border-cheer-leaf/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cheer-leaf/30 disabled:opacity-60"
          >
        </div>

        <div class="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            class="text-cheer-ink/55 transition-colors hover:text-cheer-ink"
            :disabled="pending"
            @click="backToOtp"
          >
            Back
          </button>
        </div>
      </template>
    </div>

    <p
      v-if="successMessage"
      class="mt-4 text-sm text-cheer-leaf"
      role="status"
    >
      {{ successMessage }}
    </p>
    <p v-else-if="error" class="mt-4 text-sm text-red-700" role="alert">
      {{ error }}
    </p>

    <button
      type="submit"
      class="motion-cta motion-cta-primary mt-6 inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="pending"
    >
      <template v-if="pending">
        {{ pendingLabel }}
      </template>
      <template v-else>
        {{ submitLabel }}
      </template>
    </button>

    <p class="mt-6 text-center text-sm text-cheer-ink/65">
      Already have an account?
      <NuxtLink
        to="/login"
        class="font-semibold text-cheer-leaf transition-colors duration-200 hover:text-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf rounded-sm"
      >
        Log in
      </NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';

const emit = defineEmits<{
  verified: [];
}>();

const api = useApi();
const auth = useAuthStore();

const step = ref<'email' | 'otp' | 'password'>('email');
const email = ref('');
const code = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const resendSeconds = ref(0);

const title = computed(() => {
  if (step.value === 'email') return 'Claim your link';
  if (step.value === 'otp') return 'Verify your email';
  return 'Create your password';
});

const submitLabel = computed(() => {
  if (step.value === 'email') return 'Send verification code';
  if (step.value === 'otp') return 'Continue';
  return 'Create account';
});

const pendingLabel = computed(() => {
  if (step.value === 'email') return 'Sending code…';
  if (step.value === 'otp') return 'Checking…';
  return 'Creating account…';
});

let resendTimer: ReturnType<typeof setInterval> | null = null;

onBeforeUnmount(() => {
  clearResendTimer();
});

function clearResendTimer() {
  if (resendTimer) {
    clearInterval(resendTimer);
    resendTimer = null;
  }
}

function startResendCountdown(seconds: number) {
  clearResendTimer();
  resendSeconds.value = Math.max(0, seconds);
  if (resendSeconds.value <= 0) return;
  resendTimer = setInterval(() => {
    resendSeconds.value -= 1;
    if (resendSeconds.value <= 0) {
      clearResendTimer();
      resendSeconds.value = 0;
    }
  }, 1000);
}

function mapError(err: unknown): string {
  if (!(err instanceof ApiClientError)) {
    return 'Something went wrong. Please try again.';
  }

  switch (err.errorCode) {
    case 'ACCOUNT_EXISTS':
      return 'An account with this email already exists. Please log in.';
    case 'INVALID_OTP':
      return 'That code is incorrect. Please try again.';
    case 'EXPIRED_OTP':
      return 'That code has expired. Request a new one.';
    case 'OTP_CONSUMED':
      return 'That code was already used. Request a new one.';
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many incorrect attempts. Request a new code.';
    case 'RESEND_COOLDOWN':
      return err.retryAfterSeconds
        ? `Please wait ${err.retryAfterSeconds}s before requesting another code.`
        : 'Please wait before requesting another code.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a minute and try again.';
    case 'INVALID_PURPOSE':
      return 'Use sign-up to verify your email, or log in with your password.';
    default:
      if (err.statusCode === 429) {
        return 'Too many requests. Please wait a minute and try again.';
      }
      if (err.statusCode === 409) {
        return 'An account with this email already exists. Please log in.';
      }
      if (err.statusCode >= 500) {
        return 'Something went wrong. Please try again.';
      }
      return 'Unable to continue. Please check your details and try again.';
  }
}

async function requestCode() {
  pending.value = true;
  error.value = null;
  successMessage.value = null;
  try {
    const result = await api.requestOtp(email.value.trim());
    step.value = 'otp';
    code.value = '';
    password.value = '';
    startResendCountdown(result.resendAvailableInSeconds);
    successMessage.value = 'Code sent. Check your inbox.';
  } catch (err) {
    if (err instanceof ApiClientError && err.errorCode === 'RESEND_COOLDOWN') {
      startResendCountdown(err.retryAfterSeconds ?? 60);
    }
    error.value = mapError(err);
  } finally {
    pending.value = false;
  }
}

function continueFromOtp() {
  const trimmed = code.value.trim();
  if (!/^\d{6}$/.test(trimmed)) {
    error.value = 'Enter the 6-digit code from your email.';
    successMessage.value = null;
    return;
  }
  code.value = trimmed;
  error.value = null;
  successMessage.value = null;
  step.value = 'password';
}

async function createAccount() {
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }
  pending.value = true;
  error.value = null;
  successMessage.value = null;
  try {
    const result = await api.verifyOtp(
      email.value.trim(),
      code.value.trim(),
      password.value,
    );
    auth.setUser(result.user);
    successMessage.value = 'Verified — signing you in…';
    emit('verified');
  } catch (err) {
    error.value = mapError(err);
    // OTP failed validation on the server — send user back to re-enter code
    if (
      err instanceof ApiClientError &&
      (err.errorCode === 'INVALID_OTP' ||
        err.errorCode === 'EXPIRED_OTP' ||
        err.errorCode === 'OTP_CONSUMED' ||
        err.errorCode === 'TOO_MANY_ATTEMPTS')
    ) {
      step.value = 'otp';
      password.value = '';
    }
  } finally {
    pending.value = false;
  }
}

async function onSubmit() {
  if (step.value === 'email') {
    await requestCode();
  } else if (step.value === 'otp') {
    continueFromOtp();
  } else {
    await createAccount();
  }
}

async function resendOtp() {
  if (resendSeconds.value > 0) return;
  await requestCode();
}

function backToEmail() {
  step.value = 'email';
  code.value = '';
  password.value = '';
  error.value = null;
  successMessage.value = null;
  clearResendTimer();
  resendSeconds.value = 0;
}

function backToOtp() {
  step.value = 'otp';
  password.value = '';
  error.value = null;
  successMessage.value = null;
}
</script>
