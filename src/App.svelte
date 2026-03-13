<script>
  import { parseManifest } from "./lib/iiif.js";
  import { appState } from "./lib/state.svelte.js";
  import manifest from "./assets/manifest.json";
  import BookReader from "./lib/BookReader.svelte";
  import AnnotationPanel from "./lib/AnnotationPanel.svelte";

  function handleAnnotationClick(annotation) {
    appState.activeAnnotation = annotation;
  }

  const trimmedManifest = { ...manifest, items: manifest.items.slice(0, 76) };
  const { pages, annotations } = parseManifest(trimmedManifest);
  appState.pages = pages;
  appState.annotations = annotations;
</script>

<div class="kiosk h-dvh w-dvw overflow-hidden flex bg-neutral-900">
  {#if appState.annotations.length > 0}
    <div class="side-panel left-panel">
      <AnnotationPanel
        side="left"
        onAnnotationClick={handleAnnotationClick}
      />
    </div>
  {/if}

  <div class="book-area">
    <BookReader />
  </div>

  {#if appState.annotations.length > 0}
    <div class="side-panel right-panel">
      <AnnotationPanel
        side="right"
        onAnnotationClick={handleAnnotationClick}
      />
    </div>
  {/if}
</div>

<style>
  .kiosk {
    user-select: none;
    -webkit-user-select: none;
  }

  .side-panel {
    width: 15%;
    min-width: 180px;
    max-width: 260px;
    flex-shrink: 0;
    height: 100%;
  }

  .book-area {
    flex: 1;
    min-width: 0;
    height: 100%;
    padding: 24px 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: black;
  }

</style>
