<script>
  import { appState } from "./state.svelte.js";
  import manicule from "../assets/manicule.png";

  const BUBBLE_OFFSET = 14;
  const VIEWPORT_PADDING = 8;

  let { annotation, index, onclick } = $props();
  let bubbleEl = $state(null);
  let detached = $state(false);
  let floatingLeft = $state(0);
  let floatingTop = $state(0);

  let isActive = $derived(
    appState.activeAnnotation?.id === annotation.id,
  );

  let bubbleText = $derived.by(() => {
    const text = annotation.preview || "";
    if (isActive) return text;
    return text.length > 120 ? text.slice(0, 120) + "\u2026" : text;
  });

  function handleClick() {
    appState.activeAnnotation = annotation;
    onclick?.(annotation);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getTargetPosition(bubbleWidth, bubbleHeight) {
    const overlay = appState.activeOverlayRect;
    if (!overlay) return null;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const rightX = overlay.left + overlay.width + BUBBLE_OFFSET;
    const leftX = overlay.left - bubbleWidth - BUBBLE_OFFSET;
    // Right page highlights should position bubble on the left;
    // left page highlights should position bubble on the right.
    const preferredX = overlay.isRightPage ? leftX : rightX;
    const fallbackX = overlay.isRightPage ? rightX : leftX;

    let left = preferredX;
    if (left < VIEWPORT_PADDING || left + bubbleWidth > viewportWidth - VIEWPORT_PADDING) {
      left = fallbackX;
    }
    left = clamp(
      left,
      VIEWPORT_PADDING,
      viewportWidth - bubbleWidth - VIEWPORT_PADDING,
    );

    const centeredTop = overlay.top + (overlay.height - bubbleHeight) / 2;
    const top = clamp(
      centeredTop,
      VIEWPORT_PADDING,
      viewportHeight - bubbleHeight - VIEWPORT_PADDING,
    );

    return { left, top };
  }

  function moveToOverlay() {
    if (!isActive || !appState.activeOverlayRect || !bubbleEl) return;

    if (!detached) {
      const start = bubbleEl.getBoundingClientRect();
      floatingLeft = start.left;
      floatingTop = start.top;
      detached = true;
      requestAnimationFrame(() => {
        const target = getTargetPosition(bubbleEl.offsetWidth, bubbleEl.offsetHeight);
        if (!target) return;
        floatingLeft = target.left;
        floatingTop = target.top;
      });
      return;
    }

    const target = getTargetPosition(bubbleEl.offsetWidth, bubbleEl.offsetHeight);
    if (!target) return;
    floatingLeft = target.left;
    floatingTop = target.top;
  }

  $effect(() => {
    isActive;
    appState.activeOverlayRect;
    moveToOverlay();
  });

  $effect(() => {
    if (!isActive && detached) {
      detached = false;
    }
  });
</script>

<button
  bind:this={bubbleEl}
  class="bubble"
  class:active={isActive}
  class:detached={detached}
  style={detached
    ? `left: ${floatingLeft}px; top: ${floatingTop}px; --float-delay: ${index * 0.7}s; --enter-delay: ${index * 0.12}s;`
    : `--float-delay: ${index * 0.7}s; --enter-delay: ${index * 0.12}s;`}
  onclick={handleClick}
>
  <span class="bubble-page">
    <img src={manicule} alt="" class="bubble-page-icon" />
    <span class="bubble-page-text">p. {annotation.pageIndex + 1}</span>
  </span>
  <span class="bubble-text">{bubbleText}</span>
</button>

<style>
  .bubble {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 18px;
    background: #f5e9d7;
    backdrop-filter: blur(8px);
    border: 2px solid rgba(120, 120, 120, 0.2);
    border-radius: 20px;
    cursor: pointer;
    text-align: left;
    max-width: 220px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition:
      left 0.3s ease,
      top 0.3s ease,
      border-color 0.25s ease,
      box-shadow 0.25s ease;
    animation:
      enter 0.5s ease-out var(--enter-delay) both,
      float 4s ease-in-out var(--float-delay) infinite;
  }

  .bubble:hover {
    border-color: rgba(251, 191, 36, 0.6);
    box-shadow: 0 6px 28px rgba(0, 0, 0, 0.2);
    animation-play-state: running, paused;
  }

  .bubble.active {
    border-color: rgba(251, 191, 36, 0.9);
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.3),
      0 6px 28px rgba(0, 0, 0, 0.2);
    animation-play-state: running, paused;
    max-width: 320px;
  }

  .bubble.detached {
    position: fixed;
    max-width: 320px;
    z-index: 150;
  }

  .bubble-page {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .bubble-page-icon {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }

  .bubble-page-text {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #a16207;
  }

  .bubble-text {
    font-size: 13px;
    line-height: 1.45;
    color: #374151;
  }

  @keyframes enter {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-6px);
    }
  }
</style>
