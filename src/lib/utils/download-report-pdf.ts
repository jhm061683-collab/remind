import { toPng } from "html-to-image";

const A4_CONTENT_WIDTH_PX = 794;
const COLUMN_CONTENT_WIDTH_PX = 372;

async function waitForImages(root: ParentNode): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
  await new Promise((r) => window.setTimeout(r, 60));
}

type CapturedBlock = {
  dataUrl: string;
  width: number;
  height: number;
  span: "full" | "col";
  kind: string;
  /** true면 이 블록 앞에서 무조건 새 페이지 */
  breakBefore: boolean;
};

/**
 * 캡처용으로 요소를 화면 밖 고정 너비 호스트에 복제한다.
 */
async function captureElementPng(
  element: HTMLElement,
  widthPx = A4_CONTENT_WIDTH_PX,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${widthPx}px`,
    "background:#ffffff",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${widthPx}px`;
  clone.style.maxWidth = `${widthPx}px`;
  clone.style.minWidth = `${widthPx}px`;
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  // 문항 블록만 캡처해도 본문 그림 크기 규칙이 유지되게 함
  const style = document.createElement("style");
  style.textContent = `
    .packet-problem-body img {
      max-height: var(--packet-fig-max, 148px) !important;
      width: auto !important;
      max-width: 100% !important;
      object-fit: contain !important;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .packet-problem-body figure {
      margin-top: 0.35rem !important;
      margin-bottom: 0.35rem !important;
      padding: 0.25rem !important;
    }
  `;
  host.appendChild(style);
  host.appendChild(clone);
  document.body.appendChild(host);

  try {
    await waitForImages(clone);
    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio: 1.75,
      backgroundColor: "#ffffff",
      width: widthPx,
      style: {
        width: `${widthPx}px`,
        maxWidth: `${widthPx}px`,
        transform: "none",
      },
    });

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image load failed"));
      img.src = dataUrl;
    });
    if (img.width < 40) {
      throw new Error("PDF_CAPTURE_WIDTH_COLLAPSED");
    }
    return { dataUrl, width: img.width, height: img.height };
  } finally {
    host.remove();
  }
}

async function toJpegDataUrl(
  pngDataUrl: string,
  quality = 0.9,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(pngDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: pngDataUrl, width: img.width, height: img.height };
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  return {
    dataUrl: canvas.toDataURL("image/jpeg", quality),
    width: img.width,
    height: img.height,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

/** 보고서 DOM을 PNG→PDF로 변환 (긴 문서는 가로 맞춤 후 페이지 분할 — 블록 중간 절단 가능) */
export async function downloadElementAsPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { dataUrl, width, height } = await captureElementPng(element);
  const jpeg = await toJpegDataUrl(dataUrl);
  const img = await loadImage(jpeg.dataUrl);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = maxWidth / width;
  const drawWidth = maxWidth;
  const x = margin;
  const y = margin;

  let srcY = 0;
  const srcPageHeight = maxHeight / scale;
  let first = true;

  while (srcY < height - 0.5) {
    if (!first) pdf.addPage();
    first = false;

    const sliceHeight = Math.min(srcPageHeight, height - srcY);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = width;
    sliceCanvas.height = Math.max(1, Math.ceil(sliceHeight));
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      img,
      0,
      srcY,
      width,
      sliceHeight,
      0,
      0,
      width,
      sliceHeight,
    );
    const sliceUrl = sliceCanvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(
      sliceUrl,
      "JPEG",
      x,
      y,
      drawWidth,
      sliceHeight * scale,
    );
    srcY += sliceHeight;
  }

  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

/**
 * 오답 모음: 블록 단위 캡처 후 A4 2단으로 바로 PDF 다운로드.
 * 문항 중간을 자르지 않고, 한 칸에 안 들어가면 옆 단·다음 페이지로 통째로 이동.
 */
export async function downloadTwoColumnPacketPdf(
  root: HTMLElement,
  fileName: string,
  onProgress?: (label: string) => void,
): Promise<void> {
  const nodes = [
    ...root.querySelectorAll<HTMLElement>("[data-pdf-block]"),
  ];
  if (nodes.length === 0) {
    await downloadElementAsPdf(root, fileName);
    return;
  }

  const captured: CapturedBlock[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]!;
    const kind = el.dataset.pdfBlock ?? `block-${i}`;
    let span: "full" | "col" =
      el.dataset.pdfSpan === "full" ? "full" : "col";
    const breakBefore =
      el.dataset.pdfBreak === "before" || kind === "answers-header";
    let widthPx =
      span === "full" ? A4_CONTENT_WIDTH_PX : COLUMN_CONTENT_WIDTH_PX;
    onProgress?.(`캡처 중… ${i + 1}/${nodes.length}`);
    let png = await captureElementPng(el, widthPx);

    // 국어·영어 긴 지문: 2단에 넣으면 바늘처럼 줄어들므로 전폭으로 다시 캡처
    if (
      span === "col" &&
      kind.startsWith("item-") &&
      png.height / Math.max(1, png.width) > 2.35
    ) {
      span = "full";
      widthPx = A4_CONTENT_WIDTH_PX;
      onProgress?.(`긴 지문 전폭 캡처… ${i + 1}/${nodes.length}`);
      png = await captureElementPng(el, widthPx);
    }

    const jpeg = await toJpegDataUrl(png.dataUrl, 0.88);
    captured.push({
      dataUrl: jpeg.dataUrl,
      width: jpeg.width,
      height: jpeg.height,
      span,
      kind,
      breakBefore,
    });
  }

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 22;
  const gap = 8;
  const colGap = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const colWidth = (maxWidth - colGap) / 2;
  const colX = [margin, margin + colWidth + colGap] as const;

  let colY = [margin, margin];
  let pageUsed = false;

  const newPage = () => {
    pdf.addPage();
    colY = [margin, margin];
    pageUsed = false;
  };

  onProgress?.("PDF 배치 중…");

  const pageBottom = () => pageHeight - margin;

  /** 전폭 배치. 한 페이지보다 길면 가로 폭은 유지한 채 세로만 페이지로 이어 붙임(가늘게 찌그러지지 않음). */
  const placeFullWidthBlock = async (block: CapturedBlock) => {
    const scale = maxWidth / block.width;
    const fullHeight = block.height * scale;

    if (block.kind === "cover") {
      if (pageUsed) newPage();
      let drawHeight = fullHeight;
      let drawWidth = maxWidth;
      if (drawHeight > maxHeight) {
        const shrink = maxHeight / drawHeight;
        drawWidth *= shrink;
        drawHeight = maxHeight;
      }
      pdf.addImage(
        block.dataUrl,
        "JPEG",
        margin + (maxWidth - drawWidth) / 2,
        margin,
        drawWidth,
        drawHeight,
      );
      pageUsed = true;
      newPage();
      return;
    }

    // 현재 페이지 남은 칸이 거의 없으면 새 페이지
    const startY = Math.max(colY[0], colY[1]);
    if (pageUsed && startY > margin + 4) {
      const remain = pageBottom() - startY;
      // 남은 높이가 120pt 미만이거나, 전폭 블록이 남은 칸에 거의 안 들어가면 새 페이지
      if (remain < 120 || (fullHeight > remain && remain < maxHeight * 0.55)) {
        newPage();
      }
    }

    // 한 페이지 이하면 통째로
    if (fullHeight <= maxHeight + 0.5) {
      let y = Math.max(colY[0], colY[1]);
      if (y + fullHeight > pageBottom() && pageUsed) {
        newPage();
        y = margin;
      }
      pdf.addImage(
        block.dataUrl,
        "JPEG",
        margin,
        y,
        maxWidth,
        fullHeight,
      );
      const nextY = y + fullHeight + gap;
      colY = [nextY, nextY];
      pageUsed = true;
      return;
    }

    // 국어·영어 긴 지문: 전폭 유지하며 페이지 단위로만 잘라 이어붙임
    if (pageUsed && Math.max(colY[0], colY[1]) > margin + 1) {
      newPage();
    }
    const img = await loadImage(block.dataUrl);
    const srcPageHeight = maxHeight / scale;
    let srcY = 0;
    while (srcY < block.height - 0.5) {
      if (srcY > 0) newPage();
      const sliceSrcH = Math.min(srcPageHeight, block.height - srcY);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = block.width;
      sliceCanvas.height = Math.max(1, Math.ceil(sliceSrcH));
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        img,
        0,
        srcY,
        block.width,
        sliceSrcH,
        0,
        0,
        block.width,
        sliceSrcH,
      );
      const sliceUrl = sliceCanvas.toDataURL("image/jpeg", 0.9);
      const drawH = sliceSrcH * scale;
      pdf.addImage(sliceUrl, "JPEG", margin, margin, maxWidth, drawH);
      srcY += sliceSrcH;
      colY = [margin + drawH + gap, margin + drawH + gap];
      pageUsed = true;
    }
  };

  for (const block of captured) {
    // 빠른정답: 마지막 문제가 끝난 뒤 무조건 새 페이지
    if (block.breakBefore && pageUsed) {
      newPage();
    }

    // 2단 기준으로 한 페이지를 거의 넘는 긴 문항(지문)은 전폭으로
    const heightIfCol = (block.height * colWidth) / block.width;
    const treatAsFull =
      block.span === "full" ||
      (block.kind.startsWith("item-") && heightIfCol > maxHeight * 0.92);

    if (treatAsFull) {
      await placeFullWidthBlock(block);
      continue;
    }

    const drawWidth = colWidth;
    const drawHeight = heightIfCol;

    const fitsLeft = colY[0] + drawHeight <= pageBottom() + 0.5;
    const fitsRight = colY[1] + drawHeight <= pageBottom() + 0.5;

    if (fitsLeft) {
      pdf.addImage(
        block.dataUrl,
        "JPEG",
        colX[0],
        colY[0],
        drawWidth,
        drawHeight,
      );
      colY[0] += drawHeight + gap;
      pageUsed = true;
    } else if (fitsRight) {
      pdf.addImage(
        block.dataUrl,
        "JPEG",
        colX[1],
        colY[1],
        drawWidth,
        drawHeight,
      );
      colY[1] += drawHeight + gap;
      pageUsed = true;
    } else {
      newPage();
      pdf.addImage(
        block.dataUrl,
        "JPEG",
        colX[0],
        colY[0],
        drawWidth,
        drawHeight,
      );
      colY[0] += drawHeight + gap;
      pageUsed = true;
    }
  }

  pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

/** @deprecated → downloadTwoColumnPacketPdf */
export async function downloadSectionedElementAsPdf(
  root: HTMLElement,
  fileName: string,
  onProgress?: (label: string) => void,
): Promise<void> {
  await downloadTwoColumnPacketPdf(root, fileName, onProgress);
}

export async function printElementAsPdf(
  element: HTMLElement,
  title = "document",
): Promise<void> {
  await waitForImages(element);

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    [
      "position:fixed",
      "left:-10000px",
      "top:0",
      "width:794px",
      "height:1123px",
      "border:0",
      "opacity:0",
      "pointer-events:none",
    ].join(";"),
  );
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument;
  const iwin = iframe.contentWindow;
  if (!idoc || !iwin) {
    iframe.remove();
    throw new Error("PRINT_FRAME_UNAVAILABLE");
  }

  const headBits: string[] = [
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\">",
    `<title>${title.replaceAll("<", "").replaceAll(">", "")}</title>`,
  ];

  for (const node of document.querySelectorAll(
    'link[rel="stylesheet"], style',
  )) {
    headBits.push(node.outerHTML);
  }

  headBits.push(`
<style>
  @page { size: A4; margin: 10mm; }
  html, body { margin: 0; padding: 0; background: #fff !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .wrong-note-packet-doc { width: 100% !important; min-width: 0 !important; max-width: 100% !important; }
  .packet-items-grid { display: grid !important; grid-template-columns: 1fr 1fr; gap: 8px; }
  [data-pdf-block] { break-inside: avoid; page-break-inside: avoid; }
  [data-pdf-span="full"] { grid-column: 1 / -1; }
  img { max-width: 100% !important; height: auto !important; }
</style></head><body></body></html>`);

  idoc.open();
  idoc.write(headBits.join(""));
  idoc.close();

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = "100%";
  clone.style.minWidth = "0";
  clone.style.maxWidth = "100%";
  idoc.body.appendChild(clone);

  await waitForImages(idoc);
  await new Promise((r) => window.setTimeout(r, 250));

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => iframe.remove(), 300);
      resolve();
    };
    iwin.addEventListener("afterprint", finish, { once: true });
    window.setTimeout(finish, 120_000);
    iwin.focus();
    iwin.print();
  });
}

export async function downloadReportPathAsPdf(
  path: string,
  fileName: string,
): Promise<void> {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "900px";
  iframe.style.height = "1400px";
  iframe.style.border = "0";
  iframe.src = path;

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("report load failed"));
    document.body.appendChild(iframe);
  });

  try {
    await new Promise((r) => window.setTimeout(r, 600));
    const doc = iframe.contentDocument;
    const target =
      (doc?.querySelector("article") as HTMLElement | null) ??
      doc?.body ??
      null;
    if (!target) throw new Error("report content missing");
    await downloadElementAsPdf(target, fileName);
  } finally {
    iframe.remove();
  }
}
