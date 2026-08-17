/**
 * 문항 원문 진단 (FIGURE 토큰 / 기하 기호 / 정답 원문) — 전체 스캔
 * 실행: node scripts/inspect-packet-source.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

const env = loadEnvLocal();
const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: rows, error } = await sb
  .from("questions")
  .select("id, user_id, subject_id, problem_latex, answer_text, created_at")
  .order("created_at", { ascending: false })
  .limit(2000);
if (error) throw error;

const all = rows ?? [];
const figures = all.filter((r) => /\[\[FIGURE/.test(r.problem_latex ?? ""));
const geom = all.filter((r) =>
  /[∥⟂⊥]|\\parallel|\\perp/.test(r.problem_latex ?? ""),
);
const fracAnswers = all.filter((r) =>
  /frac|\/|\^|sqrt|√|[xy]\s*=/.test(r.answer_text ?? ""),
);

const summary = {
  total: all.length,
  figureCount: figures.length,
  geomCount: geom.length,
  fracAnswerCount: fracAnswers.length,
  figureSamples: figures.slice(0, 6).map((r) => ({
    id: r.id,
    userId: r.user_id,
    tokens: (r.problem_latex.match(/\[\[FIGURE[^\]]*\]\]/g) ?? []).slice(0, 3),
    head: r.problem_latex.slice(0, 200),
  })),
  geomSamples: geom.slice(0, 6).map((r) => ({
    id: r.id,
    userId: r.user_id,
    matched: (r.problem_latex.match(/.{0,40}(?:[∥⟂⊥]|\\parallel|\\perp).{0,40}/g) ?? []).slice(0, 3),
  })),
  answerSamples: fracAnswers.slice(0, 25).map((r) => ({
    id: r.id,
    userId: r.user_id,
    subject: r.subject_id,
    answer: r.answer_text,
  })),
};

fs.mkdirSync(path.join(root, "tmp-pdf-qa"), { recursive: true });
fs.writeFileSync(
  path.join(root, "tmp-pdf-qa", "source-inspect.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);
console.log(JSON.stringify(summary, null, 2));
