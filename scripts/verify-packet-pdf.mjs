/**
 * 오답 모음 PDF QA — Playwright로 픽스처 PDF 생성·페이지 캡처·텍스트 추출
 * 실행: node scripts/verify-packet-pdf.mjs
 */
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "tmp-pdf-qa");
const BASE = process.env.QA_BASE || "http://127.0.0.1:3000";

async function extractPdfText(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const tc = await p.getTextContent();
    const text = tc.items.map((it) => ("str" in it ? it.str : "")).join("\n");
    pages.push({ page: i, text, chars: [...text].slice(0, 200) });
  }
  return pages;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1600 } });

  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto(`${BASE}/dev/packet-pdf-qa`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForSelector('[data-testid="run-packet-pdf-qa"]', {
    timeout: 60000,
  });

  const downloadPromise = page
    .waitForEvent("download", { timeout: 180000 })
    .catch(() => null);
  await page.click('[data-testid="run-packet-pdf-qa"]');

  try {
    await page.waitForFunction(
      () => {
        const s =
          document.querySelector('[data-testid="qa-status"]')?.textContent || "";
        return s.includes("완료") || s.startsWith("실패");
      },
      null,
      { timeout: 420000 },
    );
  } catch (err) {
    const stuckStatus = await page.textContent('[data-testid="qa-status"]');
    console.error("QA timeout — 마지막 상태:", stuckStatus);
    console.error("최근 로그:\n" + logs.slice(-30).join("\n"));
    fs.writeFileSync(
      path.join(OUT, "report.json"),
      JSON.stringify(
        { status: stuckStatus, timeout: true, logs: logs.slice(-40) },
        null,
        2,
      ),
      "utf8",
    );
    await browser.close();
    throw err;
  }

  const status = await page.textContent('[data-testid="qa-status"]');
  const checks = await page.$$eval('[data-testid="qa-checks"] li', (els) =>
    els.map((e) => e.textContent || ""),
  );

  const download = await downloadPromise;
  const pdfPath = path.join(OUT, "packet-qa-verify.pdf");
  if (download) {
    await download.saveAs(pdfPath);
    console.log("saved PDF", pdfPath, fs.statSync(pdfPath).size);
  } else {
    console.log("no download event — preview screenshots only");
  }

  let textPages = [];
  try {
    if (fs.existsSync(pdfPath)) {
      textPages = await extractPdfText(pdfPath);
      fs.writeFileSync(
        path.join(OUT, "text-extract.json"),
        JSON.stringify(
          textPages.map((p) => ({
            page: p.page,
            text: p.text,
            hasCircled: /[\u2460-\u2464]/.test(p.text),
            hasBacktickChoice: /`/.test(p.text),
            sample: p.text.slice(0, 800),
          })),
          null,
          2,
        ),
        "utf8",
      );
      for (const p of textPages) {
        console.log(
          `--- page ${p.page} circled=${/[\u2460-\u2464]/.test(p.text)} backtick=${/`/.test(p.text)} ---`,
        );
        console.log(p.text.slice(0, 600));
        console.log("...");
      }
    }
  } catch (err) {
    console.error("text extract failed", err);
    logs.push(`[extract] ${err}`);
  }

  // --- 자동 검증: figure 토큰 / raw 수학 토큰 / 상태값 회귀 ---
  const allText = textPages.map((p) => p.text).join("\n");
  const bodyText = textPages
    .filter((p) => p.page > 1)
    .map((p) => p.text)
    .join("\n");
  const audit = {
    figureTokenLeak: /\[\[FIGURE/.test(allText),
    rawFracToken: /frac\s*[({]/.test(allText),
    rawLatexCommand: /\\(?:frac|sqrt|parallel|perp|overline|angle|text)\b/.test(
      allText,
    ),
    problemHeaderLeak:
      /문제편\s*\(|좌·우 균형|학습용 인쇄물|번호 ↔ 정답만/.test(bodyText),
    figureLoadFailed: logs.some((l) => l.includes("figure load failed")),
    answerCaptureFailed: logs.some((l) => l.includes("answer capture failed")),
    mathClipFailure: logs.some((l) => /clipFailures=[1-9]/.test(l)),
    statusAnswerKept: /미등록/.test(allText) && /\*\*\*/.test(allText),
    pageCountOk: textPages.length >= 3,
  };
  const auditFailures = Object.entries(audit).filter(([key, value]) =>
    key === "statusAnswerKept" || key === "pageCountOk" ? !value : value,
  );

  fs.writeFileSync(
    path.join(OUT, "report.json"),
    JSON.stringify(
      { status, checks, audit, auditFailures, logs: logs.slice(-40) },
      null,
      2,
    ),
    "utf8",
  );
  console.log("[audit]", JSON.stringify(audit));

  if (!status?.includes("완료")) {
    console.error("QA failed:", status);
    await page.screenshot({ path: path.join(OUT, "fail.png"), fullPage: true });
    await browser.close();
    process.exit(1);
  }

  if (auditFailures.length > 0) {
    console.error(
      "audit failed:",
      auditFailures.map(([key]) => key).join(", "),
    );
    await page.screenshot({ path: path.join(OUT, "fail.png"), fullPage: true });
    await browser.close();
    process.exit(1);
  }

  const imgs = page.locator("[data-qa-page]");
  const count = await imgs.count();
  console.log("pages", count, "status", status);

  for (let i = 0; i < count; i++) {
    const el = imgs.nth(i);
    const pageNo = await el.getAttribute("data-qa-page");
    const dest = path.join(OUT, `page-${pageNo}.png`);
    const fixedDest = path.join(OUT, `fixed-page-${pageNo}.png`);
    await el.screenshot({ path: dest });
    fs.copyFileSync(dest, fixedDest);
    console.log("saved", dest, "→", fixedDest);
  }

  await page.screenshot({ path: path.join(OUT, "full.png"), fullPage: true });
  await browser.close();
  console.log("OK", path.join(OUT, "report.json"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
