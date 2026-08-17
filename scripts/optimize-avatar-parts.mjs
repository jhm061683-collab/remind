/**
 * 아바타 파츠 최적화
 * - 흰/검정 배경 → 투명
 * - 목걸이/펜던트/목도리: 목 뒤로 가는 부분 제거
 * - 여백 크롭
 *
 * node scripts/optimize-avatar-parts.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PARTS = path.resolve("public/avatars/parts");
const ASSETS = path.resolve(
  "C:/Users/Galaxy/.cursor/projects/c-Users-Galaxy-Projects-wrong-note-app/assets",
);

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

async function toTransparentRaw(filePath) {
  const { data, info } = await sharp(filePath)
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
    if (shouldKnockout(r, g, b, a)) {
      out[i + 3] = 0;
    } else {
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

function opaqueBounds(out, width, height, channels) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (out[idx + 3] > 16) {
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

async function saveCropped(out, width, height, channels, bounds, dest, pad = 6) {
  let { minX, minY, maxX, maxY } = bounds;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  await sharp(out, { raw: { width, height, channels } })
    .extract({
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .png()
    .toFile(dest);
  return {
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

/** 바운딩 기준 윗부분(목 뒤) 알파 제거 */
function wipeTopOfBounds(out, width, height, channels, bounds, fraction) {
  const span = bounds.maxY - bounds.minY + 1;
  const cutY = bounds.minY + Math.floor(span * fraction);
  for (let y = 0; y < cutY; y++) {
    for (let x = 0; x < width; x++) {
      out[(y * width + x) * channels + 3] = 0;
    }
  }
}

/** 상단 중앙의 작은 고리/체인 스텁만 제거 (하트 베일 등) */
function wipeTopCenterStub(out, width, height, channels, bounds, {
  heightFrac = 0.12,
  widthFrac = 0.28,
} = {}) {
  const spanH = bounds.maxY - bounds.minY + 1;
  const spanW = bounds.maxX - bounds.minX + 1;
  const cutH = Math.floor(spanH * heightFrac);
  const cutW = Math.floor(spanW * widthFrac);
  const cx = Math.floor((bounds.minX + bounds.maxX) / 2);
  const y0 = bounds.minY;
  const y1 = bounds.minY + cutH;
  const x0 = cx - Math.floor(cutW / 2);
  const x1 = cx + Math.ceil(cutW / 2);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      out[(y * width + x) * channels + 3] = 0;
    }
  }
}

async function processCleanPendant(srcName, destName, opts = {}) {
  const src = path.join(ASSETS, srcName);
  const dest = path.join(PARTS, destName);
  if (!fs.existsSync(src)) {
    console.log("missing", srcName);
    return;
  }
  const { out, width, height, channels } = await toTransparentRaw(src);
  let bounds = opaqueBounds(out, width, height, channels);
  if (!bounds) {
    console.log("empty", destName);
    return;
  }
  if (opts.wipeTopFrac) {
    wipeTopOfBounds(out, width, height, channels, bounds, opts.wipeTopFrac);
  }
  if (opts.wipeStub) {
    wipeTopCenterStub(out, width, height, channels, bounds, opts.wipeStub);
  }
  bounds = opaqueBounds(out, width, height, channels);
  if (!bounds) {
    console.log("empty after wipe", destName);
    return;
  }
  const size = await saveCropped(out, width, height, channels, bounds, dest);
  console.log("pendant", destName, size);
}

async function refreshOtherParts() {
  const files = fs.readdirSync(PARTS).filter((f) => f.endsWith(".png"));
  const skip = new Set([
    "part-acc-star.png",
    "part-acc-heart.png",
    "part-acc-scarf.png",
  ]);
  for (const f of files) {
    if (skip.has(f)) continue;
    const fp = path.join(PARTS, f);
    const { out, width, height, channels } = await toTransparentRaw(fp);
    const bounds = opaqueBounds(out, width, height, channels);
    if (!bounds) continue;
    await saveCropped(out, width, height, channels, bounds, fp, 4);
    console.log("refresh", f);
  }
}

/** 미리보기 합성 — 자체 QA용 (assets에만 저장) */
async function writeQaSheet() {
  const animals = ["bear", "bunny", "fox", "raccoon"];
  const combos = [
    { hat: "ballcap", glasses: "sun", acc: "scarf" },
    { hat: "ribbon", glasses: "round", acc: "star" },
    { hat: "crown", glasses: "hiphop", acc: "heart" },
    { hat: "beanie", glasses: "none", acc: "bow" },
  ];
  const cell = 280;
  const cols = 4;
  const rows = animals.length;
  const canvas = sharp({
    create: {
      width: cell * cols,
      height: cell * rows,
      channels: 4,
      background: { r: 245, g: 240, b: 248, alpha: 1 },
    },
  });

  const composites = [];
  for (let r = 0; r < animals.length; r++) {
    const animal = animals[r];
    for (let c = 0; c < cols; c++) {
      const combo = combos[c];
      const layers = [];
      const base = path.resolve(`public/avatars/animals/${animal}.png`);
      layers.push({
        input: await sharp(base).resize(cell, cell, { fit: "cover" }).png().toBuffer(),
        left: c * cell,
        top: r * cell,
      });

      const place = async (src, box) => {
        if (!src || !fs.existsSync(src)) return;
        const w = Math.round((box.width / 100) * cell);
        const h = Math.round((box.height / 100) * cell);
        const left = Math.round((box.left / 100) * cell) + c * cell;
        const top = Math.round((box.top / 100) * cell) + r * cell;
        const buf = await sharp(src)
          .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer();
        layers.push({ input: buf, left, top });
      };

      const hatMap = {
        ribbon: "part-hat-ribbon.png",
        crown: "part-hat-crown.png",
        beanie: "part-hat-beanie.png",
        ballcap: "part-hat-ballcap.png",
      };
      const glassMap = {
        sun: "part-glasses-sun.png",
        round: "part-glasses-round.png",
        hiphop: "part-glasses-hiphop.png",
      };
      const accMap = {
        scarf: "part-acc-scarf.png",
        star: "part-acc-star.png",
        heart: "part-acc-heart.png",
        bow: "part-acc-bow.png",
      };

      const isBunny = animal === "bunny";
      const hatBoxes = {
        ribbon: isBunny
          ? { left: 35, top: 24, width: 30, height: 24 }
          : { left: 33, top: 3, width: 34, height: 28 },
        crown: isBunny
          ? { left: 26, top: 18, width: 48, height: 24 }
          : { left: 22, top: 0, width: 56, height: 28 },
        beanie: isBunny
          ? { left: 16, top: 18, width: 68 * 0.76, height: 32 * 0.76 }
          : { left: 16, top: -1, width: 68, height: 32 },
        ballcap: isBunny
          ? { left: 16, top: 18, width: 68 * 0.76, height: 33 * 0.76 }
          : { left: 16, top: 1, width: 68, height: 33 },
      };
      const eyeTop = isBunny ? 53 : 45;
      const glassBox = { left: 12, top: eyeTop, width: 76, height: 23 };
      const neckTop = isBunny ? 88 : 87;
      const accBoxes = {
        scarf: { left: 21, top: neckTop - 1, width: 58, height: 28 },
        star: { left: 38, top: neckTop + 2, width: 24, height: 18 },
        heart: { left: 39, top: neckTop + 2, width: 22, height: 18 },
        bow: { left: 32, top: neckTop + 1, width: 36, height: 16 },
      };

      if (combo.acc !== "none") {
        await place(path.join(PARTS, accMap[combo.acc]), accBoxes[combo.acc]);
      }
      if (combo.glasses !== "none") {
        await place(path.join(PARTS, glassMap[combo.glasses]), glassBox);
      }
      if (combo.hat !== "none") {
        await place(path.join(PARTS, hatMap[combo.hat]), hatBoxes[combo.hat]);
      }
      composites.push(...layers);
    }
  }

  const outPath = path.join(ASSETS, "avatar-qa-final.png");
  await canvas.composite(composites).png().toFile(outPath);
  console.log("qa sheet", outPath);
}

await processCleanPendant("part-acc-star-clean.png", "part-acc-star.png");
await processCleanPendant("part-acc-heart-clean.png", "part-acc-heart.png");
await processCleanPendant("part-acc-scarf-front.png", "part-acc-scarf.png", {
  // 윗 고리(목 뒤) 제거 — 앞 매듭+드리움만
  wipeTopFrac: 0.34,
});
await refreshOtherParts();
await writeQaSheet();
console.log("optimize done");
