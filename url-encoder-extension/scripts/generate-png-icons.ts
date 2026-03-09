import fs from "fs";
import path from "path";

function crc32(buf: Buffer): number {
  let crc = -1;
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[i] = c;
    }
    return t;
  })();
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function writeUint32BE(buf: Buffer, offset: number, value: number): void {
  buf[offset] = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>> 8) & 0xff;
  buf[offset + 3] = value & 0xff;
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  writeUint32BE(length, 0, data.length);
  const crcBuf = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  writeUint32BE(crc, 0, crc32(crcBuf));
  return Buffer.concat([length, typeBytes, data, crc]);
}

function adler32(data: Buffer): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < data.length; i++) {
    s1 = (s1 + data[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

function deflateStore(data: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < data.length) {
    const blockSize = Math.min(65535, data.length - offset);
    const isLast = offset + blockSize >= data.length;
    const block = Buffer.alloc(5 + blockSize);
    block[0] = isLast ? 1 : 0;
    block[1] = blockSize & 0xff;
    block[2] = (blockSize >> 8) & 0xff;
    block[3] = ~blockSize & 0xff;
    block[4] = (~blockSize >> 8) & 0xff;
    data.copy(block, 5, offset, offset + blockSize);
    chunks.push(block);
    offset += blockSize;
  }

  const combined = Buffer.concat(chunks);
  const zlib = Buffer.alloc(2 + combined.length + 4);
  zlib[0] = 0x78; // CMF
  zlib[1] = 0x01; // FLG
  combined.copy(zlib, 2);
  const a = adler32(data);
  zlib[2 + combined.length] = (a >> 24) & 0xff;
  zlib[2 + combined.length + 1] = (a >> 16) & 0xff;
  zlib[2 + combined.length + 2] = (a >> 8) & 0xff;
  zlib[2 + combined.length + 3] = a & 0xff;
  return zlib;
}

type RGB = [number, number, number];

function createPng(size: number, bgColor: RGB, fgColor: RGB): Buffer {
  const [br, bg, bb] = bgColor;
  const [tr, tg, tb] = fgColor;

  const pixels = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    pixels[i * 4] = br;
    pixels[i * 4 + 1] = bg;
    pixels[i * 4 + 2] = bb;
    pixels[i * 4 + 3] = 255;
  }

  if (size >= 16) {
    const margin = Math.floor(size * 0.2);
    const dotSize = Math.max(2, Math.floor(size * 0.18));

    const drawDot = (cx: number, cy: number): void => {
      for (let dy = -dotSize; dy <= dotSize; dy++) {
        for (let dx = -dotSize; dx <= dotSize; dx++) {
          if (dx * dx + dy * dy <= dotSize * dotSize) {
            const px = cx + dx;
            const py = cy + dy;
            if (px >= 0 && px < size && py >= 0 && py < size) {
              const idx = (py * size + px) * 4;
              pixels[idx] = tr;
              pixels[idx + 1] = tg;
              pixels[idx + 2] = tb;
            }
          }
        }
      }
    };

    drawDot(margin + dotSize, margin + dotSize);
    drawDot(size - margin - dotSize, size - margin - dotSize);

    const lineWidth = Math.max(1, Math.floor(size * 0.08));
    for (let i = 0; i < size; i++) {
      const x = Math.floor(margin + (i / size) * (size - 2 * margin));
      const y = size - 1 - Math.floor(margin + (i / size) * (size - 2 * margin));
      for (let lw = -lineWidth; lw <= lineWidth; lw++) {
        const px = x + lw;
        if (px >= 0 && px < size && y >= 0 && y < size) {
          const idx = (y * size + px) * 4;
          pixels[idx] = tr;
          pixels[idx + 1] = tg;
          pixels[idx + 2] = tb;
        }
      }
    }
  }

  const scanlines = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    scanlines[y * (1 + size * 4)] = 0;
    pixels.copy(scanlines, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  writeUint32BE(ihdr, 0, size);
  writeUint32BE(ihdr, 4, size);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const compressed = deflateStore(scanlines);

  return Buffer.concat([
    pngSignature,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", compressed),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

const iconsDir = path.join(__dirname, "..", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const distIconsDir = path.join(__dirname, "..", "dist", "icons");
if (!fs.existsSync(distIconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
}

const bg: RGB = [30, 30, 46];   // #1e1e2e
const fg: RGB = [203, 166, 247]; // #cba6f7

for (const size of [16, 48, 128]) {
  const png = createPng(size, bg, fg);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  fs.writeFileSync(path.join(distIconsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png (${png.length} bytes)`);
}

console.log("Icons generated successfully!");
