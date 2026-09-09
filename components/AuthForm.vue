<template>
  <form
    class="motion-animate w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-md shadow-black/5 sm:p-8"
    @submit.prevent="$emit('submit')"
  >
    <header class="text-center">
      <h1 class="text-2xl font-bold tracking-tight text-cheer-ink sm:text-3xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-2 text-sm leading-relaxed text-cheer-ink/65 sm:text-base">
        {{ description }}
      </p>
    </header>

    <div class="mt-8 space-y-4">
      <div>
        <label for="auth-email" class="block text-sm text-cheer-ink">
          Email
        </label>
        <input
          id="auth-email"
          :value="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="you@example.com"
          class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-2.5 text-base text-cheer-ink placeholder:text-cheer-ink/35 transition-colors duration-200 focus:border-cheer-leaf/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cheer-leaf/30"
          @input="$emit('update:email', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label for="auth-password" class="block text-sm text-cheer-ink">
          Password
        </label>
        <input
          id="auth-password"
          :value="password"
          type="password"
          name="password"
          :autocomplete="passwordAutocomplete"
          required
          placeholder="••••••••"
          minlength="8"
          class="mt-1.5 w-full rounded-xl border border-black/10 bg-[#faf8f4] px-3.5 py-2.5 text-base text-cheer-ink placeholder:text-cheer-ink/35 transition-colors duration-200 focus:border-cheer-leaf/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cheer-leaf/30"
          @input="$emit('update:password', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <p v-if="error" class="mt-4 text-sm text-red-700" role="alert">
      {{ error }}
    </p>

    <button
      type="submit"
      class="motion-cta motion-cta-primary mt-6 inline-flex w-full items-center justify-center rounded-full bg-cheer-leaf px-6 py-2.5 text-sm font-semibold text-white transition duration-200 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="pending"
    >
      {{ pending ? pendingLabel : submitLabel }}
    </button>

    <p class="mt-6 text-center text-sm text-cheer-ink/65">
      {{ switchPrompt }}
      <NuxtLink
        :to="switchTo"
        class="font-semibold text-cheer-leaf transition-colors duration-200 hover:text-cheer-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cheer-leaf rounded-sm"
      >
        {{ switchLabel }}
      </NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    description?: string;
    email: string;
    password: string;
    submitLabel: string;
    pendingLabel?: string;
    pending?: boolean;
    error?: string | null;
    switchPrompt: string;
    switchLabel: string;
    switchTo: string;
    passwordAutocomplete?: 'current-password' | 'new-password';
  }>(),
  {
    pendingLabel: 'Please wait…',
    pending: false,
    error: null,
    passwordAutocomplete: 'current-password',
  },
);

defineEmits<{
  submit: [];
  'update:email': [value: string];
  'update:password': [value: string];
}>();
</script>
