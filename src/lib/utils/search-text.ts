/** 검색어를 공백/쉼표 기준으로 나눕니다. */
export function splitSearchTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,，]+/)
    .filter(Boolean);
}

/** 모든 토큰이 haystack 안에 포함되면 true (부분 일치) */
export function matchesSearchQuery(haystack: string, query: string): boolean {
  const tokens = splitSearchTokens(query);
  if (tokens.length === 0) return true;
  const normalized = haystack.toLowerCase();
  return tokens.every((token) => normalized.includes(token));
}
