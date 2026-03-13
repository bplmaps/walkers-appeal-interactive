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

/**
 * Build a IIIF Image API 2.x URL for a given service endpoint.
 * @param {string} serviceId - The image service @id
 * @param {number} maxWidth - Maximum width constraint
 * @param {number} maxHeight - Maximum height constraint
 * @returns {string}
 */
export function getImageUrl(serviceId, maxWidth, maxHeight) {
  return `${serviceId}/full/!${maxWidth},${maxHeight}/0/default.jpg`;
}

/**
 * Extract xywh coordinates from a IIIF annotation target string.
 * @param {string} target - e.g. "https://...canvas/abc#xywh=100,200,300,400"
 * @returns {{ x: number, y: number, w: number, h: number } | null}
 */
export function parseXywh(target) {
  if (!target || typeof target !== "string") return null;
  const match = target.match(/#xywh=(\d+),(\d+),(\d+),(\d+)/);
  if (!match) return null;
  return {
    x: parseInt(match[1], 10),
    y: parseInt(match[2], 10),
    w: parseInt(match[3], 10),
    h: parseInt(match[4], 10),
  };
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
