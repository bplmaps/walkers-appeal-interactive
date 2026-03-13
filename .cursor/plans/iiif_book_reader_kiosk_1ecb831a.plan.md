---
name: IIIF Book Reader Kiosk
overview: Create a Svelte 5 + Vite + Tailwind 4 single-page kiosk app with a realistic page-flip book reader powered by IIIF, surrounded by interactive floating annotation bubbles.
todos:
  - id: scaffold
    content: "Scaffold project: package.json, vite.config.js, index.html, global.css, main.js with Svelte 5 + Vite 6 + Tailwind 4"
    status: completed
  - id: iiif-parser
    content: "Build iiif.js utility: parseManifest, getImageUrl, parseXywh, stripHtml"
    status: completed
  - id: state
    content: Create state.svelte.js with shared reactive state for pages, annotations, currentPage, activeAnnotation
    status: completed
  - id: book-reader
    content: "Build BookReader.svelte: integrate StPageFlip with IIIF Image API, page rendering, turnToPage function"
    status: completed
  - id: highlight
    content: "Build HighlightOverlay.svelte: scaled xywh overlay with animation"
    status: completed
  - id: bubbles
    content: "Build AnnotationBubble.svelte and AnnotationPanel.svelte: floating bubble layout with click-to-navigate"
    status: completed
  - id: app-assembly
    content: "Wire up App.svelte: manifest loading, full-viewport layout, component composition"
    status: completed
  - id: polish
    content: "Polish: preload adjacent page images, touch interaction testing, animation tuning"
    status: completed
isProject: false
---

# IIIF Book Reader Kiosk

## Key Architecture Decision: Page-Flip Library vs. OpenSeadragon

You recommended OpenSeadragon, and it is excellent for deep-zoom tile rendering, but it has no page-flip animation capability. Since your requirements prioritize realistic page-turning and explicitly exclude zoom, I recommend using **[StPageFlip](https://nodlik.github.io/StPageFlip/)** (`page-flip` on npm) instead. It provides:

- Realistic CSS/Canvas page-flip animation with drag and touch support
- Works with both images and HTML elements
- No dependencies, mobile/touch-ready
- We can still load images from the **IIIF Image API** at display-appropriate resolution

If zoom is needed later, OpenSeadragon can be layered in as an optional detail view.

## Data Source

The manifest is **IIIF Presentation 3.0** with embedded annotations. Key structures:

- **Pages**: `manifest.items[]` -- each Canvas has an ImageService2 endpoint at `canvas.items[0].items[0].body.service[0]["@id"]`
- **Annotations**: `canvas.annotations[0].items[]` -- objects with `motivation: "commenting"`, `body[0].value` (HTML text), and `target` containing `canvasURI#xywh=x,y,w,h`
- **Image loading**: IIIF Image API 2.x: `{service_id}/full/!{w},{h}/0/default.jpg`

## Tech Stack

Matching your [atlascope-v2](atlascope-v2/package.json) patterns:

- **Svelte 5** with `$state` / `$effect` reactivity (no runes opt-out)
- **Vite 6** + `@sveltejs/vite-plugin-svelte`
- **Tailwind 4** via `@tailwindcss/vite`
- **page-flip** (StPageFlip) for the book
- No other heavy dependencies

## Layout

```
+---------------------------------------------------------------+
|                                                               |
|  (bubble)    +-------------------------------+    (bubble)    |
|              |           BOOK                |                |
|  (bubble)    |   [left page] [right page]    |    (bubble)    |
|              |                               |                |
|  (bubble)    |      page-flip animation      |    (bubble)    |
|              |                               |                |
|  (bubble)    +-------------------------------+    (bubble)    |
|                                                               |
+---------------------------------------------------------------+
```

Full viewport (`100dvh x 100dvw`), no scroll. The book occupies the center ~~70% of the width; annotation bubbles float in the remaining side margins (~~15% each side), stacked vertically with slight random offsets for an organic look.

## Project Structure

New directory: `book-reader-kiosk/`

```
book-reader-kiosk/
  index.html
  package.json
  vite.config.js
  src/
    main.js
    App.svelte
    style/global.css          -- Tailwind import, full-viewport reset
    lib/
      state.svelte.js         -- shared reactive state ($state)
      iiif.js                 -- manifest parsing, image URL builder
      BookReader.svelte        -- StPageFlip integration, page rendering
      AnnotationBubble.svelte  -- single floating bubble component
      AnnotationPanel.svelte   -- positions bubbles along left/right edges
      HighlightOverlay.svelte  -- xywh region highlight on active page
```

## Component Details

### `state.svelte.js`

Shared state using Svelte 5 `$state`:

- `manifestUrl` -- configurable manifest endpoint (default: the Walker's Appeal manifest)
- `pages[]` -- parsed array of `{ canvasId, imageServiceId, width, height, label }`
- `annotations[]` -- parsed array of `{ id, pageIndex, text, xywh: {x,y,w,h}, canvasWidth, canvasHeight }`
- `currentPage` -- current page index (updated by StPageFlip events)
- `activeAnnotation` -- currently selected annotation (or null)
- `bookReady` -- loading state flag

### `iiif.js`

Utility functions:

- `parseManifest(manifest)` -- extracts pages and annotations from the Presentation 3.0 structure
- `getImageUrl(serviceId, maxWidth, maxHeight)` -- builds IIIF Image API URL: `{serviceId}/full/!{w},{h}/0/default.jpg`
- `parseXywh(target)` -- extracts `#xywh=x,y,w,h` from annotation target string
- `stripHtml(html)` -- strips HTML tags from annotation body for preview text

### `BookReader.svelte`

- Renders page `<div>` elements each containing an `<img>` loaded via IIIF Image API
- Initializes `PageFlip` in `onMount`, using `loadFromHTML()` for the page elements
- Listens to StPageFlip's `flip` event to update `currentPage` state
- Exposes a `turnToPage(index)` function (called when annotation bubbles are clicked)
- Includes `HighlightOverlay` as a child, positioned over the active page region

### `HighlightOverlay.svelte`

- When `activeAnnotation` is set, calculates the scaled xywh position relative to the displayed page size
- Renders a semi-transparent colored rectangle (e.g., amber/gold with border) over the annotation region
- Animated entrance (fade + scale), dismisses after a timeout or on next page turn

### `AnnotationBubble.svelte`

- Rounded pill/bubble shape with annotation preview text (truncated HTML-stripped body)
- Subtle floating animation (CSS `@keyframes` with slight vertical bob)
- On tap/click: sets `activeAnnotation` and calls `turnToPage()` on the book
- Visual feedback: the bubble for the active annotation gets a highlighted border/glow

### `AnnotationPanel.svelte`

- Receives all parsed annotations
- Splits them into left-side and right-side groups (alternating or by page order)
- Uses `position: absolute` with calculated vertical distribution so bubbles don't overlap
- Responsive to viewport height

### `App.svelte`

- On mount: fetches manifest, parses with `iiif.js`, populates state
- Renders `BookReader` (center) flanked by `AnnotationPanel` (left/right)
- Full viewport layout via Tailwind: `h-dvh w-dvw overflow-hidden`

## Key Implementation Notes

- **Image sizing**: For a ~1920px-wide display, each page in two-page spread is ~550-600px wide. Request images at `!600,900` from IIIF Image API for fast loading; preload adjacent pages for smooth flipping.
- **Touch support**: StPageFlip has built-in touch/swipe. No additional gesture library needed.
- **Manifest URL**: Configurable via a constant in `state.svelte.js` so the app can be pointed at any IIIF Presentation 3.0 manifest.
- **Annotation highlight scaling**: The `#xywh` coordinates are in original image pixel space. Scale factor = `displayedPageWidth / canvas.width`.

