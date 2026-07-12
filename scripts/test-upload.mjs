/**
 * Storage 업로드 + questions insert 테스트
 * npm.cmd run supabase:test-upload
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

function loadEnvLocal() {
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

const supabase = createClient(url, anonKey);

const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
  email: "student@demo.app",
  password: "student123",
});

if (signInError || !signIn.user) {
  console.error("❌ 로그인 실패:", signInError?.message);
  process.exit(1);
}

const userId = signIn.user.id;
console.log("✅ 로그인:", userId);

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const path = `${userId}/test-${Date.now()}.png`;

const { error: uploadError } = await supabase.storage
  .from("question-images")
  .upload(path, png, { contentType: "image/png" });

if (uploadError) {
  console.error("❌ Storage 업로드 실패:", uploadError.message);
  process.exit(1);
}

console.log("✅ Storage 업로드 OK:", path);

const { error: insertError } = await supabase.from("questions").insert({
  user_id: userId,
  subject_id: "math",
  image_url: supabase.storage.from("question-images").getPublicUrl(path).data.publicUrl,
  keywords: ["test"],
  phase: "short",
  streak_count: 0,
  next_review_date: new Date().toISOString(),
});

if (insertError) {
  console.error("❌ questions insert 실패:", insertError.message);
  process.exit(1);
}

console.log("✅ questions insert OK");
await supabase.storage.from("question-images").remove([path]);
console.log("✨ 테스트 완료 — 업로드 경로 정상");
