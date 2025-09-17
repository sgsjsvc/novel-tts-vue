// src/composables/useIntersectionObserver.ts

import { ref, onMounted, onUnmounted, Ref } from 'vue';

export function useIntersectionObserver(
  sentinel: Ref<Element | null>,
  callback: () => void,
  options: IntersectionObserverInit = { root: null, rootMargin: '0px', threshold: 0.1 }
) {
  let observer: IntersectionObserver | null = null;

  const startObserver = () => {
    if (observer) observer.disconnect();
    if (!sentinel.value) return;

    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, options);
    observer.observe(sentinel.value);
  };
  
  const stopObserver = () => {
      if(observer) {
          observer.disconnect();
      }
  }

  onMounted(startObserver);
  onUnmounted(stopObserver);

  return { startObserver, stopObserver };
}