import { jsPDF } from "jspdf";
import { sanitizeUrl } from "./parse";

const CREAM: [number, number, number] = [250, 247, 242];
const INK: [number, number, number] = [26, 24, 22];
const GOLD: [number, number, number] = [176, 141, 62];
const BROWN: [number, number, number] = [107, 84, 67];

const imageCache = new Map<string, string | null>();

export async function loadImage(rawUrl: string): Promise<string | null> {
  const url = sanitizeUrl(rawUrl);
  if (!url) return null;
  if (imageCache.has(url)) return imageCache.get(url) ?? null;
  try {
    const res = await fetch(`/api/public/img?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error("bad status");
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    imageCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    imageCache.set(url, null);
    return null;
  }
}

export type PdfBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "section"; text: string }
  | { type: "text"; text: string }
  | { type: "kv"; label: string; value: string }
  | { type: "divider" }
  | { type: "image"; url: string; width?: number; height?: number; caption?: string }
  | {
      type: "photoGrid";
      columns?: number;
      cells: { url: string; lines: string[]; status?: "matched" | "missing" }[];
    }
  | { type: "row"; cells: string[]; header?: boolean }
  | {
      type: "listItem";
      url: string;
      lines: string[];
      noteLabel: string;
    }
  | { type: "pageBreak" };


export async function buildPdf(fileName: string, header: string, blocks: PdfBlock[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const paintBg = () => {
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, pw, ph, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 0, pw, 6, "F");
  };
  paintBg();

  const ensure = (h: number) => {
    if (y + h > ph - M) {
      doc.addPage();
      paintBg();
      y = M;
    }
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BROWN);
  doc.text(header.toUpperCase(), M, y + 4);
  y += 22;

  for (const b of blocks) {
    switch (b.type) {
      case "pageBreak": {
        doc.addPage();
        paintBg();
        y = M;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BROWN);
        doc.text(header.toUpperCase(), M, y + 4);
        y += 22;
        break;
      }
      case "title": {
        ensure(46);
        doc.setFont("times", "bold");
        doc.setFontSize(26);
        doc.setTextColor(...INK);
        const lines = doc.splitTextToSize(b.text.toUpperCase(), pw - 2 * M);
        doc.text(lines, M, y + 24);
        y += 24 + (lines.length - 1) * 28 + 14;
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(1.5);
        doc.line(M, y, pw - M, y);
        y += 18;
        break;
      }
      case "subtitle": {
        ensure(30);
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...BROWN);
        doc.text(b.text, M, y + 12);
        y += 26;
        break;
      }
      case "section": {
        ensure(28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...GOLD);
        doc.text(b.text.toUpperCase(), M, y + 10);
        y += 22;
        break;
      }
      case "text": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        const lines = doc.splitTextToSize(b.text, pw - 2 * M);
        ensure(lines.length * 13 + 6);
        doc.text(lines, M, y + 9);
        y += lines.length * 13 + 6;
        break;
      }
      case "kv": {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const vLines = doc.splitTextToSize(String(b.value), pw - M - (M + 120));
        ensure(vLines.length * 13 + 5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BROWN);
        doc.text(`${b.label}:`, M, y + 9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...INK);
        doc.text(vLines, M + 120, y + 9);
        y += vLines.length * 13 + 5;
        break;
      }
      case "divider": {
        ensure(16);
        doc.setDrawColor(215, 205, 190);
        doc.setLineWidth(0.6);
        doc.line(M, y + 6, pw - M, y + 6);
        y += 16;
        break;
      }
      case "row": {
        ensure(18);
        const colW = (pw - 2 * M) / b.cells.length;
        doc.setFont("helvetica", b.header ? "bold" : "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...(b.header ? BROWN : INK));
        b.cells.forEach((c, i) => {
          const t = doc.splitTextToSize(String(c ?? ""), colW - 8)[0] ?? "";
          doc.text(t, M + i * colW, y + 9);
        });
        y += 16;
        break;
      }
      case "image": {
        const data = await loadImage(b.url);
        if (!data) break;
        const w = b.width ?? 120;
        const h = b.height ?? 160;
        ensure(h + 16);
        try {
          doc.addImage(data, "JPEG", M, y, w, h, undefined, "FAST");
        } catch {
          break;
        }
        if (b.caption) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...BROWN);
          doc.text(doc.splitTextToSize(b.caption, pw - 2 * M - w - 16), M + w + 12, y + 14);
        }
        y += h + 14;
        break;
      }
      case "listItem": {
        const imgW = 90;
        const imgH2 = 118;
        const gp = 14;
        const detailW = 190;
        const noteX = M + imgW + gp + detailW + gp;
        const noteW = pw - M - noteX;
        const blockH = imgH2 + 18;
        ensure(blockH);
        const data = await loadImage(b.url);
        if (data) {
          try {
            doc.addImage(data, "JPEG", M, y, imgW, imgH2, undefined, "FAST");
          } catch {
            doc.setFillColor(235, 229, 219);
            doc.rect(M, y, imgW, imgH2, "F");
          }
        } else {
          doc.setFillColor(235, 229, 219);
          doc.rect(M, y, imgW, imgH2, "F");
        }
        let ty = y + 14;
        b.lines.forEach((line, li) => {
          doc.setFont("helvetica", li === 0 ? "bold" : "normal");
          doc.setFontSize(li === 0 ? 11 : 9.5);
          doc.setTextColor(...(li === 0 ? INK : BROWN));
          const wrapped = doc.splitTextToSize(line, detailW);
          doc.text(wrapped, M + imgW + gp, ty);
          ty += wrapped.length * (li === 0 ? 14 : 12);
        });
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.8);
        doc.roundedRect(noteX, y, noteW, imgH2, 4, 4, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...BROWN);
        doc.text(b.noteLabel.toUpperCase(), noteX + 8, y + 14);
        doc.setDrawColor(225, 216, 202);
        doc.setLineWidth(0.4);
        for (let ly = y + 32; ly < y + imgH2 - 8; ly += 16) {
          doc.line(noteX + 8, ly, noteX + noteW - 8, ly);
        }
        y += blockH;
        break;
      }
      case "photoGrid": {
        const cols = b.columns ?? 4;
        const gap = 12;
        const cellW = (pw - 2 * M - gap * (cols - 1)) / cols;
        const imgH = cellW * 1.25;
        for (let start = 0; start < b.cells.length; start += cols) {
          const rowCells = b.cells.slice(start, start + cols);
          const datas = await Promise.all(rowCells.map((c) => loadImage(c.url)));
          const maxLines = Math.max(...rowCells.map((c) => c.lines.length));
          const blockH = imgH + 8 + maxLines * 11 + 16;
          ensure(blockH);
          rowCells.forEach((c, i) => {
            const x = M + i * (cellW + gap);
            const data = datas[i];
            if (data) {
              try {
                doc.addImage(data, "JPEG", x, y, cellW, imgH, undefined, "FAST");
              } catch {
                /* skip */
              }
            } else {
              doc.setFillColor(235, 229, 219);
              doc.rect(x, y, cellW, imgH, "F");
            }
            let ty = y + imgH + 11;
            doc.setFontSize(8);
            c.lines.forEach((line, li) => {
              doc.setFont("helvetica", li === 0 ? "bold" : "normal");
              doc.setTextColor(...(li === 0 ? INK : BROWN));
              doc.text(doc.splitTextToSize(line, cellW)[0] ?? "", x, ty);
              ty += 10;
            });
            if (c.status) {
              const matched = c.status === "matched";
              doc.setFillColor(...(matched ? ([46, 125, 50] as [number, number, number]) : ([176, 42, 42] as [number, number, number])));
              const label = matched ? "MATCHED" : "MISSING";
              doc.setFont("helvetica", "bold");
              doc.setFontSize(7);
              const tw = doc.getTextWidth(label) + 10;
              doc.roundedRect(x, ty - 7, tw, 11, 3, 3, "F");
              doc.setTextColor(255, 255, 255);
              doc.text(label, x + 5, ty + 0.5);
            }
          });
          y += blockH;
        }
        break;
      }

    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BROWN);
    doc.text(`Page ${i} / ${pages}`, pw - M, ph - 20, { align: "right" });
  }

  doc.save(fileName);
}
