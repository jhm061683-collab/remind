export function parseKeywords(input: string): string[] {
  return input
    .split(/[,，#\s]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function formatKeywords(keywords: string[]): string {
  return keywords.join(", ");
}
