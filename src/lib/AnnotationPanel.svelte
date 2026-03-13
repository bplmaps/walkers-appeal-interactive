<script>
  import { appState } from "./state.svelte.js";
  import AnnotationBubble from "./AnnotationBubble.svelte";

  let { side, onAnnotationClick } = $props();

  let annotations = $derived.by(() => {
    const all = appState.annotations;
    if (all.length === 0) return [];

    const left = [];
    const right = [];
    all.forEach((a, i) => {
      if (i % 2 === 0) {
        left.push(a);
      } else {
        right.push(a);
      }
    });

    return side === "left" ? left : right;
  });
</script>

<div class="panel panel-{side}">
  {#each annotations as annotation, i (annotation.id)}
    <AnnotationBubble
      {annotation}
      index={i}
      onclick={onAnnotationClick}
    />
  {/each}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 20px;
    padding: 24px 12px;
    height: 100%;
    overflow-y: auto;
    scrollbar-width: none;
  }

  .panel::-webkit-scrollbar {
    display: none;
  }

  .panel-left {
    align-items: flex-end;
  }

  .panel-right {
    align-items: flex-start;
  }
</style>
