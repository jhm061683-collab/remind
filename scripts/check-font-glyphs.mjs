/** PDF 본문 폰트(NotoSansKR 서브셋)의 수학 글리프 커버리지 확인 */
import * as fontkit from "fontkit";

const font = fontkit.openSync("public/fonts/NotoSansKR-Regular.woff");
const chars = [
  "∥", "‖", "⊥", "⟂", "√", "∠", "×", "÷", "±", "≤", "≥", "≠",
  "π", "θ", "Σ", "∫", "∞", "①", "▱", "△", "°", "·",
];
const result = {};
for (const c of chars) {
  result[c] = font.hasGlyphForCodePoint(c.codePointAt(0));
}
console.log(JSON.stringify(result, null, 2));
