<script>
  import { appState } from "./state.svelte.js";
  import manicule from "../assets/manicule.png";

  let { annotation, index, onclick } = $props();

  let isActive = $derived(
    appState.activeAnnotation?.id === annotation.id,
  );

  let truncatedText = $derived.by(() => {
    const text = annotation.preview || "";
    return text.length > 120 ? text.slice(0, 120) + "\u2026" : text;
  });

  function handleClick() {
    appState.activeAnnotation = annotation;
    onclick?.(annotation);
  }
</script>

<button
  class="bubble"
  class:active={isActive}
  style="--float-delay: {index * 0.7}s; --enter-delay: {index * 0.12}s;"
  onclick={handleClick}
>
  <span class="bubble-page">
    <img src={manicule} alt="" class="bubble-page-icon" />
    <span class="bubble-page-text">p. {annotation.pageIndex + 1}</span>
  </span>
  <span class="bubble-text">{truncatedText}</span>
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
