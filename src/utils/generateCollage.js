/**
 * generateCollage.js
 *
 * Shared canvas-based collage generator + photo selection resolver.
 * Used by BOTH For Rent (ListingDetail) and For Sale (HomeSaleCoverImage).
 *
 * No external dependencies. Pure browser Canvas API.
 * No original Drive files are touched — output is a new JPEG blob/dataURL only.
 *
 * Layout (4-photo default, degrades gracefully to 3 / 2 / 1):
 *   ┌─────────────────┬────────┐
 *   │  [badge]        │  #2    │
 *   │      #1         ├────────┤
 *   │   (main, 60%)   │  #3    │
 *   │  [text overlay] ├────────┤
 *   │                 │  #4    │
 *   └─────────────────┴────────┘
 *
 * Aspect ratio: 4:3 (1200 × 900) — mobile / social-media friendly.
 *
 * overlayData fields (all optional — null / undefined / "" = skip that line):
 *   badge       "FOR RENT" | "FOR SALE"
 *   title       "2 Bed / 1 Bath"
 *   location    "Nanaimo, BC"
 *   address     "693 3rd St"
 *   priceLabel  "$1,700/month"
 *   dateLabel   "Available: 2025-07-01"
 */

/**
 * Resolve which photos to pass to the collage generator.
 *
 * Rules (same for For Rent and For Sale):
 *  - If selection is empty  → auto-select first 4 from allPhotos
 *  - If selection has items → use selected first; if cover is among them, put it at position 0
 *  - Auto-fill remaining slots (up to 4) from non-selected photos in original order
 *
 * @param {any[]}    allPhotos   Ordered pool of available photos
 * @param {Set}      selection   Set of selected photo IDs (assetId / fileId)
 * @param {Function} getId       (photo) => string — extract the photo's ID
 * @param {string}   [coverId]   ID of the current cover photo (placed first if selected)
 * @returns {any[]} Up to 4 photos in the order they should appear in the collage
 */
export function resolveCollagePhotos(allPhotos, selection, getId, coverId) {
  if (!selection || selection.size === 0) {
    return allPhotos.slice(0, 4);
  }

  const selected    = allPhotos.filter((p) => selection.has(getId(p)));
  const unselected  = allPhotos.filter((p) => !selection.has(getId(p)));

  // If the current cover is in the selection, move it to position 0
  const coverIdx = selected.findIndex((p) => getId(p) === coverId);
  if (coverIdx > 0) {
    const [cover] = selected.splice(coverIdx, 1);
    selected.unshift(cover);
  }

  // Fill remaining slots from unselected photos
  const result = [...selected];
  for (const p of unselected) {
    if (result.length >= 4) break;
    result.push(p);
  }

  return result.slice(0, 4);
}

/**
 * @param {string[]} imageSrcs      Array of src values (data: URLs preferred; HTTPS with crossOrigin)
 * @param {object}   [options]
 * @param {number}   [options.width=1200]
 * @param {number}   [options.height=900]
 * @param {number}   [options.gap=8]             Gap between panels (white divider)
 * @param {string}   [options.bgColor="#ffffff"]  Panel gap / background colour
 * @param {number}   [options.quality=0.92]
 * @param {object}   [options.overlayData]        Text overlay descriptor (see above)
 * @returns {Promise<string>} JPEG dataURL
 */
export async function generateCollageDataUrl(
  imageSrcs,
  {
    width       = 1200,
    height      = 900,
    gap         = 8,
    bgColor     = "#ffffff",
    quality     = 0.92,
    overlayData = null,
  } = {}
) {
  if (!Array.isArray(imageSrcs) || imageSrcs.length === 0) {
    throw new Error("No image sources provided to generateCollageDataUrl.");
  }

  // Load up to 4 images; failed loads return null and are skipped
  const loaded = await Promise.all(imageSrcs.slice(0, 4).map(loadImage));
  const imgs   = loaded.filter(Boolean);

  if (imgs.length === 0) {
    throw new Error(
      "No images could be loaded for the collage. " +
      "If using Drive thumbnail URLs, ensure the folder is shared " +
      "and CORS is permitted, or use base64 data URLs instead."
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext("2d");

  // White background — shows between panels as clean dividers
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const n = imgs.length;

  if (n === 1) {
    coverFit(ctx, imgs[0], 0, 0, width, height);
    if (overlayData) drawOverlay(ctx, overlayData, 0, 0, width, height);
  } else if (n === 2) {
    const halfW = Math.floor((width - gap) / 2);
    coverFit(ctx, imgs[0], 0, 0, halfW, height);
    if (overlayData) drawOverlay(ctx, overlayData, 0, 0, halfW, height);
    coverFit(ctx, imgs[1], halfW + gap, 0, width - halfW - gap, height);
  } else if (n === 3) {
    const mainW = Math.round(width * 0.6) - Math.round(gap / 2);
    const sideW = width - mainW - gap;
    const halfH = Math.floor((height - gap) / 2);
    coverFit(ctx, imgs[0], 0, 0, mainW, height);
    if (overlayData) drawOverlay(ctx, overlayData, 0, 0, mainW, height);
    coverFit(ctx, imgs[1], mainW + gap, 0,           sideW, halfH);
    coverFit(ctx, imgs[2], mainW + gap, halfH + gap, sideW, height - halfH - gap);
  } else {
    // 4-photo: 1 large left (60%) + 3 stacked right (40%)
    const mainW = Math.round(width * 0.6) - Math.round(gap / 2);
    const sideW = width - mainW - gap;
    const slotH = Math.floor((height - gap * 2) / 3);
    coverFit(ctx, imgs[0], 0, 0, mainW, height);
    if (overlayData) drawOverlay(ctx, overlayData, 0, 0, mainW, height);
    coverFit(ctx, imgs[1], mainW + gap, 0,                 sideW, slotH);
    coverFit(ctx, imgs[2], mainW + gap, slotH + gap,       sideW, slotH);
    coverFit(ctx, imgs[3], mainW + gap, (slotH + gap) * 2, sideW, height - (slotH + gap) * 2);
  }

  return canvas.toDataURL("image/jpeg", quality);
}

// ── Overlay renderer ───────────────────────────────────────────────────────────

function drawOverlay(ctx, data, x, y, w, h) {
  // Sanitise: coerce falsy / "undefined" to empty string — nothing renders blank
  const clean = (v) =>
    v && String(v).trim() !== "" && String(v).trim() !== "undefined"
      ? String(v).trim()
      : "";

  const badge = clean(data.badge);
  const title = clean(data.title);
  const loc   = clean(data.location);
  const addr  = clean(data.address);
  const price = clean(data.priceLabel);
  const date  = clean(data.dateLabel);

  // ── Dark gradient over lower portion of main photo ────────────────────────
  const grd = ctx.createLinearGradient(x, y + h * 0.28, x, y + h);
  grd.addColorStop(0,    "rgba(0,0,0,0)");
  grd.addColorStop(0.42, "rgba(0,0,0,0.52)");
  grd.addColorStop(1,    "rgba(0,0,0,0.84)");
  ctx.fillStyle = grd;
  ctx.fillRect(x, y + h * 0.28, w, h * 0.72);

  // ── Layout constants ──────────────────────────────────────────────────────
  const pad  = Math.round(w * 0.058);  // horizontal / vertical padding
  const base = Math.round(h * 0.056);  // base font-size unit (~50 px at 900 h)
  const maxW = w - pad * 2;            // max text width

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // ── Build text lines (rendered bottom-up) ─────────────────────────────────
  const lines = [];
  if (date)  lines.push({ text: date,  size: base * 0.82, weight: "400", alpha: 0.88 });
  if (price) lines.push({ text: price, size: base * 1.02, weight: "700", alpha: 1.0  });
  if (addr)  lines.push({ text: addr,  size: base * 0.80, weight: "400", alpha: 0.88 });
  if (loc)   lines.push({ text: loc,   size: base * 0.86, weight: "400", alpha: 0.92 });

  const hasSep = lines.length > 0 && (title || badge);
  if (title) lines.push({ text: title, size: base * 1.58, weight: "800", alpha: 1.0 });

  ctx.textAlign    = "left";
  ctx.textBaseline = "bottom";

  let curY = y + h - pad;

  for (const line of lines) {
    const sz = Math.round(line.size);
    ctx.font         = `${line.weight} ${sz}px Arial, Helvetica, sans-serif`;
    ctx.globalAlpha  = line.alpha;
    ctx.fillStyle    = "#ffffff";
    ctx.shadowColor  = "rgba(0,0,0,0.65)";
    ctx.shadowBlur   = 7;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillText(truncate(ctx, line.text, maxW), x + pad, curY);
    curY -= sz + Math.round(sz * 0.24);
  }

  // ── Separator rule ────────────────────────────────────────────────────────
  ctx.globalAlpha   = 1;
  ctx.shadowColor   = "transparent";
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  if (hasSep) {
    const sepY = curY - Math.round(base * 0.38);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + pad, sepY);
    ctx.lineTo(x + pad + Math.round(w * 0.52), sepY);
    ctx.stroke();
    curY = sepY - Math.round(base * 0.52);
  }

  // ── Yellow badge (top-left corner) ────────────────────────────────────────
  if (badge) {
    const bSz   = Math.round(base * 0.78);
    ctx.font    = `800 ${bSz}px Arial, Helvetica, sans-serif`;
    const tW    = ctx.measureText(badge).width;
    const bPadX = Math.round(bSz * 0.55);
    const bPadY = Math.round(bSz * 0.32);
    const bW    = tW + bPadX * 2;
    const bH    = bSz + bPadY * 2;
    const bx    = x + pad;
    const by    = y + pad;

    ctx.fillStyle   = "#FBBF24";  // amber-400
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur  = 10;
    roundRect(ctx, bx, by, bW, bH, Math.round(bH * 0.18));
    ctx.fill();

    ctx.shadowColor  = "transparent";
    ctx.shadowBlur   = 0;
    ctx.fillStyle    = "#111111";
    ctx.textBaseline = "top";
    ctx.fillText(badge, bx + bPadX, by + bPadY);
  }

  ctx.restore();
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

/** Truncate text to fit maxW pixels, appending "…" */
function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s + "…";
}

/** Cross-browser rounded rect path (avoids ctx.roundRect which is Chrome 99+) */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Cover-fit an image into a rect (CSS object-fit: cover equivalent).
 * Clips canvas to [x, y, w, h] and draws centred + scaled.
 */
function coverFit(ctx, img, x, y, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw    = img.naturalWidth  * scale;
  const dh    = img.naturalHeight * scale;
  const dx    = x + (w - dw) / 2;
  const dy    = y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/**
 * Load an image from any src string.
 * - data: / blob: URLs → no crossOrigin needed (same-origin by spec)
 * - HTTPS URLs → crossOrigin="anonymous" so canvas.toDataURL() is allowed
 * Returns null on error — caller continues with fewer photos gracefully.
 */
function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img   = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = src;
  });
}
