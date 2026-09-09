<template>
  <AuthForm
    v-model:email="email"
    v-model:password="password"
    title="Welcome back"
    description="Log in with your email and password. Supporters never need an account."
    submit-label="Log in"
    pending-label="Logging in…"
    :pending="pending"
    :error="error"
    switch-prompt="New to TippyMe?"
    switch-label="Sign up"
    switch-to="/signup"
    password-autocomplete="current-password"
    @submit="onSubmit"
  />
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';

definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Log in — TippyMe',
});

const route = useRoute();
const api = useApi();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

function redirectAfterAuth() {
  if (typeof route.query.next === 'string') {
    return navigateTo(route.query.next);
  }
  if (auth.user?.hasCreatorProfile) {
    return navigateTo('/dashboard');
  }
  return navigateTo('/onboarding');
}

async function onSubmit() {
  pending.value = true;
  error.value = null;
  try {
    const result = await api.login(email.value.trim(), password.value);
    auth.setUser(result.user);
    await redirectAfterAuth();
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.errorCode === 'INVALID_CREDENTIALS' || err.statusCode === 401) {
        error.value = 'Invalid email or password.';
      } else if (err.statusCode === 429 || err.errorCode === 'RATE_LIMITED') {
        error.value = 'Too many attempts. Wait a minute and try again.';
      } else if (err.statusCode === 404) {
        error.value =
          'API route not found. Is the Nest API running on http://localhost:3001?';
      } else if (err.statusCode >= 500) {
        error.value = 'Something went wrong. Please try again.';
      } else {
        error.value = err.message || 'Unable to log in. Please check your details.';
      }
    } else {
      error.value =
        'Cannot reach the API. Is it running on http://localhost:3001?';
    }
  } finally {
    pending.value = false;
  }
}
</script>
