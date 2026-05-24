/**
 * buildQrCodeSvg — generates a scannable QR code SVG string.
 *
 * Pure-JavaScript, no React dependency. Fixes the original generator which
 * hardcoded mask pattern 0. The QR spec (ISO 18004) requires trying all 8
 * mask patterns, scoring each with the four penalty rules, and choosing the
 * lowest-penalty result. Skipping this step corrupts the data region and
 * makes the code unreadable by phone cameras.
 *
 * Encoding: Version 5, Error Correction Level L (108 data codewords, 26 EC).
 * Maximum URL length: 106 bytes (~106 ASCII characters).
 *
 * @param {string} text        URL or text to encode.
 * @param {object} [options]
 * @param {number} [options.cellSize=5]   Pixels per module.
 * @param {number} [options.quietZone=4]  Quiet-zone width in modules.
 * @param {string} [options.foreground]   Dark module colour.
 * @param {string} [options.background]   Light module colour.
 * @returns {string} SVG element string.
 */

// ─── QR constants (Version 5-L) ──────────────────────────────────────────────
const MODULE_COUNT    = 37;
const DATA_CODEWORDS  = 108;
const MAX_BYTE_LENGTH = 106;
const ERROR_CODEWORDS = 26;
const PAD_BYTES       = [0xec, 0x11];
const ALIGNMENT_POSITIONS = [6, 30];

// ─── Matrix helpers ───────────────────────────────────────────────────────────
function createMatrix() {
  return Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(false));
}

function createFunctionMask() {
  return Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(false));
}

function setFunctionModule(modules, functionMask, row, col, dark) {
  if (row < 0 || col < 0 || row >= MODULE_COUNT || col >= MODULE_COUNT) return;
  modules[row][col] = dark;
  functionMask[row][col] = true;
}

// ─── Function patterns ───────────────────────────────────────────────────────
function setupFinder(modules, functionMask, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const cr = row + r, cc = col + c;
      if (cr < 0 || cc < 0 || cr >= MODULE_COUNT || cc >= MODULE_COUNT) continue;
      const onBorder = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const onCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setFunctionModule(modules, functionMask, cr, cc, onBorder || onCenter);
    }
  }
}

function setupTiming(modules, functionMask) {
  for (let i = 8; i < MODULE_COUNT - 8; i += 1) {
    setFunctionModule(modules, functionMask, 6, i, i % 2 === 0);
    setFunctionModule(modules, functionMask, i, 6, i % 2 === 0);
  }
}

function setupAlignment(modules, functionMask, centerRow, centerCol) {
  for (let r = -2; r <= 2; r += 1) {
    for (let c = -2; c <= 2; c += 1) {
      const dist = Math.max(Math.abs(r), Math.abs(c));
      setFunctionModule(modules, functionMask, centerRow + r, centerCol + c, dist !== 1);
    }
  }
}

function setupFunctionPatterns(modules, functionMask) {
  setupFinder(modules, functionMask, 0, 0);
  setupFinder(modules, functionMask, MODULE_COUNT - 7, 0);
  setupFinder(modules, functionMask, 0, MODULE_COUNT - 7);
  setupTiming(modules, functionMask);

  for (const row of ALIGNMENT_POSITIONS) {
    for (const col of ALIGNMENT_POSITIONS) {
      const overlapsFinder =
        (row === 6 && col === 6) ||
        (row === 6 && col === MODULE_COUNT - 7) ||
        (row === MODULE_COUNT - 7 && col === 6);
      if (!overlapsFinder) setupAlignment(modules, functionMask, row, col);
    }
  }

  // Dark module
  setFunctionModule(modules, functionMask, MODULE_COUNT - 8, 8, true);

  // Format info placeholders (set false; overwritten by setupTypeInfo)
  for (let i = 0; i < 8; i += 1) {
    if (i !== 6) {
      setFunctionModule(modules, functionMask, 8, i, false);
      setFunctionModule(modules, functionMask, i, 8, false);
    }
  }
  for (let i = 0; i < 7; i += 1) {
    setFunctionModule(modules, functionMask, MODULE_COUNT - 1 - i, 8, false);
    setFunctionModule(modules, functionMask, 8, MODULE_COUNT - 1 - i, false);
  }
}

// ─── Format information (BCH error-protected) ────────────────────────────────
function getBchDigit(value) {
  let digit = 0;
  let cur = value;
  while (cur !== 0) { digit += 1; cur >>>= 1; }
  return digit;
}

function getBchTypeInfo(data) {
  let cur = data << 10;
  const gen = 0x537;
  while (getBchDigit(cur) - getBchDigit(gen) >= 0) {
    cur ^= gen << (getBchDigit(cur) - getBchDigit(gen));
  }
  return ((data << 10) | cur) ^ 0x5412;
}

function setupTypeInfo(modules, functionMask, maskPattern) {
  // ECL = L (01 binary = 1), so format data = (1 << 3) | maskPattern
  const typeInfo = getBchTypeInfo((1 << 3) | maskPattern);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((typeInfo >> i) & 1) === 1;
    // Vertical strip (column 8)
    if (i < 6)      setFunctionModule(modules, functionMask, i,     8, dark);
    else if (i < 8) setFunctionModule(modules, functionMask, i + 1, 8, dark);
    else             setFunctionModule(modules, functionMask, MODULE_COUNT - 15 + i, 8, dark);
    // Horizontal strip (row 8)
    if (i < 8)      setFunctionModule(modules, functionMask, 8, MODULE_COUNT - i - 1, dark);
    else if (i < 9) setFunctionModule(modules, functionMask, 8, 15 - i, dark);
    else             setFunctionModule(modules, functionMask, 8, 15 - i - 1, dark);
  }
}

// ─── Data encoding ───────────────────────────────────────────────────────────
function appendBits(target, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) target.push((value >>> i) & 1);
}

function buildDataCodewords(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > MAX_BYTE_LENGTH) {
    throw new Error(`QR: URL too long (${bytes.length} bytes, max ${MAX_BYTE_LENGTH})`);
  }
  const bits = [];
  appendBits(bits, 0b0100, 4);          // byte mode indicator
  appendBits(bits, bytes.length, 8);    // character count
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) bits.push(0);                  // bit padding

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
    codewords.push(v);
  }
  let padIdx = 0;
  while (codewords.length < DATA_CODEWORDS) { codewords.push(PAD_BYTES[padIdx % 2]); padIdx += 1; }
  return codewords;
}

// ─── Reed-Solomon error correction ───────────────────────────────────────────
function buildGaloisTables() {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value; log[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = buildGaloisTables();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function buildGeneratorPolynomial(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j]     ^= poly[j];
      next[j + 1] ^= gfMultiply(poly[j], GF.exp[i]);
    }
    poly = next;
  }
  return poly;
}

const GENERATOR = buildGeneratorPolynomial(ERROR_CODEWORDS);

function buildErrorCorrection(dataCodewords) {
  const buf = dataCodewords.concat(new Array(ERROR_CODEWORDS).fill(0));
  for (let i = 0; i < dataCodewords.length; i += 1) {
    const factor = buf[i];
    if (factor === 0) continue;
    for (let j = 0; j < GENERATOR.length; j += 1) {
      buf[i + j] ^= gfMultiply(GENERATOR[j], factor);
    }
  }
  return buf.slice(buf.length - ERROR_CODEWORDS);
}

function buildFinalCodewords(text) {
  const dw = buildDataCodewords(text);
  return dw.concat(buildErrorCorrection(dw));
}

// ─── Codeword placement (no mask applied here) ────────────────────────────────
function placeCodewords(modules, functionMask, codewords) {
  let row = MODULE_COUNT - 1;
  let column = MODULE_COUNT - 1;
  let direction = -1;
  let byteIndex = 0;
  let bitIndex = 7;

  while (column > 0) {
    if (column === 6) column -= 1;

    while (true) {
      for (let offset = 0; offset < 2; offset += 1) {
        const currentCol = column - offset;
        if (functionMask[row][currentCol]) continue;

        let dark = false;
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
        }
        modules[row][currentCol] = dark; // raw bit, mask applied separately

        bitIndex -= 1;
        if (bitIndex < 0) { byteIndex += 1; bitIndex = 7; }
      }

      row += direction;
      if (row < 0 || row >= MODULE_COUNT) {
        row -= direction;
        direction = -direction;
        break;
      }
    }

    column -= 2;
  }
}

// ─── All 8 mask patterns (ISO 18004 §7.8.2) ──────────────────────────────────
function maskBit(pattern, row, col) {
  switch (pattern) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return (row * col) % 2 + (row * col) % 3 === 0;
    case 6: return ((row * col) % 2 + (row * col) % 3) % 2 === 0;
    case 7: return ((row + col) % 2 + (row * col) % 3) % 2 === 0;
    default: return false;
  }
}

// Toggle mask over data cells only (function cells are excluded via functionMask)
function applyDataMask(modules, functionMask, pattern) {
  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      if (!functionMask[row][col] && maskBit(pattern, row, col)) {
        modules[row][col] = !modules[row][col];
      }
    }
  }
}

// ─── Penalty scoring (ISO 18004 §7.8.3) ──────────────────────────────────────
const FINDER_PATTERN_A = [true,false,true,true,true,false,true,false,false,false,false];
const FINDER_PATTERN_B = [false,false,false,false,true,false,true,true,true,false,true];

function getPenaltyScore(modules) {
  let penalty = 0;
  const N = MODULE_COUNT;

  // Rule 1: runs of 5+ same-color in rows and columns
  for (let row = 0; row < N; row += 1) {
    let runLen = 1;
    for (let col = 1; col < N; col += 1) {
      if (modules[row][col] === modules[row][col - 1]) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else { runLen = 1; }
    }
  }
  for (let col = 0; col < N; col += 1) {
    let runLen = 1;
    for (let row = 1; row < N; row += 1) {
      if (modules[row][col] === modules[row - 1][col]) {
        runLen += 1;
        if (runLen === 5) penalty += 3;
        else if (runLen > 5) penalty += 1;
      } else { runLen = 1; }
    }
  }

  // Rule 2: 2×2 blocks of same colour
  for (let row = 0; row < N - 1; row += 1) {
    for (let col = 0; col < N - 1; col += 1) {
      const c = modules[row][col];
      if (c === modules[row][col + 1] &&
          c === modules[row + 1][col] &&
          c === modules[row + 1][col + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 3: finder-like patterns (horizontal and vertical)
  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col <= N - 11; col += 1) {
      let matchA = true, matchB = true;
      for (let k = 0; k < 11; k += 1) {
        if (modules[row][col + k] !== FINDER_PATTERN_A[k]) matchA = false;
        if (modules[row][col + k] !== FINDER_PATTERN_B[k]) matchB = false;
      }
      if (matchA || matchB) penalty += 40;
    }
  }
  for (let col = 0; col < N; col += 1) {
    for (let row = 0; row <= N - 11; row += 1) {
      let matchA = true, matchB = true;
      for (let k = 0; k < 11; k += 1) {
        if (modules[row + k][col] !== FINDER_PATTERN_A[k]) matchA = false;
        if (modules[row + k][col] !== FINDER_PATTERN_B[k]) matchB = false;
      }
      if (matchA || matchB) penalty += 40;
    }
  }

  // Rule 4: dark module ratio
  let darkCount = 0;
  for (let row = 0; row < N; row += 1) {
    for (let col = 0; col < N; col += 1) {
      if (modules[row][col]) darkCount += 1;
    }
  }
  const percent = (100 * darkCount) / (N * N);
  penalty += 10 * Math.floor(Math.abs(percent - 50) / 5);

  return penalty;
}

// ─── Matrix builder — tries all 8 masks, picks the best ──────────────────────
function buildQrMatrix(text) {
  const modules      = createMatrix();
  const functionMask = createFunctionMask();

  setupFunctionPatterns(modules, functionMask);
  placeCodewords(modules, functionMask, buildFinalCodewords(text));

  let bestMask    = 0;
  let bestPenalty = Infinity;

  for (let mask = 0; mask < 8; mask += 1) {
    applyDataMask(modules, functionMask, mask);
    const penalty = getPenaltyScore(modules);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask    = mask;
    }
    applyDataMask(modules, functionMask, mask); // undo (XOR is its own inverse)
  }

  applyDataMask(modules, functionMask, bestMask);
  setupTypeInfo(modules, functionMask, bestMask);
  return modules;
}

// ─── Public API ──────────────────────────────────────────────────────────────
export function buildQrCodeSvg(text, options = {}) {
  if (!text) return '';

  const cellSize  = options.cellSize  ?? 5;
  const quietZone = options.quietZone ?? 4;
  const foreground = options.foreground ?? '#213128';
  const background = options.background ?? '#ffffff';

  const modules   = buildQrMatrix(text);
  const imageSize = (MODULE_COUNT + quietZone * 2) * cellSize;

  // Efficient horizontal run-length SVG paths (same approach as qrcode.react)
  const ops = [];
  for (let row = 0; row < MODULE_COUNT; row += 1) {
    let start = null;
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      if (!modules[row][col] && start !== null) {
        const x = (start + quietZone) * cellSize;
        const y = (row   + quietZone) * cellSize;
        const w = (col - start) * cellSize;
        ops.push(`M${x},${y}h${w}v${cellSize}H${x}z`);
        start = null;
      } else if (modules[row][col] && start === null) {
        start = col;
      }
    }
    if (start !== null) {
      const x = (start + quietZone) * cellSize;
      const y = (row   + quietZone) * cellSize;
      const w = (MODULE_COUNT - start) * cellSize;
      ops.push(`M${x},${y}h${w}v${cellSize}H${x}z`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageSize} ${imageSize}" width="${imageSize}" height="${imageSize}" role="img" aria-label="QR code" style="display:block;max-width:100%;height:auto;"><rect width="${imageSize}" height="${imageSize}" fill="${background}"/><path d="${ops.join('')}" fill="${foreground}"/></svg>`;
}
