/**
 * 임의 학생 실데이터로 오답 모음 PDF 생성 (프로덕션 경로 buildWrongNotePacketPdfBlob)
 *
 * 사용:
 *   node scripts/gen-student-packet.mjs --user <userId> [--out name] [--days 60]
 *   node scripts/gen-student-packet.mjs --name 오종택
 *
 * 결과: tmp-pdf-qa/<out>.pdf, tmp-pdf-qa/<out>-page-N.png, tmp-pdf-qa/<out>-report.json
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const OUT = path.join(root, "tmp-pdf-qa");
const BASE = process.env.QA_BASE || "http://127.0.0.1:3000";
const SUBJECT_NAMES = { math: "수학", english: "영어", korean: "국어" };

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const USER_ID = arg("--user");
const USER_NAME = arg("--name");
const DAYS = Number(arg("--days", "90"));
/** 실제 배포 PDF와 같은 기간으로 맞출 때 사용 (KST 기준 yyyy-mm-dd) */
const START_DATE = arg("--start");
const END_DATE = arg("--end");
const OUT_NAME = arg("--out", "student-packet");

function loadEnvLocal() {
  const env = {};
  for (const line of fs
    .readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function toDateKey(iso) {
  const kst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function fetchPacketData() {
  const env = loadEnvLocal();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let profile;
  if (USER_ID) {
    const { data } = await sb
      .from("profiles")
      .select("id, display_name, academy_id")
      .eq("id", USER_ID)
      .maybeSingle();
    profile = data;
  } else {
    const { data } = await sb
      .from("profiles")
      .select("id, display_name, academy_id")
      .ilike("display_name", `%${USER_NAME}%`)
      .limit(1);
    profile = data?.[0];
  }
  if (!profile) throw new Error("학생을 찾지 못했어요");

  const end = END_DATE
    ? new Date(`${END_DATE}T23:59:59.999+09:00`)
    : new Date();
  const start = START_DATE
    ? new Date(`${START_DATE}T00:00:00+09:00`)
    : new Date(end.getTime() - DAYS * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await sb
    .from("questions")
    .select(
      "id, subject_id, image_url, extra_image_urls, problem_latex, shared_passage, answer_text, archived, created_at",
    )
    .eq("user_id", profile.id)
    .gte("created_at", start.toISOString())
    .lte("created_at", end.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;

  const items = (rows ?? []).slice(0, 80).map((row, index) => ({
    id: String(row.id),
    number: index + 1,
    subjectId: String(row.subject_id),
    subjectName: SUBJECT_NAMES[row.subject_id] ?? String(row.subject_id),
    createdAt: String(row.created_at),
    createdDateLabel: toDateKey(String(row.created_at)),
    problemLatex: row.problem_latex?.trim() || undefined,
    sharedPassage: row.shared_passage?.trim() || undefined,
    imageUrls: [],
    answerText: row.answer_text?.trim() || undefined,
    archived: Boolean(row.archived),
  }));

  return {
    academyName: "학원",
    studentName: profile.display_name,
    classLabel: "미배정",
    periodLabel:
      START_DATE && END_DATE ? `${START_DATE} ~ ${END_DATE}` : `최근 ${DAYS}일`,
    periodStart: toDateKey(start.toISOString()),
    periodEnd: toDateKey(end.toISOString()),
    subjectFilterLabel: "전체 과목",
    statusFilterLabel: "전체",
    phaseFilterLabel: "전체",
    generatedAtLabel: toDateKey(end.toISOString()),
    truncated: (rows ?? []).length > 80,
    items,
    subjectOptions: [],
  };
}

async function extractPdfText(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(pdfPath)),
    useSystemFonts: true,
  }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const tc = await p.getTextContent();
    pages.push({
      page: i,
      text: tc.items.map((it) => ("str" in it ? it.str : "")).join("\n"),
    });
  }
  return pages;
}

async function renderPdfPages(pdfPath, prefix) {
  const b64 = fs.readFileSync(pdfPath).toString("base64");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
  await page.setContent("<html><body></body></html>");
  const results = await page.evaluate(async (data) => {
    const pdfjs = await import(
      "https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.mjs"
    );
    pdfjs.GlobalWorkerOptions.workerSrc =
      "https://unpkg.com/pdfjs-dist@4.10.38/legacy/build/pdf.worker.min.mjs";
    const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    const doc = await pdfjs.getDocument({ data: raw, useSystemFonts: true })
      .promise;
    const out = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const viewport = p.getViewport({ scale: 1.45 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      await p.render({ canvasContext: ctx, viewport }).promise;
      out.push({ page: i, dataUrl: canvas.toDataURL("image/png") });
    }
    return out;
  }, b64);
  await browser.close();
  for (const r of results) {
    fs.writeFileSync(
      path.join(OUT, `${prefix}${r.page}.png`),
      Buffer.from(r.dataUrl.split(",")[1], "base64"),
    );
  }
  return results.length;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const data = await fetchPacketData();
  console.log("student", data.studentName, "items", data.items.length);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1600 } });
  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto(`${BASE}/dev/packet-pdf-qa`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForFunction(() => Boolean(window.__packetPdfQa?.runWithData), null, {
    timeout: 60000,
  });

  const result = await page.evaluate(
    async (packet) =>
      window.__packetPdfQa.runWithData(packet, {
        downloadName: "student-packet.pdf",
        skipPreview: true,
      }),
    data,
  );
  await browser.close();

  if (!result?.base64) throw new Error(`PDF 생성 실패: ${JSON.stringify(result)}`);
  const pdfPath = path.join(OUT, `${OUT_NAME}.pdf`);
  fs.writeFileSync(pdfPath, Buffer.from(result.base64, "base64"));

  const pageCount = await renderPdfPages(pdfPath, `${OUT_NAME}-page-`);
  const textPages = await extractPdfText(pdfPath);
  const allText = textPages.map((p) => p.text).join("\n");

  const audit = {
    figureTokenLeak: /\[\[FIGURE/.test(allText),
    rawFracToken: /frac\s*[({]/.test(allText),
    rawLatexCommand: /\\(?:frac|sqrt|parallel|perp|overline|angle|text)\b/.test(
      allText,
    ),
    figureLoadFailed: logs.some((l) => l.includes("figure load failed")),
    answerCaptureFailed: logs.some((l) => l.includes("answer capture failed")),
    pageCount,
  };
  fs.writeFileSync(
    path.join(OUT, `${OUT_NAME}-report.json`),
    JSON.stringify({ student: data.studentName, audit, logs: logs.slice(-40) }, null, 2),
    "utf8",
  );
  console.log("[audit]", JSON.stringify(audit));
  console.log("PDF", pdfPath, fs.statSync(pdfPath).size);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
