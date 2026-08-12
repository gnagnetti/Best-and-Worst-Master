import ExcelJS from "exceljs";
import { loadImage } from "./pdf";

export type XlsRow = {
  foto: string;
  model: string;
  color: string;
  last: string | number;
};

/** Simple (photo-less) workbook used by tabular reports. */
export async function buildSimpleWorkbook(
  fileName: string,
  sheetName: string,
  headers: { header: string; width: number }[],
  rows: (string | number)[][],
  headerLines: string[] = [],
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = headers.map((h) => ({ header: h.header, width: h.width }));
  let headerRow = 1;
  if (headerLines.length) {
    ws.spliceRows(1, 0, ...headerLines.map((t) => [t]), []);
    headerLines.forEach((_, i) => {
      ws.getRow(i + 1).font = { name: "Arial", bold: true };
    });
    headerRow = headerLines.length + 2;
    ws.getRow(headerRow).values = headers.map((h) => h.header);
  }
  ws.getRow(headerRow).font = { name: "Arial", bold: true };
  for (const [i, r] of rows.entries()) {
    const row = ws.getRow(headerRow + 1 + i);
    row.values = r;
    row.font = { name: "Arial" };
    row.commit();
  }
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function buildPhotoWorkbook(
  fileName: string,
  sheetName: string,
  lastHeader: string,
  rows: XlsRow[],
  headerLines: string[] = [],
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = [
    { header: "Foto", key: "foto", width: 16 },
    { header: "Modello", key: "model", width: 34 },
    { header: "Colore", key: "color", width: 16 },
    { header: lastHeader, key: "last", width: 26 },
  ];
  let headerRow = 1;
  if (headerLines.length) {
    ws.spliceRows(1, 0, ...headerLines.map((t) => [t]), []);
    headerLines.forEach((_, i) => {
      ws.getRow(i + 1).font = { name: "Arial", bold: true };
    });
    headerRow = headerLines.length + 2;
    const hr = ws.getRow(headerRow);
    hr.values = ["Foto", "Modello", "Colore", lastHeader];
  }
  ws.getRow(headerRow).font = { name: "Arial", bold: true };
  ws.getRow(headerRow).height = 20;

  for (const [i, r] of rows.entries()) {
    const rowIdx = headerRow + 1 + i;
    const row = ws.getRow(rowIdx);
    row.height = 75;
    row.font = { name: "Arial" };
    row.getCell(2).value = r.model;
    row.getCell(3).value = r.color;
    row.getCell(4).value = r.last;
    row.getCell(2).alignment = { vertical: "middle", wrapText: true };
    row.getCell(3).alignment = { vertical: "middle" };
    row.getCell(4).alignment = { vertical: "middle" };

    const dataUrl = await loadImage(r.foto);
    if (dataUrl) {
      const ext = dataUrl.startsWith("data:image/png") ? "png" : "jpeg";
      const id = wb.addImage({ base64: dataUrl, extension: ext });
      ws.addImage(id, {
        tl: { col: 0.1, row: rowIdx - 1 + 0.05 },
        ext: { width: 72, height: 94 },
      });
    }
    row.commit();
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}