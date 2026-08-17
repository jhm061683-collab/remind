import * as fontkit from "fontkit";
const font = fontkit.openSync("public/fonts/NotoSansMath-Regular.woff");
const chars = ["∥","‖","⊥","⟂","∠","√","≤","≥","≠","π","θ","Σ","∫","∞","△","▱","±","×","÷","·","°","⁰","¹","²","³"];
const out = {}; for (const c of chars) out[c] = font.hasGlyphForCodePoint(c.codePointAt(0));
console.log(JSON.stringify(out, null, 2));
