import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pdfPath = path.join(root, "tmp-pdf-qa", "packet-qa-verify.pdf");
const outDir = path.join(root, "tmp-pdf-qa");

const data = fs.readFileSync(pdfPath);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
await page.setContent("<html><body></body></html>");

const b64 = data.toString("base64");
const results = await page.evaluate(async (b64Inner) => {
  const pdfjs = await import(
    "https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.mjs"
  );
  pdfjs.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.worker.min.mjs";
  const raw = Uint8Array.from(atob(b64Inner), (c) => c.charCodeAt(0));
  const doc = await pdfjs.getDocument({
    data: raw,
    useSystemFonts: true,
  }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const viewport = p.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    await p.render({ canvasContext: ctx, viewport }).promise;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let first = -1;
    for (let y = 0; y < canvas.height; y++) {
      let dark = 0;
      for (let x = 20; x < canvas.width - 20; x += 2) {
        const idx = (y * canvas.width + x) * 4;
        if (img.data[idx] + img.data[idx + 1] + img.data[idx + 2] < 700) {
          dark += 1;
        }
      }
      if (dark > 20) {
        first = y;
        break;
      }
    }
    out.push({
      page: i,
      first,
      h: canvas.height,
      dataUrl: canvas.toDataURL("image/png"),
    });
  }
  return out;
}, b64);

for (const r of results) {
  const buf = Buffer.from(r.dataUrl.split(",")[1], "base64");
  const dest = path.join(outDir, `direct-page-${r.page}.png`);
  fs.writeFileSync(dest, buf);
  console.log(
    `page ${r.page} firstY=${r.first} pct=${((r.first / r.h) * 100).toFixed(1)}% -> ${dest}`,
  );
}

await browser.close();
