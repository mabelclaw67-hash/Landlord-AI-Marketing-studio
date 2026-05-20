const QR_VERSION = 5;
const MODULE_COUNT = 37;
const DATA_CODEWORDS = 108;
const MAX_BYTE_LENGTH = 106;
const ERROR_CODEWORDS = 26;
const PAD_BYTES = [0xec, 0x11];
const ALIGNMENT_POSITIONS = [6, 30];

function createMatrix() {
  return Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(null));
}

function createFunctionMask() {
  return Array.from({ length: MODULE_COUNT }, () => Array(MODULE_COUNT).fill(false));
}

function setFunctionModule(modules, functionMask, row, col, dark) {
  if (row < 0 || col < 0 || row >= MODULE_COUNT || col >= MODULE_COUNT) return;
  modules[row][col] = dark;
  functionMask[row][col] = true;
}

function setupFinder(modules, functionMask, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const currentRow = row + r;
      const currentCol = col + c;
      if (currentRow < 0 || currentCol < 0 || currentRow >= MODULE_COUNT || currentCol >= MODULE_COUNT) {
        continue;
      }

      const onBorder = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const onCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      setFunctionModule(modules, functionMask, currentRow, currentCol, onBorder || onCenter);
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
      const distance = Math.max(Math.abs(r), Math.abs(c));
      setFunctionModule(modules, functionMask, centerRow + r, centerCol + c, distance !== 1);
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

  setFunctionModule(modules, functionMask, MODULE_COUNT - 8, 8, true);

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

function getBchDigit(value) {
  let digit = 0;
  let current = value;
  while (current !== 0) {
    digit += 1;
    current >>>= 1;
  }
  return digit;
}

function getBchTypeInfo(data) {
  let current = data << 10;
  const generator = 0x537;
  while (getBchDigit(current) - getBchDigit(generator) >= 0) {
    current ^= generator << (getBchDigit(current) - getBchDigit(generator));
  }
  return ((data << 10) | current) ^ 0x5412;
}

function setupTypeInfo(modules, functionMask, maskPattern) {
  const typeInfo = getBchTypeInfo((1 << 3) | maskPattern);

  for (let i = 0; i < 15; i += 1) {
    const dark = ((typeInfo >> i) & 1) === 1;

    if (i < 6) setFunctionModule(modules, functionMask, i, 8, dark);
    else if (i < 8) setFunctionModule(modules, functionMask, i + 1, 8, dark);
    else setFunctionModule(modules, functionMask, MODULE_COUNT - 15 + i, 8, dark);

    if (i < 8) setFunctionModule(modules, functionMask, 8, MODULE_COUNT - i - 1, dark);
    else if (i < 9) setFunctionModule(modules, functionMask, 8, 15 - i, dark);
    else setFunctionModule(modules, functionMask, 8, 15 - i - 1, dark);
  }
}

function appendBits(target, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    target.push((value >>> i) & 1);
  }
}

function buildDataCodewords(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length > MAX_BYTE_LENGTH) {
    throw new Error("Listing URL is too long for the built-in QR code generator.");
  }

  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const capacityBits = DATA_CODEWORDS * 8;
  const terminatorLength = Math.min(4, capacityBits - bits.length);
  appendBits(bits, 0, terminatorLength);

  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | bits[i + j];
    }
    codewords.push(value);
  }

  let padIndex = 0;
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(PAD_BYTES[padIndex % 2]);
    padIndex += 1;
  }
  return codewords;
}

function buildGaloisTables() {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let value = 1;

  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }

  for (let i = 255; i < 512; i += 1) {
    exp[i] = exp[i - 255];
  }

  return { exp, log };
}

const GF = buildGaloisTables();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function buildGeneratorPolynomial(degree) {
  let polynomial = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j += 1) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= gfMultiply(polynomial[j], GF.exp[i]);
    }
    polynomial = next;
  }
  return polynomial;
}

const GENERATOR = buildGeneratorPolynomial(ERROR_CODEWORDS);

function buildErrorCorrection(dataCodewords) {
  const buffer = dataCodewords.concat(new Array(ERROR_CODEWORDS).fill(0));

  for (let i = 0; i < dataCodewords.length; i += 1) {
    const factor = buffer[i];
    if (factor === 0) continue;
    for (let j = 0; j < GENERATOR.length; j += 1) {
      buffer[i + j] ^= gfMultiply(GENERATOR[j], factor);
    }
  }

  return buffer.slice(buffer.length - ERROR_CODEWORDS);
}

function buildFinalCodewords(text) {
  const dataCodewords = buildDataCodewords(text);
  return dataCodewords.concat(buildErrorCorrection(dataCodewords));
}

function maskBit(maskPattern, row, col) {
  if (maskPattern === 0) return (row + col) % 2 === 0;
  return false;
}

function placeCodewords(modules, functionMask, codewords, maskPattern) {
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

        if (maskBit(maskPattern, row, currentCol)) dark = !dark;
        modules[row][currentCol] = dark;

        bitIndex -= 1;
        if (bitIndex < 0) {
          byteIndex += 1;
          bitIndex = 7;
        }
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

function buildQrMatrix(text) {
  const modules = createMatrix();
  const functionMask = createFunctionMask();
  setupFunctionPatterns(modules, functionMask);
  placeCodewords(modules, functionMask, buildFinalCodewords(text), 0);
  setupTypeInfo(modules, functionMask, 0);
  return modules;
}

export function buildQrCodeSvg(text, options = {}) {
  const cellSize = options.cellSize || 5;
  const quietZone = options.quietZone || 4;
  const foreground = options.foreground || "#213128";
  const background = options.background || "#ffffff";
  const modules = buildQrMatrix(text);
  const imageSize = (MODULE_COUNT + quietZone * 2) * cellSize;
  const paths = [];

  for (let row = 0; row < MODULE_COUNT; row += 1) {
    for (let col = 0; col < MODULE_COUNT; col += 1) {
      if (!modules[row][col]) continue;
      const x = (col + quietZone) * cellSize;
      const y = (row + quietZone) * cellSize;
      paths.push(`M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imageSize} ${imageSize}" width="${imageSize}" height="${imageSize}" role="img" aria-label="QR code" style="display:block;max-width:100%;height:auto;"><rect width="${imageSize}" height="${imageSize}" fill="${background}"/><path d="${paths.join("")}" fill="${foreground}"/></svg>`;
}
