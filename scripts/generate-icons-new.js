#!/usr/bin/env node
/**
 * Generate Maskit icons from a programmatic design.
 * Creates icon16.png, icon48.png, icon128.png
 * Uses pure Node.js canvas drawing (no external dependencies).
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "icons");

// Simple PNG generator (1-bit alpha, RGB)
function createPNG(width, height, drawFn) {
    const pixels = new Uint8Array(width * height * 4);
    drawFn(pixels, width, height);

    // PNG encoding
    const raw = [];
    for (let y = 0; y < height; y++) {
        raw.push(0); // filter: none
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
        }
    }

    const rawBuf = Buffer.from(raw);
    const deflated = zlibDeflate(rawBuf);

    // Build PNG file
    const chunks = [];
    // Signature
    chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    // IHDR
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    chunks.push(makeChunk("IHDR", ihdr));
    // IDAT
    chunks.push(makeChunk("IDAT", deflated));
    // IEND
    chunks.push(makeChunk("IEND", Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcData = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcData);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let j = 0; j < 8; j++) {
            c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
        }
    }
    return (c ^ 0xffffffff) >>> 0;
}

function zlibDeflate(data) {
    // Simple store-only deflate (no compression, but valid)
    const blocks = [];
    let pos = 0;
    while (pos < data.length) {
        const remaining = data.length - pos;
        const blockLen = Math.min(remaining, 65535);
        const isLast = pos + blockLen >= data.length;
        const header = Buffer.alloc(5);
        header[0] = isLast ? 1 : 0;
        header.writeUInt16LE(blockLen, 1);
        header.writeUInt16LE(blockLen ^ 0xffff, 3);
        blocks.push(header);
        blocks.push(data.slice(pos, pos + blockLen));
        pos += blockLen;
    }
    const deflated = Buffer.concat(blocks);

    // Adler32 checksum
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
        a = (a + data[i]) % 65521;
        b = (b + a) % 65521;
    }
    const adler = ((b << 16) | a) >>> 0;
    const adlerBuf = Buffer.alloc(4);
    adlerBuf.writeUInt32BE(adler, 0);

    // Zlib wrapper: CMF=0x78, FLG=0x01
    return Buffer.concat([Buffer.from([0x78, 0x01]), deflated, adlerBuf]);
}

// ── Draw Maskit icon ─────────────────────────────────────────────────────

function drawMaskitIcon(pixels, w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const r = w * 0.42;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Shield shape: circle top, pointed bottom
            const angle = Math.atan2(dy, dx);
            let inShield = false;

            if (dy < r * 0.1) {
                // Top half: circle
                inShield = dist <= r;
            } else {
                // Bottom half: tapers to point
                const t = (dy - r * 0.1) / (r * 0.9);
                const widthAtY = r * (1 - t * 0.85);
                if (Math.abs(dx) <= widthAtY && dy <= r * 1.05) {
                    inShield = true;
                }
            }

            if (inShield) {
                // Green gradient
                const t = (dy + r) / (r * 2);
                const gr = Math.round(0 + t * 0);
                const gg = Math.round(217 - t * 5);
                const gb = Math.round(167 - t * 15);

                // Lock shape in center
                const lockW = r * 0.45;
                const lockH = r * 0.35;
                const lockX = cx;
                const lockY = cy + r * 0.05;

                const inLockBody = Math.abs(dx) <= lockW / 2 && dy >= lockY && dy <= lockY + lockH;
                const lockRadius = lockW * 0.6;
                const inLockArc = dx * dx + (dy - lockY) * (dy - lockY) <= lockRadius * lockRadius && dy < lockY;

                if (inLockBody || inLockArc) {
                    // White lock
                    pixels[i] = 255;
                    pixels[i + 1] = 255;
                    pixels[i + 2] = 255;
                    pixels[i + 3] = 255;
                } else {
                    // Green shield
                    pixels[i] = gr;
                    pixels[i + 1] = gg;
                    pixels[i + 2] = gb;
                    pixels[i + 3] = 255;
                }
            } else {
                // Transparent
                pixels[i] = 0;
                pixels[i + 1] = 0;
                pixels[i + 2] = 0;
                pixels[i + 3] = 0;
            }
        }
    }
}

// ── Generate icons ───────────────────────────────────────────────────────

console.log("Generating Maskit icons...");

const sizes = [16, 48, 128];
sizes.forEach((size) => {
    const png = createPNG(size, size, drawMaskitIcon);
    const outPath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`  ${outPath} (${png.length} bytes)`);
});

console.log("Done!");