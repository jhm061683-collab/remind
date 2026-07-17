/**
 * 플랫폼(최종) 관리자 계정 1개 생성/갱신
 *
 * 로그인: 학원코드 PLATFORM / 아이디 owner / 비밀번호 owner123
 * (비밀번호는 환경변수 PLATFORM_ADMIN_PASSWORD 로 바꿀 수 있음)
 *
 * 실행: npm.cmd run supabase:seed-platform
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

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

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const password = env.PLATFORM_ADMIN_PASSWORD || "owner123";
const username = "owner";
const email = "owner@platform.app";
const displayName = "플랫폼관리자";

if (!url || !serviceKey) {
  console.error(
    "❌ .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: listed, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw listError;

  let user = listed.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "platform_admin",
        display_name: displayName,
        username,
      },
    });
    if (error || !data.user) {
      console.error("❌ 계정 생성 실패:", error?.message);
      process.exit(1);
    }
    user = data.user;
    console.log(`✅ 생성: ${email}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        role: "platform_admin",
        display_name: displayName,
        username,
      },
    });
    if (error) {
      console.error("❌ 계정 갱신 실패:", error.message);
      process.exit(1);
    }
    console.log(`⏭  이미 있음 → 비밀번호/메타데이터 갱신: ${email}`);
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    role: "platform_admin",
    display_name: displayName,
    username,
    academy_id: null,
    auth_email: email,
    is_director: false,
  });

  if (profileError) {
    console.error("❌ profiles 갱신 실패:", profileError.message);
    console.error("   → 022_platform_multi_tenant.sql 을 먼저 실행했는지 확인하세요.");
    process.exit(1);
  }

  console.log("\n로그인");
  console.log("  학원 코드: PLATFORM");
  console.log(`  아이디: ${username}`);
  console.log(`  비밀번호: ${password}`);
  console.log("  화면: /platform");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
