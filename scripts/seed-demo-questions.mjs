/**
 * 과목별 테스트 문제 20개씩 시드 (데모용)
 * npm.cmd run supabase:seed-questions
 *
 * 필요: .env.local
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY (또는 SUPABASE_SERVICE_ROLE_KEY)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

const QUESTIONS_PER_SUBJECT = 20;
const SEED_TAG = "seed-demo";

const DEFAULT_SUBJECTS = [
  { id: "math", name: "수학" },
  { id: "english", name: "영어" },
  { id: "korean", name: "국어" },
];

const WRONG_REASONS = ["조건 오독", "연산 실수", "개념 부족", "시간 부족", "풀이 전략 부족"];

function loadEnvLocal() {
  if (!existsSync(envPath)) {
    console.error("❌ .env.local 파일이 없습니다.");
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPlaceholderImage(seed) {
  const url = `https://picsum.photos/seed/remind-${seed}/640/480.jpg`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`이미지 다운로드 실패 (${seed}): ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: res.headers.get("content-type") || "image/jpeg" };
}

async function getSubjects(supabase, userId) {
  const { data, error } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("subject_id", "__subjects__")
    .maybeSingle();

  if (error) throw error;

  const subjects = data?.settings?.subjects;
  if (Array.isArray(subjects) && subjects.length > 0) {
    return subjects.map((s) => ({ id: s.id, name: String(s.name) }));
  }
  return DEFAULT_SUBJECTS;
}

async function removeOldSeedQuestions(supabase, userId) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, keywords")
    .eq("user_id", userId);

  if (error) throw error;

  const ids = (data ?? [])
    .filter((q) => Array.isArray(q.keywords) && q.keywords.includes(SEED_TAG))
    .map((q) => q.id);

  if (ids.length === 0) {
    console.log("⏭  이전 seed-demo 문제 없음");
    return 0;
  }

  const { error: delError } = await supabase
    .from("questions")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);

  if (delError) throw delError;
  console.log(`🗑  이전 seed-demo 문제 ${ids.length}개 삭제`);
  return ids.length;
}

async function uploadImage(supabase, userId, buffer, contentType, label) {
  const ext = contentType.includes("png") ? "png" : "jpg";
  const path = `${userId}/seed-${label}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("question-images")
    .upload(path, buffer, { contentType, upsert: false });

  if (error) throw error;

  return supabase.storage.from("question-images").getPublicUrl(path).data.publicUrl;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL 과 API 키가 필요합니다.");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== Re:mind 테스트 문제 시드 ===\n");

  const { data: signIn, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: "student@demo.app",
      password: "student123",
    });

  if (signInError || !signIn.user) {
    console.error("❌ student@demo.app 로그인 실패:", signInError?.message);
    console.error("   먼저 npm.cmd run supabase:seed 를 실행하세요.");
    process.exit(1);
  }

  const userId = signIn.user.id;
  console.log(`✅ 로그인: ${userId}`);

  await removeOldSeedQuestions(supabase, userId);

  const subjects = await getSubjects(supabase, userId);
  console.log(`📚 과목 ${subjects.length}개: ${subjects.map((s) => s.name).join(", ")}\n`);

  let total = 0;
  const today = new Date();

  for (const subject of subjects) {
    console.log(`▶ ${subject.name} (${subject.id}) — ${QUESTIONS_PER_SUBJECT}문제`);

    for (let i = 1; i <= QUESTIONS_PER_SUBJECT; i++) {
      const seedKey = `${subject.id}-${i}`;
      const { buffer, contentType } = await fetchPlaceholderImage(seedKey);
      const imageUrl = await uploadImage(
        supabase,
        userId,
        buffer,
        contentType,
        seedKey,
      );

      const nextReview = new Date(today);
      nextReview.setDate(today.getDate() + (i % 5));

      const archived = i > 17;
      const phase = archived ? "completed" : i % 7 === 0 ? "long" : i % 3 === 0 ? "medium" : "short";

      const row = {
        user_id: userId,
        subject_id: subject.id,
        image_url: imageUrl,
        answer_text: i % 4 === 0 ? `해설 예시 ${subject.name} ${i}번` : null,
        keywords: [SEED_TAG, `${subject.name}`, `문제${i}`],
        source: `테스트 ${subject.name} ${i}번`,
        wrong_reason: WRONG_REASONS[i % WRONG_REASONS.length],
        reflection_memo:
          i % 2 === 0
            ? `${subject.name} ${i}번 — 개념을 다시 정리해야 해요. (테스트 메모)`
            : null,
        phase,
        streak_count: i % 4,
        next_review_date: nextReview.toISOString(),
        archived,
      };

      const { error: insertError } = await supabase.from("questions").insert(row);
      if (insertError) {
        console.error(`   ❌ ${i}번 실패:`, insertError.message);
        if (insertError.message.includes("reflection_memo")) {
          console.error(
            "   → 002_question_reflection.sql 을 Supabase SQL Editor에서 실행했는지 확인하세요.",
          );
        }
        process.exit(1);
      }

      total += 1;
      if (i % 5 === 0) process.stdout.write(`   ${i}/${QUESTIONS_PER_SUBJECT}…\n`);
      await sleep(120);
    }

    console.log(`   ✅ ${subject.name} 완료\n`);
  }

  console.log(`✨ 총 ${total}개 문제 등록 완료 (${subjects.length}과목 × ${QUESTIONS_PER_SUBJECT})`);
  console.log("   보관함에서 seed-demo 키워드로 검색할 수 있어요.");
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
