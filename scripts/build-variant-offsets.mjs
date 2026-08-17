/**
 * 품종별 VARIANT_OFFSETS 생성 + QA 시트
 * node scripts/build-variant-offsets.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";

const pupils = JSON.parse(
  fs.readFileSync(path.resolve("scripts/variant-pupils.json"), "utf8"),
);

const FAMILY = {
  fox: {
    hat: { top: 33, left: 50, scale: 1.12 },
    glasses: { top: 66.0, left: 50, scale: 1, ipd: 29.0 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  cat: {
    hat: { top: 28, left: 50, scale: 1.12 },
    glasses: { top: 58.8, left: 50, scale: 1, ipd: 29.0 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  puppy: {
    hat: { top: 29, left: 50, scale: 1.14 },
    glasses: { top: 63.0, left: 50, scale: 1, ipd: 30.0 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  bunny: {
    hat: { top: 43, left: 50, scale: 1.08 },
    glasses: { top: 68.5, left: 50, scale: 1, ipd: 28.5 },
    accessory: { top: 87, left: 50, scale: 0.9 },
  },
  bear: {
    hat: { top: 27, left: 50, scale: 1.15 },
    glasses: { top: 62.0, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  panda: {
    hat: { top: 28, left: 50, scale: 1.15 },
    glasses: { top: 59.2, left: 50, scale: 1, ipd: 33.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  chick: {
    hat: { top: 31, left: 50, scale: 1.08 },
    glasses: { top: 65.0, left: 50, scale: 1, ipd: 29.5 },
    accessory: { top: 89, left: 50, scale: 0.85 },
  },
  penguin: {
    hat: { top: 29, left: 50, scale: 1.1 },
    glasses: { top: 65.5, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 87, left: 50, scale: 0.9 },
  },
  otter: {
    hat: { top: 30, left: 50, scale: 1.14 },
    glasses: { top: 63.0, left: 50, scale: 1, ipd: 31.5 },
    accessory: { top: 86, left: 50, scale: 0.96 },
  },
  raccoon: {
    hat: { top: 28, left: 50, scale: 1.14 },
    glasses: { top: 63.5, left: 50, scale: 1, ipd: 30.5 },
    accessory: { top: 87, left: 50, scale: 0.96 },
  },
  pig: {
    hat: { top: 27, left: 50, scale: 1.12 },
    glasses: { top: 50.5, left: 50, scale: 1, ipd: 32.5 },
    accessory: { top: 87, left: 50, scale: 0.94 },
  },
  hamster: {
    hat: { top: 29, left: 50, scale: 1.1 },
    glasses: { top: 51.0, left: 50, scale: 1, ipd: 30.0 },
    accessory: { top: 87, left: 50, scale: 0.94 },
  },
};

const DEFAULTS = {
  fox: "orange",
  cat: "calico",
  puppy: "golden",
  bunny: "white",
  bear: "brown",
  panda: "classic",
  chick: "yellow",
  penguin: "classic",
  otter: "brown",
  raccoon: "classic",
  pig: "pink",
  hamster: "golden",
};

/** 측정 실패/왜곡 수동 보정 (glasses top/ipd) */
const MANUAL = {
  "cat:tuxedo": { top: 52.0, ipd: 30.0 },
  "otter:light": { top: 56.0, ipd: 31.0 },
  "otter:belly": { top: 52.5, ipd: 30.5 },
  "penguin:emperor": { top: 52.0, ipd: 30.5 },
  "chick:brown": { top: 54.0, ipd: 30.0 },
  "fox:silver": { top: 62.0, ipd: 30.5 },
  "bear:polar": { top: 55.0, ipd: 31.0 },
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function buildOffsets(animal, variant) {
  const fam = FAMILY[animal];
  const key = `${animal}:${variant}`;
  if (variant === DEFAULTS[animal]) {
    return {
      hat: { ...fam.hat },
      glasses: { ...fam.glasses },
      accessory: { ...fam.accessory },
    };
  }

  if (MANUAL[key]) {
    const top = MANUAL[key].top;
    const ipd = MANUAL[key].ipd;
    const dY = top - fam.glasses.top;
    return {
      hat: { ...fam.hat, top: round1(fam.hat.top + dY * 0.55) },
      glasses: { top, left: 50, scale: 1, ipd },
      accessory: {
        ...fam.accessory,
        top: round1(fam.accessory.top + dY * 0.12),
      },
    };
  }

  const m = pupils[key];
  const defM = pupils[`${animal}:${DEFAULTS[animal]}`];
  if (!m || !defM) {
    return {
      hat: { ...fam.hat },
      glasses: { ...fam.glasses },
      accessory: { ...fam.accessory },
    };
  }

  const yBias = fam.glasses.top - defM.pupilY;
  const ipdBias = fam.glasses.ipd - defM.ipd;
  let top = round1(m.pupilY + yBias);
  let ipd = round1(m.ipd + ipdBias);
  ipd = Math.max(fam.glasses.ipd - 4, Math.min(fam.glasses.ipd + 5, ipd));
  const dY = top - fam.glasses.top;

  return {
    hat: { ...fam.hat, top: round1(fam.hat.top + dY * 0.55) },
    glasses: { top, left: 50, scale: 1, ipd },
    accessory: {
      ...fam.accessory,
      top: round1(fam.accessory.top + dY * 0.12),
    },
  };
}

const all = {};
for (const [animal, def] of Object.entries(DEFAULTS)) {
  all[animal] = {};
  const vars = Object.keys(pupils)
    .filter((k) => k.startsWith(animal + ":"))
    .map((k) => k.split(":")[1]);
  // ensure default first
  const ordered = [def, ...vars.filter((v) => v !== def)];
  for (const v of ordered) {
    all[animal][v] = buildOffsets(animal, v);
  }
}

fs.writeFileSync(
  path.resolve("scripts/variant-offsets.json"),
  JSON.stringify(all, null, 2),
);

// emit TS snippet
let ts = "export const VARIANT_OFFSETS: Partial<\n  Record<AvatarPresetId, Partial<Record<string, AnimalPartOffsets>>>\n> = {\n";
for (const [animal, variants] of Object.entries(all)) {
  ts += `  ${animal}: {\n`;
  for (const [v, o] of Object.entries(variants)) {
    ts += `    ${v}: {\n`;
    ts += `      hat: { top: ${o.hat.top}, left: ${o.hat.left}, scale: ${o.hat.scale} },\n`;
    ts += `      glasses: { top: ${o.glasses.top}, left: ${o.glasses.left}, scale: ${o.glasses.scale}, ipd: ${o.glasses.ipd} },\n`;
    ts += `      accessory: { top: ${o.accessory.top}, left: ${o.accessory.left}, scale: ${o.accessory.scale} },\n`;
    ts += `    },\n`;
  }
  ts += `  },\n`;
}
ts += "};\n";
fs.writeFileSync(path.resolve("scripts/variant-offsets.ts.txt"), ts);
console.log("wrote scripts/variant-offsets.json + .ts.txt");

// QA sheet: all 36 with sunglasses overlay using computed offsets
const ANIMALS_DIR = path.resolve("public/avatars/animals");
const SUN = path.resolve("public/avatars/parts/part-glasses-sun.png");
const cell = 220;
const cols = 6;
const rows = 6;
const entries = [];
for (const [animal, variants] of Object.entries(all)) {
  for (const v of Object.keys(variants)) entries.push([animal, v]);
}

const composites = [];
for (let i = 0; i < entries.length; i++) {
  const [animal, v] = entries[i];
  const o = all[animal][v];
  const r = Math.floor(i / cols);
  const c = i % cols;
  const base = await sharp(path.join(ANIMALS_DIR, `${animal}-${v}.png`))
    .resize(cell, cell, { fit: "cover" })
    .png()
    .toBuffer();
  composites.push({ input: base, left: c * cell, top: r * cell });

  // glasses: top% / ipd → width using sun lensSpan≈0.55
  const lensSpan = 0.55;
  const widthPct = (o.glasses.ipd / lensSpan) * 1.02;
  const gW = Math.round((widthPct / 100) * cell);
  const gH = Math.round(gW * 0.45);
  const glassesBuf = await sharp(SUN)
    .resize(gW, gH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const left = Math.round(c * cell + (cell * o.glasses.left) / 100 - gW / 2);
  const top = Math.round(r * cell + (cell * o.glasses.top) / 100 - gH * 0.5);
  composites.push({ input: glassesBuf, left, top });
}

await sharp({
  create: {
    width: cols * cell,
    height: rows * cell,
    channels: 4,
    background: { r: 245, g: 242, b: 248, alpha: 1 },
  },
})
  .composite(composites)
  .png()
  .toFile(
    path.resolve(
      "C:/Users/Galaxy/.cursor/projects/c-Users-Galaxy-Projects-wrong-note-app/assets/variant-glasses-qa.png",
    ),
  );
console.log("wrote variant-glasses-qa.png");
