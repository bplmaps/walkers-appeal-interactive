/**
 * Parse a IIIF Presentation 3.0 manifest into page and annotation data.
 * @param {object} manifest - The parsed JSON manifest
 * @returns {{ pages: Array, annotations: Array }}
 */
export function parseManifest(manifest) {
  const pages = [];
  const annotations = [];

  const canvases = manifest.items || [];

  canvases.forEach((canvas, pageIndex) => {
    const paintingAnno = canvas.items?.[0]?.items?.[0];
    const body = paintingAnno?.body;
    const serviceId = body?.service?.[0]?.["@id"] ?? null;

    pages.push({
      canvasId: canvas.id,
      imageServiceId: serviceId,
      width: canvas.width,
      height: canvas.height,
      label: canvas.label?.none?.[0] ?? `Page ${pageIndex + 1}`,
    });

    const annoPages = canvas.annotations || [];
    for (const annoPage of annoPages) {
      const items = annoPage.items || [];
      for (const anno of items) {
        if (anno.motivation !== "commenting") continue;

        const textBody = Array.isArray(anno.body)
          ? anno.body.find((b) => b.type === "TextualBody")
          : anno.body?.type === "TextualBody"
            ? anno.body
            : null;

        if (!textBody) continue;

        const xywh = parseXywh(anno.target);

        annotations.push({
          id: anno.id,
          pageIndex,
          text: textBody.value || "",
          preview: stripHtml(textBody.value || ""),
          xywh,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });
      }
    }
  });

  return { pages, annotations };
}

/** Same-origin path prefix; Netlify rewrites to iiif.digitalcommonwealth.org (see netlify.toml). */
const IIIF_PROXY_PREFIX = "/_iiif";

/**
 * Build a IIIF Image API 2.x URL for a given service endpoint.
 * Uses a same-origin path so Edge does not treat loads as public-site → local-network (LNA).
 * @param {string} serviceId - The image service @id
 * @param {number} maxWidth - Maximum width constraint
 * @param {number} maxHeight - Maximum height constraint
 * @returns {string}
 */
export function getImageUrl(serviceId, maxWidth, maxHeight) {
  const path = new URL(serviceId).pathname.replace(/\/$/, "");
  return `${IIIF_PROXY_PREFIX}${path}/full/!${maxWidth},${maxHeight}/0/default.jpg`;
}

/**
 * Extract xywh coordinates from IIIF annotation targets.
 * Supports both legacy target fragments and IIIF v3 FragmentSelector values.
 * @param {string | object | Array} target
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
export function parseXywh(target) {
  const xywhText = extractXywhText(target);
  if (!xywhText) return null;

  // Accept:
  // - "xywh=100,200,300,400"
  // - "xywh=pixel:100,200,300,400"
  // - "#xywh=100,200,300,400"
  const match = xywhText.match(
    /(?:#|^)xywh=(?:pixel:)?([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/,
  );
  if (!match) return null;

  return {
    x: Number.parseFloat(match[1]),
    y: Number.parseFloat(match[2]),
    w: Number.parseFloat(match[3]),
    h: Number.parseFloat(match[4]),
  };
}

function extractXywhText(target) {
  if (!target) return null;

  if (typeof target === "string") {
    return target;
  }

  if (Array.isArray(target)) {
    for (const item of target) {
      const value = extractXywhText(item);
      if (value) return value;
    }
    return null;
  }

  if (typeof target !== "object") return null;

  const selector = target.selector;
  if (selector) {
    if (typeof selector === "string") return selector;
    if (Array.isArray(selector)) {
      for (const s of selector) {
        if (typeof s?.value === "string" && s.value.includes("xywh=")) {
          return s.value;
        }
      }
    } else if (typeof selector?.value === "string") {
      return selector.value;
    }
  }

  if (typeof target.value === "string" && target.value.includes("xywh=")) {
    return target.value;
  }

  if (typeof target.id === "string") {
    return target.id;
  }

  return null;
}

/**
 * Strip HTML tags from a string, returning plain text.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Preload images for pages near the current index.
 * @param {Array} pages - Array of page objects with imageServiceId
 * @param {number} currentIndex - Current page index
 * @param {number} maxW - Max width for IIIF Image API
 * @param {number} maxH - Max height for IIIF Image API
 * @param {number} range - Number of pages ahead/behind to preload
 */
export function preloadNearbyPages(pages, currentIndex, maxW, maxH, range = 4) {
  const start = Math.max(0, currentIndex - range);
  const end = Math.min(pages.length - 1, currentIndex + range);
  for (let i = start; i <= end; i++) {
    const page = pages[i];
    if (page?.imageServiceId) {
      const img = new Image();
      img.src = getImageUrl(page.imageServiceId, maxW, maxH);
    }
  }
}
