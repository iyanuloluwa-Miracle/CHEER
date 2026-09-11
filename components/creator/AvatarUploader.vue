<template>
  <div class="inline-flex flex-col items-start gap-2">
    <div class="relative inline-flex">
      <button
        type="button"
        class="group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        :class="[
          roundedClass,
          sizeClass,
          variant === 'dark'
            ? 'bg-cheer-mint text-cheer-ink shadow-[0_12px_32px_-12px_rgba(238, 230, 255,0.8)] focus-visible:ring-cheer-mint focus-visible:ring-offset-[#3b1d7a]'
            : 'bg-cheer-mint/40 text-cheer-ink ring-1 ring-black/10 focus-visible:ring-cheer-leaf focus-visible:ring-offset-[#f7f4ff]',
        ]"
        :disabled="disabled || uploading"
        :aria-label="ariaLabel"
        @click="openPicker"
      >
        <img
          :src="previewSrc"
          :alt="alt"
          class="h-full w-full object-cover"
          :width="pixelSize"
          :height="pixelSize"
        >
        <span
          class="absolute inset-0 flex items-center justify-center bg-black/45 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          :class="uploading ? 'opacity-100' : ''"
        >
          {{ uploading ? 'Uploading…' : 'Change' }}
        </span>
      </button>
      <input
        ref="inputRef"
        type="file"
        class="sr-only"
        accept="image/jpeg,image/png,image/webp,image/gif"
        :disabled="disabled || uploading"
        @change="onFileChange"
      >
    </div>
    <p
      v-if="localError"
      class="max-w-[14rem] text-xs"
      :class="variant === 'dark' ? 'text-red-200' : 'text-red-700'"
      role="alert"
    >
      {{ localError }}
    </p>
    <p
      v-else-if="hint"
      class="max-w-[16rem] text-xs"
      :class="variant === 'dark' ? 'text-white/50' : 'text-cheer-ink/50'"
    >
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ApiClientError } from '~/services/api';
import { resolveAvatarUrl } from '~/utils/avatar';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const props = withDefaults(
  defineProps<{
    modelValue?: string | null;
    seed: string;
    alt?: string;
    size?: 'md' | 'lg';
    variant?: 'light' | 'dark';
    /** When true, PATCH /api/creators/me with the new avatar URL after upload. */
    persist?: boolean;
    disabled?: boolean;
    hint?: string;
  }>(),
  {
    modelValue: null,
    alt: 'Profile photo',
    size: 'md',
    variant: 'light',
    persist: false,
    disabled: false,
    hint: 'JPEG, PNG, WebP or GIF — up to 5MB',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string | null];
  uploaded: [url: string];
}>();

const api = useApi();
const inputRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const localError = ref<string | null>(null);
const localPreview = ref<string | null>(null);

const pixelSize = computed(() => (props.size === 'lg' ? 96 : 64));
const sizeClass = computed(() =>
  props.size === 'lg' ? 'h-24 w-24' : 'h-14 w-14 sm:h-16 sm:w-16',
);
const roundedClass = 'rounded-2xl';

const previewSrc = computed(() => {
  if (localPreview.value) return localPreview.value;
  return resolveAvatarUrl(props.modelValue, props.seed, pixelSize.value);
});

const ariaLabel = computed(() =>
  uploading.value ? 'Uploading profile photo' : 'Change profile photo',
);

function openPicker() {
  if (props.disabled || uploading.value) return;
  localError.value = null;
  inputRef.value?.click();
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  localError.value = null;

  if (!ALLOWED_TYPES.has(file.type)) {
    localError.value = 'Use a JPEG, PNG, WebP, or GIF image.';
    return;
  }

  uploading.value = true;
  const objectUrl = URL.createObjectURL(file);
  localPreview.value = objectUrl;

  try {
    const tokenRes = await api.createAvatarUploadToken();
    if (file.size > tokenRes.maxUploadBytes) {
      throw new Error(
        `Image must be under ${Math.round(tokenRes.maxUploadBytes / (1024 * 1024))}MB.`,
      );
    }

    const { ByteshipClient } = await import('@byteship/js');
    const byteship = new ByteshipClient({ uploadToken: tokenRes.token });
    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/gif'
            ? 'gif'
            : 'jpg';
    const uploaded = await byteship.upload(file, {
      visibility: 'public',
      path: `${tokenRes.folder}/avatar.${ext}`,
    });

    const url = uploaded.url?.trim();
    if (!url) {
      throw new Error('Upload finished but no public URL was returned.');
    }

    if (props.persist) {
      const { profile } = await api.updateMyCreator({ avatarUrl: url });
      const saved = profile.avatarUrl?.trim() || url;
      emit('update:modelValue', saved);
      emit('uploaded', saved);
    } else {
      emit('update:modelValue', url);
      emit('uploaded', url);
    }
  } catch (err) {
    localPreview.value = null;
    if (err instanceof ApiClientError) {
      localError.value =
        err.errorCode === 'BYTESHIP_NOT_CONFIGURED'
          ? 'Photo uploads are not configured yet. Add BYTESHIP_API_KEY to the server env.'
          : err.message || 'Could not upload photo.';
    } else if (err instanceof Error) {
      localError.value = err.message;
    } else {
      localError.value = 'Could not upload photo.';
    }
  } finally {
    if (localPreview.value === objectUrl) {
      localPreview.value = null;
    }
    URL.revokeObjectURL(objectUrl);
    uploading.value = false;
  }
}
</script>
