/**
 * 관리자(원장) display_name 이 「박원장」인 경우 「장현문」으로 갱신
 * 실행: node scripts/fix-director-name.mjs
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
if (!url || !serviceKey) {
  console.error("❌ SUPABASE URL / SERVICE_ROLE_KEY 필요");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: before, error: listErr } = await supabase
    .from("profiles")
    .select("id, username, role, display_name, nickname, is_director")
    .in("role", ["admin", "sub_admin"]);

  if (listErr) {
    console.error("❌ 조회 실패:", listErr.message);
    process.exit(1);
  }

  console.log("📋 현재 스태프 프로필:");
  for (const p of before ?? []) {
    console.log(
      `   - ${p.username} (${p.role}) name=${p.display_name} nick=${p.nickname ?? "-"} director=${p.is_director}`,
    );
  }

  const targets = (before ?? []).filter((p) => {
    const name = String(p.display_name ?? "");
    return (
      p.role === "admin" ||
      name === "박원장" ||
      name === "박원장님" ||
      /^박원장/.test(name)
    );
  });

  if (targets.length === 0) {
    console.log("⏭  바꿀 대상이 없습니다.");
    return;
  }

  for (const p of targets) {
    if (p.role !== "admin" && p.display_name !== "박원장" && p.display_name !== "박원장님") {
      continue;
    }
    // admin 은 전부 장현문으로, 그 외는 박원장만
    const shouldRename =
      p.role === "admin" ||
      p.display_name === "박원장" ||
      p.display_name === "박원장님";
    if (!shouldRename) continue;

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: "장현문",
        is_director: true,
      })
      .eq("id", p.id);

    if (error) {
      console.error(`❌ ${p.username} 실패:`, error.message);
      continue;
    }
    console.log(`✅ ${p.username}: ${p.display_name} → 장현문`);
  }

  const { data: after } = await supabase
    .from("profiles")
    .select("username, role, display_name")
    .in("role", ["admin", "sub_admin"]);

  console.log("\n📋 갱신 후:");
  for (const p of after ?? []) {
    console.log(`   - ${p.username} (${p.role}) ${p.display_name}`);
  }
}

main().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
