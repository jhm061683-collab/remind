/**
 * 오종택 실데이터 오답 모음 PDF 생성 (프로덕션 경로: buildWrongNotePacketPdfBlob)
 *
 * 1) .env.local service role로 Supabase 조회 → tmp-pdf-qa/ojongtaek-data.json
 * 2) Playwright로 /dev/packet-pdf-qa 에서 window.__packetPdfQa.runWithData 호출
 * 3) tmp-pdf-qa/ojongtaek-fixed.pdf + oj-fixed-page-N.png
 *
 * 실행: node scripts/gen-ojongtaek-packet.mjs
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
const START = "2026-07-07";
const END = "2026-08-05";
const STUDENT_NAME = "오종택";
const APC_ID = "0bd38cd2-4c8d-41e8-9769-dc94aa6fe1ea";
const PHASES = ["short", "medium", "long"];

const SUBJECT_NAMES = { math: "수학", english: "영어", korean: "국어" };

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local 없음");
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function toDateKey(isoOrDate) {
  const source =
    typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  const kst = new Date(source.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function endOfKstDayIso(dateKey) {
  return new Date(`${dateKey}T23:59:59.999+09:00`).toISOString();
}

function getSubjectName(subjectId, map) {
  return map.get(subjectId) || SUBJECT_NAMES[subjectId] || subjectId;
}

function imageUrls(row) {
  const extras = Array.isArray(row.extra_image_urls)
    ? row.extra_image_urls
    : [];
  return [row.image_url, ...extras]
    .filter((u) => typeof u === "string" && u.trim())
    .map((u) => u.trim());
}

async function fetchPacketData() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE URL/SERVICE_ROLE_KEY 필요");

  const sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profiles, error: pe } = await sb
    .from("profiles")
    .select("id, display_name, academy_id")
    .ilike("display_name", `%${STUDENT_NAME}%`)
    .limit(5);
  if (pe) throw pe;
  if (!profiles?.length) throw new Error(`학생 ${STUDENT_NAME} 없음`);

  const student = profiles[0];
  console.log("student", student.id, student.display_name);

  let academyName = "학원";
  if (student.academy_id) {
    const { data: academy } = await sb
      .from("academies")
      .select("name")
      .eq("id", student.academy_id)
      .maybeSingle();
    if (academy?.name) academyName = academy.name;
  }

  const subjectNameById = new Map();
  const { data: settingsRow } = await sb
    .from("review_settings")
    .select("settings")
    .eq("user_id", student.id)
    .eq("subject_id", "__subjects__")
    .maybeSingle();
  const subjects = settingsRow?.settings?.subjects;
  if (Array.isArray(subjects)) {
    for (const s of subjects) {
      if (typeof s?.id === "string" && typeof s?.name === "string" && s.name.trim()) {
        subjectNameById.set(s.id, s.name.trim());
      }
    }
  }

  const { data: rows, error: qe } = await sb
    .from("questions")
    .select(
      "id, subject_id, image_url, extra_image_urls, problem_latex, shared_passage, answer_text, archived, created_at, phase",
    )
    .eq("user_id", student.id)
    .gte("created_at", `${START}T00:00:00+09:00`)
    .lte("created_at", endOfKstDayIso(END))
    .in("phase", PHASES)
    .order("created_at", { ascending: true });
  if (qe) throw qe;

  const all = rows ?? [];
  console.log("questions", all.length);
  const hasApc = all.some((r) => r.id === APC_ID);
  console.log("has_APC_id", hasApc, APC_ID);

  const subjectCount = new Map();
  const items = all.slice(0, 80).map((row, index) => {
    const subjectId = String(row.subject_id);
    const subjectName = getSubjectName(subjectId, subjectNameById);
    subjectCount.set(subjectId, subjectName);
    return {
      id: String(row.id),
      number: index + 1,
      subjectId,
      subjectName,
      createdAt: String(row.created_at),
      createdDateLabel: toDateKey(String(row.created_at)),
      problemLatex:
        typeof row.problem_latex === "string" && row.problem_latex.trim()
          ? row.problem_latex.trim()
          : undefined,
      sharedPassage:
        typeof row.shared_passage === "string" && row.shared_passage.trim()
          ? row.shared_passage.trim()
          : undefined,
      imageUrls: imageUrls(row),
      answerText:
        typeof row.answer_text === "string" && row.answer_text.trim()
          ? row.answer_text.trim()
          : undefined,
      archived: Boolean(row.archived),
    };
  });

  const subjectOptions = [...subjectCount.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const data = {
    academyName,
    studentName: student.display_name,
    classLabel: "미배정",
    periodLabel: `최근 30일 (${START} ~ ${END})`,
    periodStart: START,
    periodEnd: END,
    subjectFilterLabel: "전체 과목",
    statusFilterLabel: "전체",
    phaseFilterLabel: "단기, 중기, 장기",
    generatedAtLabel: toDateKey(new Date()),
    truncated: all.length > 80,
    items,
    subjectOptions,
  };

  return { data, hasApc };
}

async function waitForDev(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/dev/packet-pdf-qa`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok || res.status === 200) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function extractPdfText(pdfPath) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const tc = await p.getTextContent();
    const text = tc.items.map((it) => ("str" in it ? it.str : "")).join("\n");
    pages.push({ page: i, text, chars: [...text].length });
  }
  return { numPages: doc.numPages, pages };
}

async function renderPdfPages(pdfPath, prefix) {
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
      const viewport = p.getViewport({ scale: 1.45 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d");
      await p.render({ canvasContext: ctx, viewport }).promise;
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let darkPixels = 0;
      for (let y = 40; y < canvas.height - 40; y += 3) {
        for (let x = 30; x < canvas.width - 30; x += 3) {
          const idx = (y * canvas.width + x) * 4;
          if (img.data[idx] + img.data[idx + 1] + img.data[idx + 2] < 720) {
            darkPixels += 1;
          }
        }
      }
      out.push({
        page: i,
        darkPixels,
        dataUrl: canvas.toDataURL("image/png"),
      });
    }
    return out;
  }, b64);
  await browser.close();

  const blankish = [];
  for (const r of results) {
    const dest = path.join(OUT, `${prefix}${r.page}.png`);
    fs.writeFileSync(dest, Buffer.from(r.dataUrl.split(",")[1], "base64"));
    console.log(`saved ${dest} darkPixels=${r.darkPixels}`);
    if (r.darkPixels < 80) blankish.push(r.page);
  }
  return blankish;
}

async function generatePdfViaPlaywright(packetData) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 1600 } });
  const logs = [];
  page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

  await page.goto(`${BASE}/dev/packet-pdf-qa`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForFunction(
    () => Boolean(window.__packetPdfQa?.runWithData),
    null,
    { timeout: 60000 },
  );

  const downloadPromise = page
    .waitForEvent("download", { timeout: 240000 })
    .catch(() => null);

  const result = await page.evaluate(async (data) => {
    return window.__packetPdfQa.runWithData(data, {
      downloadName: "ojongtaek-fixed.pdf",
      skipPreview: true,
    });
  }, packetData);

  const download = await downloadPromise;
  const pdfPath = path.join(OUT, "ojongtaek-fixed.pdf");
  if (download) {
    await download.saveAs(pdfPath);
  } else if (result?.base64) {
    fs.writeFileSync(pdfPath, Buffer.from(result.base64, "base64"));
  } else {
    await browser.close();
    throw new Error(`PDF 생성 실패: ${JSON.stringify(result)}`);
  }

  console.log("PDF", pdfPath, fs.statSync(pdfPath).size, result);
  await browser.close();
  return { pdfPath, logs, result };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const { data, hasApc } = await fetchPacketData();
  const jsonPath = path.join(OUT, "ojongtaek-data.json");
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
  console.log("wrote", jsonPath, "items", data.items.length);

  if (!hasApc) {
    console.warn("WARN: APC question id not in date-range dataset");
  }

  const up = await waitForDev(90000);
  if (!up) {
    console.error(
      `Next dev not reachable at ${BASE}. Start with: npm run dev`,
    );
    process.exit(2);
  }

  const { pdfPath, logs, result } = await generatePdfViaPlaywright(data);
  const blankish = await renderPdfPages(pdfPath, "oj-fixed-page-");
  const extract = await extractPdfText(pdfPath);
  const extractPath = path.join(OUT, "text-extract-ojongtaek-fixed.json");
  fs.writeFileSync(extractPath, JSON.stringify(extract, null, 2), "utf8");

  const allText = extract.pages.map((p) => p.text).join("\n");
  const naVisible =
    /거리는/.test(allText) ||
    /외심/.test(allText) ||
    /\(나\)/.test(allText);
  // KaTeX는 이미지라 PDF 텍스트에 (나)가 없을 수 있음 → 페이지 PNG 존재 + dark 픽셀로 대체 확인

  const report = {
    student: data.studentName,
    itemCount: data.items.length,
    hasApcId: hasApc,
    apcId: APC_ID,
    pageCount: extract.numPages,
    blankishPages: blankish,
    naTextHintsInPdf: {
      has거리는: /거리는/.test(allText),
      has외심: /외심/.test(allText),
      has나: /\(나\)/.test(allText),
      note: "수학 KaTeX는 이미지라 텍스트 추출에 (나)가 없을 수 있음 — PNG 시각 확인",
    },
    koreanPageChars: extract.pages.map((p) => ({
      page: p.page,
      chars: p.chars,
      sample: p.text.slice(0, 120).replace(/\s+/g, " "),
    })),
    pdfResult: result,
    logsTail: logs.slice(-30),
  };
  fs.writeFileSync(
    path.join(OUT, "ojongtaek-fixed-report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );
  console.log(JSON.stringify(report, null, 2));
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
