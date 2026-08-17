/**
 * 좌표 QA 시트 생성
 * node scripts/avatar-align-qa.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const PARTS = path.resolve("public/avatars/parts");
const ANIMALS = path.resolve("public/avatars/animals");
const OUT =
  "C:/Users/Galaxy/.cursor/projects/c-Users-Galaxy-Projects-wrong-note-app/assets/avatar-align-qa.png";

const ANIMAL_OFFSETS = {
  fox: { hat: { top: 30, left: 50, scale: 0.92 }, glasses: { top: 54, left: 50, scale: 1.05 }, accessory: { top: 85, left: 50, scale: 0.98 } },
  cat: { hat: { top: 26, left: 50, scale: 0.94 }, glasses: { top: 56, left: 50, scale: 1.06 }, accessory: { top: 86, left: 50, scale: 0.98 } },
  puppy: { hat: { top: 26, left: 50, scale: 0.95 }, glasses: { top: 55, left: 50, scale: 1.05 }, accessory: { top: 85, left: 50, scale: 0.98 } },
  bunny: { hat: { top: 38, left: 50, scale: 0.7 }, glasses: { top: 52, left: 50, scale: 1 }, accessory: { top: 86, left: 50, scale: 0.92 } },
  bear: { hat: { top: 24, left: 50, scale: 1 }, glasses: { top: 55, left: 50, scale: 1.08 }, accessory: { top: 86, left: 50, scale: 0.98 } },
  panda: { hat: { top: 24, left: 50, scale: 1 }, glasses: { top: 55, left: 50, scale: 1.06 }, accessory: { top: 86, left: 50, scale: 0.98 } },
  chick: { hat: { top: 28, left: 50, scale: 0.8 }, glasses: { top: 58, left: 50, scale: 0.95 }, accessory: { top: 88, left: 50, scale: 0.88 } },
  penguin: { hat: { top: 26, left: 50, scale: 0.84 }, glasses: { top: 56, left: 50, scale: 1 }, accessory: { top: 86, left: 50, scale: 0.92 } },
  otter: { hat: { top: 26, left: 50, scale: 0.95 }, glasses: { top: 55, left: 50, scale: 1.04 }, accessory: { top: 85, left: 50, scale: 0.98 } },
  raccoon: { hat: { top: 24, left: 50, scale: 0.97 }, glasses: { top: 58, left: 50, scale: 1.08 }, accessory: { top: 86, left: 50, scale: 0.98 } },
};

const HAT_TUNE = {
  crown: { width: 54, dy: 1, scale: 0.94 },
  ballcap: { width: 66, dy: 2, scale: 0.96 },
  ribbon: { width: 34, dy: 2, scale: 0.75 },
  beanie: { width: 64, dy: 1, scale: 0.96 },
};
const GLASSES_TUNE = {
  sun: { width: 72, dy: 0, scale: 1.02 },
  round: { width: 68, dy: 0, scale: 1 },
  hiphop: { width: 76, dy: 0, scale: 1.04 },
};
const ACC_TUNE = {
  scarf: { width: 48, dy: 0, scale: 0.95, anchorY: 0.12 },
  star: { width: 18, dy: 1, scale: 0.88, anchorY: 0.5 },
  heart: { width: 16, dy: 1, scale: 0.86, anchorY: 0.5 },
  bow: { width: 28, dy: 0, scale: 0.92, anchorY: 0.4 },
};

function resolveHat(animal, hat) {
  const a = ANIMAL_OFFSETS[animal].hat;
  const t = HAT_TUNE[hat];
  let top = a.top + t.dy;
  let scale = a.scale * t.scale;
  let width = t.width;
  if (animal === "bunny") {
    if (hat === "ribbon") {
      top = 40;
      scale = 0.65;
      width = 28;
    } else if (hat === "crown") {
      top = 38;
      scale = 0.72;
      width = 46;
    } else top = 40;
  }
  return { left: a.left, top, width, scale, anchorY: 0.86 };
}
function resolveGlasses(animal, g) {
  const a = ANIMAL_OFFSETS[animal].glasses;
  const t = GLASSES_TUNE[g];
  return {
    left: a.left,
    top: a.top + t.dy,
    width: t.width,
    scale: a.scale * t.scale,
    anchorY: 0.5,
  };
}
function resolveAcc(animal, acc) {
  const a = ANIMAL_OFFSETS[animal].accessory;
  const t = ACC_TUNE[acc];
  return {
    left: a.left,
    top: a.top + t.dy,
    width: t.width,
    scale: a.scale * t.scale,
    anchorY: t.anchorY,
  };
}

async function place(layers, src, box, cell, col, row) {
  if (!fs.existsSync(src)) return;
  const meta = await sharp(src).metadata();
  const aspect = (meta.height || 1) / (meta.width || 1);
  const sw = Math.max(1, Math.round((box.width / 100) * cell * box.scale));
  const sh = Math.max(1, Math.round(sw * aspect));
  const cx = Math.round((box.left / 100) * cell);
  const cy = Math.round((box.top / 100) * cell);
  const ay = box.anchorY ?? 0.5;
  layers.push({
    input: await sharp(src).resize(sw, sh, { fit: "fill" }).png().toBuffer(),
    left: col * cell + cx - Math.round(sw / 2),
    top: row * cell + cy - Math.round(sh * ay),
  });
}

const animals = Object.keys(ANIMAL_OFFSETS);
const combos = [
  { hat: "ballcap", glasses: "sun", acc: "scarf" },
  { hat: "crown", glasses: "round", acc: "star" },
  { hat: "ribbon", glasses: "hiphop", acc: "heart" },
  { hat: "beanie", glasses: "sun", acc: "bow" },
];
const cell = 240;
const layers = [];

for (let r = 0; r < animals.length; r++) {
  for (let c = 0; c < combos.length; c++) {
    const animal = animals[r];
    const combo = combos[c];
    layers.push({
      input: await sharp(path.join(ANIMALS, `${animal}.png`))
        .resize(cell, cell, { fit: "cover" })
        .png()
        .toBuffer(),
      left: c * cell,
      top: r * cell,
    });
    const accFile = {
      scarf: "part-acc-scarf.png",
      star: "part-acc-star.png",
      heart: "part-acc-heart.png",
      bow: "part-acc-bow.png",
    }[combo.acc];
    await place(
      layers,
      path.join(PARTS, accFile),
      resolveAcc(animal, combo.acc),
      cell,
      c,
      r,
    );
    await place(
      layers,
      path.join(PARTS, `part-glasses-${combo.glasses}.png`),
      resolveGlasses(animal, combo.glasses),
      cell,
      c,
      r,
    );
    const hatFile = {
      ballcap: "part-hat-ballcap.png",
      crown: "part-hat-crown.png",
      ribbon: "part-hat-ribbon.png",
      beanie: "part-hat-beanie.png",
    }[combo.hat];
    await place(
      layers,
      path.join(PARTS, hatFile),
      resolveHat(animal, combo.hat),
      cell,
      c,
      r,
    );
  }
}

await sharp({
  create: {
    width: cell * 4,
    height: cell * animals.length,
    channels: 4,
    background: { r: 242, g: 238, b: 246, alpha: 1 },
  },
})
  .composite(layers)
  .png()
  .toFile(OUT);

await sharp(OUT)
  .extract({ left: 0, top: 0, width: cell * 4, height: cell * 4 })
  .png()
  .toFile(OUT.replace(".png", "-top.png"));

console.log("qa", OUT);
