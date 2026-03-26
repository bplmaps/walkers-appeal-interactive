<script>
  import { onMount, onDestroy } from "svelte";
  import { PageFlip } from "page-flip";
  import { getImageUrl, preloadNearbyPages } from "./iiif.js";
  import { appState } from "./state.svelte.js";
  import HighlightOverlay from "./HighlightOverlay.svelte";

  const IMG_MAX_W = 800;
  const IMG_MAX_H = 1200;

  let containerEl = $state(null);
  let pageFlip = $state(null);
  let bookRect = $state(null);

  /** First page index of each spread; matches page-flip `showCover` + landscape `createSpread`. */
  function landscapeCoverSpreadStarts(pageCount) {
    if (pageCount <= 0) return [];
    const starts = [0];
    let i = 1;
    while (i < pageCount) {
      if (i + 1 < pageCount) {
        starts.push(i);
        i += 2;
      } else {
        starts.push(i);
        break;
      }
    }
    return starts;
  }

  let spreadStarts = $derived(
    landscapeCoverSpreadStarts(appState.pages.length),
  );

  let spreadIndex = $derived.by(() => {
    const idx = spreadStarts.indexOf(appState.currentPage);
    return idx >= 0 ? idx : 0;
  });

  let canGoPrev = $derived(spreadIndex > 0);
  let canGoNext = $derived(spreadIndex < spreadStarts.length - 1);

  let leftNavStyle = $derived.by(() => {
    if (!bookRect) return "";
    const cx = bookRect.left + bookRect.pageWidth / 2;
    const top = bookRect.top + bookRect.height - 26;
    return `left: ${cx}px; top: ${top}px; transform: translateX(-50%);`;
  });

  let rightNavStyle = $derived.by(() => {
    if (!bookRect) return "";
    const cx = bookRect.left + bookRect.pageWidth * 1.5;
    const top = bookRect.top + bookRect.height - 26;
    return `left: ${cx}px; top: ${top}px; transform: translateX(-50%);`;
  });

  function goPrev() {
    if (!pageFlip || !canGoPrev) return;
    if (typeof pageFlip.flipPrev === "function") {
      pageFlip.flipPrev("top");
    } else {
      const target = spreadStarts[spreadIndex - 1];
      if (target != null) pageFlip.flip(target, "top");
    }
  }

  function goNext() {
    if (!pageFlip || !canGoNext) return;
    if (typeof pageFlip.flipNext === "function") {
      pageFlip.flipNext("top");
    } else {
      const target = spreadStarts[spreadIndex + 1];
      if (target != null) pageFlip.flip(target, "top");
    }
  }

  function patchPageFlipBackground(pf) {
    const render = pf.getRender();
    const canvas = containerEl.querySelector("canvas");
    render.clear = function () {
      const ctx = this.getContext();
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const pages = pf.getPageCollection().getPages();
    if (pages.length > 0) {
      const proto = Object.getPrototypeOf(pages[0]);
      proto.drawLoader = function (ctx, pos, w, h) {
        ctx.fillStyle = "black";
        ctx.fillRect(pos.x, pos.y, w, h);
      };
    }
  }

  function updateBookRect() {
    if (pageFlip) {
      bookRect = { ...pageFlip.getBoundsRect() };
    }
  }

  onMount(() => {
    if (!containerEl || appState.pages.length === 0) return;

    const imageUrls = appState.pages.map((p) =>
      getImageUrl(p.imageServiceId, IMG_MAX_W, IMG_MAX_H),
    );

    const pf = new PageFlip(containerEl, {
      width: 550,
      height: 830,
      size: "stretch",
      maxWidth: 800,
      maxHeight: 1200,
      minWidth: 300,
      minHeight: 450,
      drawShadow: true,
      flippingTime: 800,
      usePortrait: false,
      showCover: true,
      startPage: 0,
      maxShadowOpacity: 0.6,
      autoSize: true,
      showPageCorners: true,
      mobileScrollSupport: false,
    });

    pf.loadFromImages(imageUrls);
    patchPageFlipBackground(pf);

    pf.on("flip", (e) => {
      appState.currentPage = e.data;
      updateBookRect();
      preloadNearbyPages(appState.pages, e.data, IMG_MAX_W, IMG_MAX_H);

      if (appState.activeAnnotation) {
        const annoPage = appState.activeAnnotation.pageIndex;
        const visible = [e.data, e.data + 1];
        if (!visible.includes(annoPage)) {
          appState.activeAnnotation = null;
        }
      }
    });

    pf.on("init", () => {
      appState.bookReady = true;
      updateBookRect();
    });

    pf.on("changeOrientation", () => {
      updateBookRect();
    });

    pageFlip = pf;

    const resizeObserver = new ResizeObserver(() => {
      updateBookRect();
    });
    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    if (pageFlip) {
      pageFlip.destroy();
    }
  });

  $effect(() => {
    if (appState.activeAnnotation && pageFlip) {
      const anno = appState.activeAnnotation;
      const currentPage = pageFlip.getCurrentPageIndex();
      if (anno.pageIndex !== currentPage && anno.pageIndex !== currentPage + 1) {
        pageFlip.flip(anno.pageIndex, "top");
      }
      setTimeout(updateBookRect, 150);
    }
  });
</script>

<div class="book-container">
  <div bind:this={containerEl} class="book-inner"></div>
  {#if bookRect && appState.activeAnnotation}
    <HighlightOverlay {bookRect} />
  {/if}
  {#if bookRect}
    <button
      type="button"
      class="page-nav page-nav--prev"
      style={leftNavStyle}
      disabled={!canGoPrev}
      aria-label="Previous spread"
      title="Previous spread"
      onclick={goPrev}
    >
      <span class="page-nav__icon" aria-hidden="true">←</span>
    </button>
    <button
      type="button"
      class="page-nav page-nav--next"
      style={rightNavStyle}
      disabled={!canGoNext}
      aria-label="Next spread"
      title="Next spread"
      onclick={goNext}
    >
      <span class="page-nav__icon" aria-hidden="true">→</span>
    </button>
  {/if}
</div>

<style>
  .book-container {
    position: relative;
    width: 100%;
    height: 100%;
    background: black;
  }

  .book-inner {
    width: 100%;
    height: 100%;
    background: black;
  }

  .book-inner :global(.stf__parent) {
    background: black;
  }

  .page-nav {
    position: absolute;
    z-index: 200;
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.85rem;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 0.35rem;
    background: rgba(30, 30, 30, 0.92);
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      opacity 0.15s ease;
  }

  .page-nav:hover:not(:disabled) {
    background: rgba(55, 55, 55, 0.96);
    border-color: rgba(255, 255, 255, 0.55);
  }

  .page-nav:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    border-color: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.45);
  }

  .page-nav__icon {
    display: block;
  }
</style>
