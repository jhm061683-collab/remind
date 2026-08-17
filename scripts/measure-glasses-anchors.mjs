/**
 * 동물 동공 / 안경 렌즈 중심 실측
 * node scripts/measure-glasses-anchors.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const ANIMALS_DIR = path.resolve("public/avatars/animals");
const PARTS = path.resolve("public/avatars/parts");

async function raw(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, ...info };
}

function lum(r, g, b) {
  return (r + g + b) / 3;
}

/** 얼굴 영역에서 어두운 동공 두 개 찾기 */
function findPupils(data, width, height, channels) {
  // 검색 창: 세로 35~70%, 가로 15~85%
  const y0 = Math.floor(height * 0.35);
  const y1 = Math.floor(height * 0.72);
  const x0 = Math.floor(width * 0.12);
  const x1 = Math.floor(width * 0.88);

  const dark = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      const a = data[i + 3];
      if (a < 200) continue;
      const L = lum(data[i], data[i + 1], data[i + 2]);
      // 광택 하이라이트 제외, 동공 본체
      if (L < 55) dark.push({ x, y, L });
    }
  }
  if (dark.length < 50) return null;

  // 좌/우 클러스터 (가로 중앙 기준)
  const mid = width / 2;
  const left = dark.filter((p) => p.x < mid);
  const right = dark.filter((p) => p.x >= mid);
  if (left.length < 20 || right.length < 20) return null;

  const avg = (arr) => {
    let sx = 0,
      sy = 0;
    for (const p of arr) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / arr.length, y: sy / arr.length };
  };
  const L = avg(left);
  const R = avg(right);
  return {
    leftX: (L.x / width) * 100,
    rightX: (R.x / width) * 100,
    pupilY: (((L.y + R.y) / 2) / height) * 100,
    ipd: ((R.x - L.x) / width) * 100,
  };
}

/** 안경 이미지에서 좌우 렌즈 중심 (어두운/투명 원 영역) */
function findLensCenters(data, width, height, channels) {
  // 불투명 바운딩
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 40) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const mid = (minX + maxX) / 2;

  // 렌즈: 알파가 낮거나 어두운 내부. 프레임은 불투명+채도
  const lensPts = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = (y * width + x) * channels;
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2],
        a = data[i + 3];
      const L = lum(r, g, b);
      const sat =
        Math.max(r, g, b) === 0
          ? 0
          : (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
      // 렌즈: 어두운 불투명 or 반투명
      const isLens =
        (a > 30 && a < 230 && L < 160) || (a > 180 && L < 90 && sat < 0.25);
      if (isLens) lensPts.push({ x, y });
    }
  }

  let leftC, rightC;
  if (lensPts.length > 80) {
    const left = lensPts.filter((p) => p.x < mid);
    const right = lensPts.filter((p) => p.x >= mid);
    const avg = (arr) => {
      let sx = 0,
        sy = 0;
      for (const p of arr) {
        sx += p.x;
        sy += p.y;
      }
      return { x: sx / arr.length, y: sy / arr.length };
    };
    if (left.length > 30 && right.length > 30) {
      leftC = avg(left);
      rightC = avg(right);
    }
  }

  // 폴백: 바운딩 박스 좌우 1/4, 3/4
  if (!leftC) {
    leftC = { x: minX + bw * 0.27, y: minY + bh * 0.5 };
    rightC = { x: minX + bw * 0.73, y: minY + bh * 0.5 };
  }

  const lensCY = (((leftC.y + rightC.y) / 2 - minY) / bh);
  const lensSpan = (rightC.x - leftC.x) / bw; // 렌즈 중심 간격 / 전체 폭

  return {
    lensCY: Math.round(lensCY * 1000) / 1000,
    lensSpan: Math.round(lensSpan * 1000) / 1000,
    aspect: Math.round((bh / bw) * 1000) / 1000,
  };
}

const animals = [
  "fox",
  "cat",
  "puppy",
  "bunny",
  "bear",
  "panda",
  "chick",
  "penguin",
  "otter",
  "raccoon",
];
const glasses = ["round", "sun", "heart", "smart", "hiphop"];

console.log("=== PUPILS ===");
const pupilMap = {};
for (const id of animals) {
  const { data, width, height, channels } = await raw(
    path.join(ANIMALS_DIR, `${id}.png`),
  );
  const p = findPupils(data, width, height, channels);
  pupilMap[id] = p;
  console.log(id, p);
}

console.log("\n=== LENSES ===");
const lensMap = {};
for (const id of glasses) {
  const { data, width, height, channels } = await raw(
    path.join(PARTS, `part-glasses-${id}.png`),
  );
  const L = findLensCenters(data, width, height, channels);
  lensMap[id] = L;
  console.log(id, L);
}

// 추천 파라미터: top = pupilY, width = ipd / lensSpan / scale(animal)
console.log("\n=== SUGGESTED ===");
for (const id of animals) {
  const p = pupilMap[id];
  if (!p) continue;
  // round 기준 width (scale 1.0)
  const span = lensMap.round?.lensSpan || 0.5;
  const widthPct = Math.round((p.ipd / span) * 10) / 10;
  console.log(
    `${id}: glasses top=${p.pupilY.toFixed(1)}, ipd=${p.ipd.toFixed(1)}, suggestedWidth@round≈${widthPct}`,
  );
}

fs.writeFileSync(
  path.resolve("scripts/glasses-measure.json"),
  JSON.stringify({ pupils: pupilMap, lenses: lensMap }, null, 2),
);
console.log("\nwrote scripts/glasses-measure.json");
