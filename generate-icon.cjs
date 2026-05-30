// Generate a simple tray icon (32x32 PNG with a bear face)
const fs = require('fs');
const path = require('path');

// Simple 32x32 RGBA PNG - orange circle with bear face
// Using a minimal PNG generator
function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
      }
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBuf = Buffer.from(type);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const combined = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(combined));
    return Buffer.concat([lenBuf, combined, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT - raw pixel data with filter bytes
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rawData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  // IEND
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    iend,
  ]);
}

const SIZE = 32;
const pixels = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    const cx = x - SIZE / 2;
    const cy = y - SIZE / 2;
    const dist = Math.sqrt(cx * cx + cy * cy);

    if (dist < 14) {
      // Orange circle (bear face)
      pixels[idx] = 255;     // R
      pixels[idx + 1] = 155; // G
      pixels[idx + 2] = 80;  // B
      pixels[idx + 3] = 255; // A

      // Eyes
      if ((Math.abs(cx + 4) < 2 && Math.abs(cy - 1) < 2) ||
          (Math.abs(cx - 4) < 2 && Math.abs(cy - 1) < 2)) {
        pixels[idx] = 92;
        pixels[idx + 1] = 64;
        pixels[idx + 2] = 51;
      }

      // Nose
      if (Math.abs(cx) < 2 && Math.abs(cy + 3) < 1.5) {
        pixels[idx] = 92;
        pixels[idx + 1] = 64;
        pixels[idx + 2] = 51;
      }

      // Ears
    } else if (dist < 17 && (
      (Math.abs(cx + 9) < 4 && Math.abs(cy + 9) < 4) ||
      (Math.abs(cx - 9) < 4 && Math.abs(cy + 9) < 4)
    )) {
      pixels[idx] = 212;
      pixels[idx + 1] = 165;
      pixels[idx + 2] = 106;
      pixels[idx + 3] = 255;
    } else {
      pixels[idx + 3] = 0; // Transparent
    }
  }
}

const png = createPNG(SIZE, SIZE, pixels);
const outPath = path.join(__dirname, 'src-tauri', 'icons', 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Icon generated:', outPath);
