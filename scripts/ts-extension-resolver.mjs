/**
 * node 테스트 스크립트용 해석 훅.
 * Node의 TypeScript 실행은 확장자 없는 상대 경로와 `@/` 별칭을 못 찾으므로
 * 앱 코드를 그대로 둔 채 테스트에서만 보완한다.
 *
 * 사용: node --import ./scripts/ts-extension-resolver.mjs scripts/test-xxx.mjs
 */
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.dirname(fileURLToPath(new URL("../", import.meta.url)));
const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx", ".mjs", ".js"];

function firstExisting(baseUrl) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = new URL(baseUrl.href + suffix);
    if (existsSync(fileURLToPath(candidate))) return candidate.href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = pathToFileURL(
        path.join(ROOT, "src", specifier.slice(2)),
      );
      const url = existsSync(fileURLToPath(base))
        ? base.href
        : firstExisting(base);
      if (url) return { url, shortCircuit: true };
    }
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && context.parentURL) {
        const url = firstExisting(new URL(specifier, context.parentURL));
        if (url) return { url, shortCircuit: true };
      }
      throw err;
    }
  },
});
