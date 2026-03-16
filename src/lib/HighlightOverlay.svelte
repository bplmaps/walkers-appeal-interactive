<script>
  import { appState } from "./state.svelte.js";

  let { bookRect } = $props();

  let pageIsVisible = $derived.by(() => {
    const anno = appState.activeAnnotation;
    if (!anno) return false;
    const cp = appState.currentPage;
    return anno.pageIndex === cp || anno.pageIndex === cp + 1;
  });

  let overlayStyle = $derived.by(() => {
    const anno = appState.activeAnnotation;
    if (!anno?.xywh || !bookRect || !pageIsVisible) return "display: none;";

    const { x, y, w, h } = anno.xywh;
    const pageIndex = anno.pageIndex;

    const isRightPage =
      pageIndex === 0 || (pageIndex > 0 && pageIndex % 2 === 0);

    const pageLeft = isRightPage
      ? bookRect.left + bookRect.pageWidth
      : bookRect.left;

    const scaleX = bookRect.pageWidth / anno.canvasWidth;
    const scaleY = bookRect.height / anno.canvasHeight;

    const ox = pageLeft + x * scaleX;
    const oy = bookRect.top + y * scaleY;
    const ow = w * scaleX;
    const oh = h * scaleY;

    return `left: ${ox}px; top: ${oy}px; width: ${ow}px; height: ${oh}px;`;
  });
</script>

{#if appState.activeAnnotation?.xywh && pageIsVisible}
  <div class="highlight-overlay" style={overlayStyle}></div>
{/if}

<style>
  .highlight-overlay {
    position: absolute;
    background: rgba(251, 190, 36, 0.156);
    border: 3px solid rgba(229, 29, 255, 0.884);
    border-radius: 4px;
    pointer-events: none;
    z-index: 100;
    animation: highlight-in 0.4s ease-out;
  }

  @keyframes highlight-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
