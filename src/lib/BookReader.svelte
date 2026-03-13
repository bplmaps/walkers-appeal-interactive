<script>
  import { onMount, onDestroy } from "svelte";
  import { PageFlip } from "page-flip";
  import { getImageUrl, preloadNearbyPages } from "./iiif.js";
  import { appState } from "./state.svelte.js";
  import HighlightOverlay from "./HighlightOverlay.svelte";

  const IMG_MAX_W = 800;
  const IMG_MAX_H = 1200;

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

  let containerEl = $state(null);
  let pageFlip = $state(null);
  let bookRect = $state(null);

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
</style>
