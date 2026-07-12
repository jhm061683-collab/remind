/**
 * Supabase 데모 계정 3개 생성 (SQL 마이그레이션 실행 후 1회)
 *
 * 필요: .env.local 에 아래 3개
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (Settings → API → service_role — 앱 코드에 넣지 마세요)
 *
 * 실행: npm.cmd run supabase:seed
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

const DEMO_USERS = [
  {
    email: "student@demo.app",
    password: "student123",
    user_metadata: {
      role: "student",
      display_name: "김학생",
      username: "student",
    },
  },
  {
    email: "admin@demo.app",
    password: "admin123",
    user_metadata: {
      role: "admin",
      display_name: "박원장",
      username: "admin",
    },
  },
  {
    email: "teacher@demo.app",
    password: "teacher123",
    user_metadata: {
      role: "sub_admin",
      display_name: "이선생",
      username: "teacher",
    },
  },
];

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (error) throw error;
  return data.users;
}

async function main() {
  console.log("🔍 Supabase 연결 확인…");
  const existing = await listUsers();
  const byEmail = new Map(existing.map((u) => [u.email?.toLowerCase(), u]));

  for (const demo of DEMO_USERS) {
    const found = byEmail.get(demo.email.toLowerCase());
    if (found) {
      console.log(`⏭  ${demo.email} — 이미 있음 (건너뜀)`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: demo.email,
      password: demo.password,
      email_confirm: true,
      user_metadata: demo.user_metadata,
    });

    if (error) {
      console.error(`❌ ${demo.email} 생성 실패:`, error.message);
      process.exit(1);
    }

    console.log(`✅ ${demo.email} 생성됨 (id: ${data.user.id})`);
  }

  // profiles 트리거 확인
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("username, role, display_name");

  if (profileError) {
    console.error(
      "\n⚠️  profiles 조회 실패 — SQL 마이그레이션을 먼저 실행했는지 확인하세요:",
      profileError.message,
    );
    process.exit(1);
  }

  console.log("\n📋 profiles:");
  for (const p of profiles ?? []) {
    console.log(`   - ${p.username} (${p.role}) ${p.display_name}`);
  }

  console.log("\n✨ 완료! npm.cmd run dev 재시작 후 student / student123 으로 로그인해 보세요.");
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
