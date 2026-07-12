/**
 * Supabase 연결·스키마·데모 계정 상태 확인
 * 실행: npm.cmd run supabase:check
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

function loadEnvLocal() {
  if (!existsSync(envPath)) return {};
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

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("=== Re:mind Supabase 점검 ===\n");

if (!url || !anonKey) {
  console.log("❌ .env.local 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 없음");
  console.log("   → localStorage 모드로 동작 중입니다.\n");
  process.exit(1);
}

console.log("✅ 환경 변수 있음");
console.log(`   URL: ${url}\n`);

const supabase = createClient(url, anonKey);

const tables = [
  "academies",
  "profiles",
  "review_settings",
  "questions",
  "custom_preset_overrides",
];

for (const table of tables) {
  const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
    console.log("   → SQL Editor에서 supabase/migrations/001_initial_schema.sql 실행 필요\n");
  } else {
    console.log(`✅ ${table} 테이블 접근 OK`);
  }
}

const { data: buckets } = await supabase.storage.listBuckets();
const hasBucket = buckets?.some((b) => b.name === "question-images");
console.log(hasBucket ? "✅ question-images 스토리지 버킷 OK" : "❌ question-images 버킷 없음 (SQL 재실행)");

const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
  email: "student@demo.app",
  password: "student123",
});

if (signInError) {
  console.log(`\n❌ student 로그인 실패: ${signInError.message}`);
  console.log("   → npm.cmd run supabase:seed 로 데모 계정 생성\n");
} else {
  console.log("\n✅ student@demo.app 로그인 OK");
  await supabase.auth.signOut();
  console.log("   상단에 ☁️ 클라우드 저장 모드 배너가 보이면 성공입니다.\n");
}
