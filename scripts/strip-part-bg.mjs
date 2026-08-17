/**
 * 파츠 PNG 흰/밝은 배경 → 투명 처리 + 여백 크롭
 * node scripts/strip-part-bg.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const DIR = path.resolve("public/avatars/parts");

/** 밝고 채도 낮은 픽셀(스튜디오 흰 배경)을 투명하게 */
function shouldKnockout(r, g, b, a) {
  if (a < 8) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  // 거의 흰색·밝은 회색
  if (max >= 235 && sat < 0.12) return true;
  if (max >= 220 && sat < 0.08 && (r + g + b) / 3 >= 215) return true;
  // 아주 연한 그림자 회색도 가장자리면 날림
  if (max >= 200 && sat < 0.06 && (r + g + b) / 3 >= 198) return true;
  return false;
}

async function processFile(filePath) {
  const input = await sharp(filePath).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { data, info } = input;
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
      // 가장자리 안티앨리어싱: 밝은 픽셀은 알파만 낮춤
      const lum = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      if (lum > 180 && sat < 0.18 && a > 0) {
        const t = Math.min(1, (220 - lum) / 40);
        out[i + 3] = Math.round(a * Math.max(0.15, t));
      }
    }
  }

  // 투명 영역 기준 바운딩 박스 크롭
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      if (out[idx + 3] > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    console.log("skip empty", path.basename(filePath));
    return;
  }

  const pad = 8;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  await sharp(out, {
    raw: { width, height, channels },
  })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toFile(filePath);

  console.log("ok", path.basename(filePath), `${cropW}x${cropH}`);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
for (const f of files) {
  await processFile(path.join(DIR, f));
}
console.log("done", files.length);
