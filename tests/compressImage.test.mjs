// Synthetic checks for the automatic photo shrink. No real images, network or production data.
import assert from "node:assert/strict";
import { shrinkImageToFit } from "../src/utils/compressImage.js";

const MAX = 4 * 1024 * 1024;
const big = (name, type, size = 9 * 1024 * 1024) => new File([new Uint8Array(size)], name, { type });
const decode = async () => ({ width: 4000, height: 3000 });
// Fake encoder: size shrinks with pixels and quality.
const encode = async (_img, w, h, q) => new Blob([new Uint8Array(Math.floor(w * h * q * 0.5))]);

// Within limit, or not a photo: returned untouched (same object).
const small = big("a.jpg", "image/jpeg", 1000);
assert.equal(await shrinkImageToFit(small, MAX, { decode, encode }), small);
const pdf = big("a.pdf", "application/pdf");
assert.equal(await shrinkImageToFit(pdf, MAX, { decode, encode }), pdf);
const doc = big("a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
assert.equal(await shrinkImageToFit(doc, MAX, { decode, encode }), doc);

// Oversized JPG/PNG: shrunk under 90% of the limit, saved as .jpg / image/jpeg.
for (const [name, type] of [["id.jpg", "image/jpeg"], ["id.JPEG", "image/jpeg"], ["id.png", "image/png"]]) {
  const out = await shrinkImageToFit(big(name, type), MAX, { decode, encode });
  assert.ok(out.size <= MAX * 0.9, `${name} fits`);
  assert.equal(out.type, "image/jpeg");
  assert.match(out.name, /\.jpg$/);
}

// Cannot shrink enough, or decoding fails: original returned so normal validation reports it.
const huge = big("x.jpg", "image/jpeg");
assert.equal(await shrinkImageToFit(huge, MAX, { decode, encode: async () => new Blob([new Uint8Array(MAX * 2)]) }), huge);
assert.equal(await shrinkImageToFit(huge, MAX, { decode: async () => { throw new Error("bad"); }, encode }), huge);

console.log("compressImage: all checks passed");
