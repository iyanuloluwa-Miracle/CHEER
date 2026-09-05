<template>
  <AuthForm
    v-model:email="email"
    v-model:password="password"
    title="Create your account"
    description="Get a TippyMe link and start receiving support."
    submit-label="Sign up"
    pending-label="Creating account…"
    :pending="pending"
    :error="error"
    switch-prompt="Already have an account?"
    switch-label="Log in"
    switch-to="/login"
    password-autocomplete="new-password"
    @submit="onSubmit"
  />
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Sign up — TippyMe',
});

const email = ref('');
const password = ref('');
const pending = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  pending.value = true;
  error.value = null;

  await new Promise((resolve) => setTimeout(resolve, 400));
  error.value = 'Sign-up is coming soon. Check back after auth ships.';
  pending.value = false;
}
</script>
