import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const svg = readFileSync("src/app/icon.svg");

async function renderPng(size) {
  return sharp(svg).resize(size, size).png().toBuffer();
}

// ICO container wrapping a single PNG image (supported since Windows Vista) — no need
// for a multi-resolution legacy BMP-based ICO; every modern consumer of favicon.ico
// accepts a PNG-in-ICO, and icon.svg (Next.js file convention) is what modern browsers
// actually use — favicon.ico is just the legacy/bot fallback.
function buildIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // image data size
  entry.writeUInt32LE(header.length + entry.length, 12); // offset

  return Buffer.concat([header, entry, pngBuffer]);
}

const png512 = await renderPng(512);
const png192 = await renderPng(192);
const png180 = await renderPng(180);
const png32 = await renderPng(32);

writeFileSync("src/app/apple-icon.png", png180);
writeFileSync("public/icon-512.png", png512);
writeFileSync("public/icon-192.png", png192);
writeFileSync("src/app/favicon.ico", buildIco(png32, 32));

console.log("Generated: src/app/apple-icon.png, public/icon-512.png, public/icon-192.png, src/app/favicon.ico");
