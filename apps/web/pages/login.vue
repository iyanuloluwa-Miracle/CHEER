<template>
  <AuthForm
    v-model:email="email"
    v-model:password="password"
    title="Welcome back"
    description="Log in to manage your TippyMe link and tips."
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
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Log in — TippyMe',
});

const email = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  pending.value = true;
  error.value = null;

  // Auth API lands in a later phase — keep the form interactive for UI.
  await new Promise((resolve) => setTimeout(resolve, 400));
  error.value = 'Sign-in is coming soon. Check back after auth ships.';
  pending.value = false;
}
</script>
