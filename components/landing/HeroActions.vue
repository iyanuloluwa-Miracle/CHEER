<template>
  <div class="flex flex-wrap items-center justify-center gap-3">
    <UiButtonLink
      :to="primaryCta.to"
      :label="primaryCta.label"
      variant="primary"
    />
    <UiButtonLink
      :to="secondaryCta.to"
      :label="secondaryCta.label"
      variant="secondary"
    />
  </div>
</template>

<script setup lang="ts">
import type { CtaLink } from '~/types/landing';

defineProps<{
  primaryCta: CtaLink;
  secondaryCta: CtaLink;
}>();
</script>
