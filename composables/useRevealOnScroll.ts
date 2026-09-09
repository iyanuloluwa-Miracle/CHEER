interface RevealOnScrollOptions {
  threshold?: number;
  rootMargin?: string;
  immediate?: boolean;
}

export function useRevealOnScroll(options: RevealOnScrollOptions = {}) {
  const {
    threshold = 0.12,
    rootMargin = '0px 0px -4% 0px',
    immediate = false,
  } = options;

  const targetRef = ref<HTMLElement | null>(null);
  const isVisible = ref(immediate);

  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (immediate) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      isVisible.value = true;
      return;
    }

    const el = targetRef.value;
    if (!el) {
      isVisible.value = true;
      return;
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect();
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { targetRef, isVisible };
}
