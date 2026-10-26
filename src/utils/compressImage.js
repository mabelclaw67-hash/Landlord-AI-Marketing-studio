// Shrinks an oversized JPG/PNG in the browser so tenants don't have to resize photos themselves.
// Files already within the limit, and non-image files (PDF/DOC/DOCX), are returned untouched.
const DIMENSIONS = [3000, 2400, 2000, 1600, 1200];
const QUALITIES = [0.88, 0.8, 0.7];
const IMAGE_EXT = /\.(jpe?g|png)$/i;
const HEIC_EXT = /\.(heic|heif)$/i; // iPhone default photo format; converted to JPEG here

async function browserDecode(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { width: bitmap.width, height: bitmap.height, source: bitmap };
  } catch {
    // Some browsers (e.g. Safari with HEIC) decode only through an <img> element.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight, source: img };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function browserEncode(image, width, height, quality) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG transparency -> white, JPEG has no alpha
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image.source, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export async function shrinkImageToFit(file, maxBytes, { decode = browserDecode, encode = browserEncode } = {}) {
  const isHeic = HEIC_EXT.test(file.name) || /^image\/hei[cf]$/.test(file.type);
  const isImage = /^image\/(jpeg|png)$/.test(file.type) || (!file.type && IMAGE_EXT.test(file.name));
  // HEIC is always converted (the server only stores PDF/JPG/PNG/DOC/DOCX); other photos only when too big.
  if (!isHeic && (!isImage || !IMAGE_EXT.test(file.name) || file.size <= maxBytes)) return file;
  try {
    const image = await decode(file);
    const target = Math.floor(maxBytes * 0.9); // leave margin under the hard limit
    for (const maxSide of DIMENSIONS) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      for (const quality of QUALITIES) {
        const blob = await encode(image, width, height, quality);
        if (blob && blob.size <= target) {
          return new File([blob], file.name.replace(isHeic ? HEIC_EXT : IMAGE_EXT, ".jpg"), { type: "image/jpeg", lastModified: file.lastModified });
        }
      }
    }
  } catch {
    // Fall through: the caller's normal size validation reports the problem.
  }
  return file;
}
