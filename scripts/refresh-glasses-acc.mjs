/**
 * 안경·악세사리 신규 에셋 → public 투명 PNG
 * node scripts/refresh-glasses-acc.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ASSETS =
  "C:/Users/Galaxy/.cursor/projects/c-Users-Galaxy-Projects-wrong-note-app/assets";
const PARTS = path.resolve("public/avatars/parts");

function shouldKnockout(r, g, b, a) {
  if (a < 8) return true;
  if (r < 18 && g < 18 && b < 18) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (r + g + b) / 3;
  if (max >= 230 && sat < 0.14) return true;
  if (lum >= 210 && sat < 0.1) return true;
  if (lum >= 195 && sat < 0.07) return true;
  return false;
}

async function toRaw(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    if (shouldKnockout(r, g, b, a)) out[i + 3] = 0;
    else {
      const lum = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (lum > 175 && sat < 0.2 && a > 0) {
        out[i + 3] = Math.round(a * Math.max(0.2, (215 - lum) / 40));
      }
    }
  }
  return { out, width, height, channels };
}

function bounds(out, w, h, c) {
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (out[(y * w + x) * c + 3] > 16) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  return { minX, minY, maxX, maxY };
}

async function save(out, w, h, c, b, dest, pad = 6) {
  let { minX, minY, maxX, maxY } = b;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  await sharp(out, { raw: { width: w, height: h, channels: c } })
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png({ compressionLevel: 9 })
    .toFile(dest);
  console.log(path.basename(dest), maxX - minX + 1, "x", maxY - minY + 1);
}

async function process(srcName, destName, opts = {}) {
  const src = path.join(ASSETS, srcName);
  if (!fs.existsSync(src)) {
    console.log("missing", srcName);
    return;
  }
  const { out, width, height, channels } = await toRaw(src);
  let b = bounds(out, width, height, channels);
  if (!b) return;

  if (opts.wipeTopFrac) {
    const cut = b.minY + Math.floor((b.maxY - b.minY + 1) * opts.wipeTopFrac);
    for (let y = 0; y < cut; y++) {
      for (let x = 0; x < width; x++) out[(y * width + x) * channels + 3] = 0;
    }
    b = bounds(out, width, height, channels);
  }

  // 펜던트 상단 고리/베일 제거
  if (opts.wipeTopStub) {
    const spanH = b.maxY - b.minY + 1;
    const spanW = b.maxX - b.minX + 1;
    const cutH = Math.floor(spanH * (opts.wipeTopStub.h ?? 0.12));
    const cutW = Math.floor(spanW * (opts.wipeTopStub.w ?? 0.28));
    const cx = Math.floor((b.minX + b.maxX) / 2);
    for (let y = b.minY; y < b.minY + cutH; y++) {
      for (let x = cx - Math.floor(cutW / 2); x < cx + Math.ceil(cutW / 2); x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          out[(y * width + x) * channels + 3] = 0;
        }
      }
    }
    b = bounds(out, width, height, channels);
  }

  // 안경: 혹시 남은 좌우 다리 제거
  if (opts.cropTemples) {
    const span = b.maxX - b.minX + 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels;
        if (out[i + 3] < 8) continue;
        const nx = (x - b.minX) / span;
        const ny = (y - b.minY) / (b.maxY - b.minY + 1);
        if (nx < 0.06 || nx > 0.94) out[i + 3] = 0;
        if (ny < 0.35 && (nx < 0.12 || nx > 0.88)) out[i + 3] = 0;
      }
    }
    b = bounds(out, width, height, channels);
  }

  if (!b) return;
  await save(out, width, height, channels, b, path.join(PARTS, destName));
}

await process("part-glasses-round-new.png", "part-glasses-round.png", {
  cropTemples: true,
});
await process("part-glasses-sun-new.png", "part-glasses-sun.png", {
  cropTemples: true,
});
await process("part-glasses-heart-new.png", "part-glasses-heart.png", {
  cropTemples: true,
});
await process("part-glasses-smart-new.png", "part-glasses-smart.png", {
  cropTemples: true,
});
await process("part-glasses-hiphop-new.png", "part-glasses-hiphop.png", {
  cropTemples: true,
});

await process("part-acc-bow-new.png", "part-acc-bow.png");
await process("part-acc-scarf-new.png", "part-acc-scarf.png", {
  wipeTopFrac: 0.34,
});
await process("part-acc-star-new.png", "part-acc-star.png", {
  wipeTopStub: { h: 0.14, w: 0.22 },
});
await process("part-acc-heart-new.png", "part-acc-heart.png", {
  wipeTopStub: { h: 0.16, w: 0.24 },
});
await process("part-acc-blush-new.png", "part-acc-blush.png");

console.log("refresh done");
