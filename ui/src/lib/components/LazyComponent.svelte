<script>
  /**
   * LazyComponent - Loads content only when visible in viewport
   * Uses IntersectionObserver for efficient lazy loading
   */
  import { onMount, onDestroy } from 'svelte';
  
  export let threshold = 0.1;
  export let rootMargin = '100px';
  
  let element;
  let isVisible = false;
  let observer;
  
  onMount(() => {
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback for older browsers - load immediately
      isVisible = true;
      return;
    }
    
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible = true;
            // Disconnect after first visibility to save resources
            observer?.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );
    
    if (element) {
      observer.observe(element);
    }
  });
  
  onDestroy(() => {
    observer?.disconnect();
  });
</script>

<div bind:this={element} class="lazy-wrapper">
  {#if isVisible}
    <slot />
  {:else}
    <slot name="placeholder">
      <div class="lazy-placeholder" />
    </slot>
  {/if}
</div>

<style>
  .lazy-wrapper {
    min-height: 1px;
  }
  
  .lazy-placeholder {
    background: linear-gradient(90deg, #1e1e1e 25%, #2e2e2e 50%, #1e1e1e 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    height: 100px;
    border-radius: 8px;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
</style>
