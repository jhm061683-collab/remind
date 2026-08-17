/**
 * 품종별 동공 실측 (하이라이트 기반)
 * node scripts/measure-variant-pupils.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = path.resolve("public/avatars/animals");

const VARIANTS = [
  ["fox", "orange"],
  ["fox", "arctic"],
  ["fox", "silver"],
  ["cat", "calico"],
  ["cat", "black"],
  ["cat", "tuxedo"],
  ["puppy", "golden"],
  ["puppy", "shiba"],
  ["puppy", "husky"],
  ["bunny", "white"],
  ["bunny", "brown"],
  ["bunny", "gray"],
  ["bear", "brown"],
  ["bear", "polar"],
  ["bear", "cream"],
  ["panda", "classic"],
  ["panda", "baby"],
  ["panda", "red"],
  ["chick", "yellow"],
  ["chick", "brown"],
  ["chick", "fluffy"],
  ["penguin", "classic"],
  ["penguin", "emperor"],
  ["penguin", "chick"],
  ["otter", "brown"],
  ["otter", "light"],
  ["otter", "belly"],
  ["raccoon", "classic"],
  ["raccoon", "light"],
  ["raccoon", "dark"],
  ["pig", "pink"],
  ["pig", "spotted"],
  ["pig", "blackear"],
  ["hamster", "golden"],
  ["hamster", "white"],
  ["hamster", "gray"],
];

function lum(r, g, b) {
  return (r + g + b) / 3;
}

/** 하이라이트 근처 작은 암점 = 동공 */
function findPupilsBetter(data, width, height, channels) {
  const y0 = Math.floor(height * 0.32);
  const y1 = Math.floor(height * 0.72);
  const x0 = Math.floor(width * 0.15);
  const x1 = Math.floor(width * 0.85);

  const highs = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      if (data[i + 3] < 200) continue;
      const L = lum(data[i], data[i + 1], data[i + 2]);
      if (L >= 210) highs.push({ x, y });
    }
  }
  if (highs.length < 2) return null;

  const pupils = [];
  const rad = Math.max(6, Math.floor(width * 0.035));
  for (const h of highs) {
    let sx = 0,
      sy = 0,
      n = 0,
      minL = 255;
    for (let dy = -rad; dy <= rad; dy++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx * dx + dy * dy > rad * rad) continue;
        const x = h.x + dx;
        const y = h.y + dy;
        if (x < x0 || x >= x1 || y < y0 || y >= y1) continue;
        const i = (y * width + x) * channels;
        if (data[i + 3] < 200) continue;
        const L = lum(data[i], data[i + 1], data[i + 2]);
        if (L < 70) {
          sx += x;
          sy += y;
          n++;
          if (L < minL) minL = L;
        }
      }
    }
    if (n >= 8 && minL < 50) {
      pupils.push({ x: sx / n, y: sy / n, n, minL });
    }
  }
  if (pupils.length < 2) return null;

  const clusters = [];
  for (const p of pupils) {
    let merged = false;
    for (const c of clusters) {
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (dx * dx + dy * dy < (width * 0.04) ** 2) {
        const w = c.n + p.n;
        c.x = (c.x * c.n + p.x * p.n) / w;
        c.y = (c.y * c.n + p.y * p.n) / w;
        c.n = w;
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ ...p });
  }
  clusters.sort((a, b) => b.n - a.n);
  if (clusters.length < 2) return null;

  let best = null;
  let bestScore = -1e9;
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const a = clusters[i];
      const b = clusters[j];
      const left = a.x < b.x ? a : b;
      const right = a.x < b.x ? b : a;
      const ipd = ((right.x - left.x) / width) * 100;
      const dy = (Math.abs(left.y - right.y) / height) * 100;
      const midX = ((left.x + right.x) / 2 / width) * 100;
      if (ipd < 18 || ipd > 40) continue;
      if (dy > 6) continue;
      if (Math.abs(midX - 50) > 12) continue;
      const score =
        left.n +
        right.n -
        dy * 20 -
        Math.abs(midX - 50) * 3 -
        Math.abs(ipd - 28) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = {
          left,
          right,
          ipd,
          pupilY: ((left.y + right.y) / 2 / height) * 100,
        };
      }
    }
  }
  if (!best) return null;
  return {
    pupilY: +best.pupilY.toFixed(1),
    ipd: +best.ipd.toFixed(1),
    leftX: +((best.left.x / width) * 100).toFixed(1),
    rightX: +((best.right.x / width) * 100).toFixed(1),
  };
}

const out = {};
for (const [animal, variant] of VARIANTS) {
  const fp = path.join(DIR, `${animal}-${variant}.png`);
  const { data, info } = await sharp(fp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const p = findPupilsBetter(data, info.width, info.height, info.channels);
  out[`${animal}:${variant}`] = p;
  console.log(
    animal.padEnd(8),
    variant.padEnd(10),
    p
      ? `Y=${String(p.pupilY).padStart(5)} IPD=${String(p.ipd).padStart(5)}`
      : "FAIL",
  );
}

fs.writeFileSync(
  path.resolve("scripts/variant-pupils.json"),
  JSON.stringify(out, null, 2),
);
console.log("wrote scripts/variant-pupils.json");
