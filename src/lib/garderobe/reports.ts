import { buildPdf, type PdfBlock } from "./pdf";
import { buildPhotoWorkbook, buildSimpleWorkbook } from "./excel";
import { toEnglishCategory } from "./parse";
import { lookRecommendation, retailerBanner, topGarderobes, topLooks, unorderedAccessories } from "./analysis";
import type { Garderobe, LookItem, OrderIndex, OrderRow } from "./types";

const stamp = () => new Date().toLocaleString();

function lookBlocks(g: Garderobe): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  for (const l of g.looks) {
    blocks.push({ type: "subtitle", text: `Look #${l.look} — ${l.apparelMatched}/${l.apparelTotal} apparel` });
    if (l.fotolook) blocks.push({ type: "image", url: l.fotolook, width: 110, height: 147 });
    const rec = lookRecommendation(l);
    if (rec)
      blocks.push({
        type: "text",
        text: `Since you ordered the ${toEnglishCategory(rec.ordered.specifica)} ${rec.ordered.model}, we suggest adding the ${toEnglishCategory(rec.missing.specifica)} ${rec.missing.model} to complete look ${l.look}.`,
      });
    blocks.push({ type: "row", header: true, cells: ["Model", "Category", "Color", "Qty"] });
    for (const i of l.items)
      blocks.push({
        type: "row",
        cells: [i.model, toEnglishCategory(i.specifica), i.color, i.qty > 0 ? `${i.qty} pcs` : "NOT ORDERED"],
      });
    blocks.push({ type: "divider" });
  }
  return blocks;
}

export async function exportMainReport(garderobes: Garderobe[], order: OrderIndex) {
  const apparelTotal = garderobes.reduce(
    (s, g) => s + g.looks.reduce((x, l) => x + l.apparelTotal, 0),
    0,
  );
  const apparelMatched = garderobes.reduce(
    (s, g) => s + g.looks.reduce((x, l) => x + l.apparelMatched, 0),
    0,
  );
  const blocks: PdfBlock[] = [
    { type: "title", text: "Garderobe Collection Report" },
    { type: "kv", label: "Retailers", value: retailerBanner(order.retailers) },
    {
      type: "kv",
      label: "Overall completion",
      value: `${apparelTotal ? ((apparelMatched / apparelTotal) * 100).toFixed(1) : "0.0"}%`,
    },
    { type: "kv", label: "Garderobes", value: String(garderobes.length) },
    { type: "kv", label: "Total pieces ordered", value: `${garderobes.reduce((s, g) => s + g.totalQty, 0)} pcs` },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    { type: "section", text: "Garderobe ranking" },
    { type: "row", header: true, cells: ["Garderobe", "Completeness", "Complete looks", "Looks", "Pcs"] },
    ...garderobes.map<PdfBlock>((g) => ({
      type: "row",
      cells: [
        `GARDEROBE ${g.gr}`,
        `${g.completeness.toFixed(1)}%`,
        String(g.completeLooks),
        String(g.looks.length),
        `${g.totalQty} pcs`,
      ],
    })),
  ];
  await buildPdf("garderobe-main-report.pdf", "Garderobe · Main Report", blocks);
}

export async function exportGarderobeReport(g: Garderobe, order: OrderIndex) {
  const blocks: PdfBlock[] = [
    { type: "title", text: `Garderobe ${g.gr}` },
    { type: "kv", label: "Retailers", value: retailerBanner(order.retailers) },
    { type: "kv", label: "Apparel completeness", value: `${g.completeness.toFixed(1)}%` },
    { type: "kv", label: "Complete looks", value: `${g.completeLooks} / ${g.looks.length}` },
    { type: "kv", label: "Total pieces ordered", value: `${g.totalQty} pcs` },
    { type: "divider" },
    ...lookBlocks(g),
  ];
  await buildPdf(`garderobe-${g.gr}-report.pdf`, "Garderobe · Detail Report", blocks);
}

export async function exportAccessoriesReport(garderobes: Garderobe[]) {
  const rows = unorderedAccessories(garderobes);
  const blocks: PdfBlock[] = [
    { type: "title", text: "Unordered Accessories" },
    { type: "kv", label: "Opportunities", value: String(rows.length) },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
  ];
  for (const r of rows) {
    blocks.push({
      type: "image",
      url: r.item.foto,
      width: 80,
      height: 100,
      caption: `${r.item.model} — ${toEnglishCategory(r.item.specifica)} — Color ${r.item.color}\nProposable for: Garderobe ${r.gr} - Look #${r.look}`,
    });
    if (!r.item.foto)
      blocks.push({
        type: "text",
        text: `${r.item.model} — ${toEnglishCategory(r.item.specifica)} — Color ${r.item.color} · Proposable for: Garderobe ${r.gr} - Look #${r.look}`,
      });
  }
  await buildPdf("unordered-accessories-report.pdf", "Garderobe · Accessories Report", blocks);
}

export async function exportTopLooksReport(garderobes: Garderobe[]) {
  const ranked = topLooks(garderobes);
  const blocks: PdfBlock[] = [
    { type: "title", text: "Top Purchased Looks" },
    { type: "kv", label: "Ranked looks", value: String(ranked.length) },
    { type: "divider" },
  ];
  ranked.forEach((r, idx) => {
    blocks.push({ type: "subtitle", text: `Rank #${idx + 1} — Look #${r.look} — ${r.qty} pcs` });
    blocks.push({ type: "text", text: `Garderobe(s): ${r.grs.join(", ")}` });
    if (r.fotolook) blocks.push({ type: "image", url: r.fotolook, width: 100, height: 133 });
    blocks.push({ type: "row", header: true, cells: ["Model", "Category", "Color", "Qty"] });
    r.items.forEach((i: LookItem) =>
      blocks.push({
        type: "row",
        cells: [i.model, toEnglishCategory(i.specifica), i.color, `${i.qty} pcs`],
      }),
    );
    blocks.push({ type: "divider" });
  });
  await buildPdf("top-purchased-looks-report.pdf", "Garderobe · Top Looks Report", blocks);
}

export async function exportTopGarderobesReport(garderobes: Garderobe[]) {
  const ranked = topGarderobes(garderobes);
  const blocks: PdfBlock[] = [
    { type: "title", text: "Top Garderobes by Quantity" },
    { type: "kv", label: "Ranked garderobes", value: String(ranked.length) },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    { type: "row", header: true, cells: ["Rank", "Garderobe", "Total pcs", "Completeness", "Looks"] },
    ...ranked.map<PdfBlock>((g, idx) => ({
      type: "row",
      cells: [
        `#${idx + 1}`,
        `GARDEROBE ${g.gr}`,
        `${g.totalQty} pcs`,
        `${g.completeness.toFixed(1)}%`,
        String(g.looks.length),
      ],
    })),
  ];

  ranked.forEach((g, idx) => {
    blocks.push({ type: "pageBreak" });
    blocks.push({ type: "subtitle", text: `Rank #${idx + 1} — Garderobe ${g.gr}` });
    blocks.push({ type: "kv", label: "Total pieces ordered", value: `${g.totalQty} pcs` });
    blocks.push({ type: "kv", label: "Apparel completeness", value: `${g.completeness.toFixed(1)}%` });
    for (const l of [...g.looks].sort((a, b) => b.totalQty - a.totalQty)) {
      blocks.push({ type: "section", text: `Look #${l.look} — ${l.totalQty} pcs ordered` });
      blocks.push({
        type: "photoGrid",
        columns: 4,
        cells: l.items.map((i: LookItem) => ({
          url: i.foto,
          status: i.qty > 0 ? ("matched" as const) : ("missing" as const),
          lines: [
            i.model,
            `${toEnglishCategory(i.specifica)} · ${i.color || "—"}`,
            `Ordered: ${i.qty} pcs`,
          ],
        })),
      });
      blocks.push({ type: "divider" });
    }
  });

  await buildPdf("top-garderobes-report.pdf", "Garderobe · Top Garderobes Report", blocks);
}



export function exportMissingStylesCsv(rows: OrderRow[]) {
  downloadCsv("missing-styles.csv", rows);
}

export async function exportUnorderedApparelReport(garderobes: Garderobe[]) {
  const uniq = new Map<string, LookItem>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        if (!i.isApparel || i.qty > 0) continue;
        if (!uniq.has(i.key)) uniq.set(i.key, i);
      }
  // Verification loop: cross-check every candidate against the reference database
  // rows behind the garderobes. A style is only rendered when its key exists,
  // its category is strictly Apparel and its ordered quantity is strictly 0
  // in EVERY occurrence across all garderobes/looks.
  const seenKeys = new Set<string>();
  const rejected = new Set<string>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        seenKeys.add(i.key);
        const isApparel = i.isApparel && (i.orderCategory || "Apparel") === "Apparel";
        if (!isApparel || i.qty !== 0) rejected.add(i.key);
      }
  const items = [...uniq.values()].filter(
    (i) => i.key && seenKeys.has(i.key) && !rejected.has(i.key),
  );
  const blocks: PdfBlock[] = [
    { type: "title", text: "UNORDERED APPAREL STYLES" },
    { type: "kv", label: "Unordered styles", value: String(items.length) },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    ...items.map<PdfBlock>((i) => ({
      type: "listItem",
      url: i.foto,
      noteLabel: "Reason for not purchasing:",
      lines: [i.model, toEnglishCategory(i.specifica), `Color: ${i.color || "—"}`],
    })),
  ];
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await buildPdf(`Unordered_Apparel_Styles_${ts}.pdf`, "Garderobe · Unordered Apparel", blocks);
}

export function exportTopGarderobesCsv(garderobes: Garderobe[]) {
  const uniq = new Map<string, { model: string; color: string; qty: number }>();
  for (const g of topGarderobes(garderobes))
    for (const l of g.looks)
      for (const i of l.items) {
        if (i.qty <= 0) continue;
        if (uniq.has(i.key)) continue;
        uniq.set(i.key, { model: i.model, color: i.color, qty: i.qty });
      }
  const rows = [...uniq.values()].sort((a, b) => b.qty - a.qty);
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Modello;Colore;Quantità"];
  for (const r of rows) lines.push([esc(r.model), esc(r.color), esc(r.qty)].join(";"));
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Top_Garderobes_Models_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(fileName: string, rows: OrderRow[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = ["Modello;Colore;Quantità"];
  for (const r of rows) lines.push([esc(r.model), esc(r.color), esc(r.qty)].join(";"));
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportLoadedStylesCsv(rows: OrderRow[]) {
  downloadCsv("loaded-styles.csv", rows);
}

export function exportProcessedDatabaseCsv(rows: OrderRow[]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = ["Modello;colore;quantità;Category;Retailer"];
  for (const r of rows)
    lines.push([esc(r.model), esc(r.color), esc(r.qty), esc(r.category), esc(r.retailer)].join(";"));
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Processed_Order_Database_${ts}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function unorderedApparelItems(garderobes: Garderobe[]) {
  const uniq = new Map<string, LookItem>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        if (!i.isApparel || i.qty > 0) continue;
        if (!uniq.has(i.key)) uniq.set(i.key, i);
      }
  const seenKeys = new Set<string>();
  const rejected = new Set<string>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        seenKeys.add(i.key);
        const isApparel = i.isApparel && (i.orderCategory || "Apparel") === "Apparel";
        if (!isApparel || i.qty !== 0) rejected.add(i.key);
      }
  return [...uniq.values()].filter((i) => i.key && seenKeys.has(i.key) && !rejected.has(i.key));
}

export async function exportUnorderedApparelXlsx(garderobes: Garderobe[]) {
  const items = unorderedApparelItems(garderobes);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await buildPhotoWorkbook(
    `Unordered_Apparel_Styles_${ts}.xlsx`,
    "Unordered Apparel",
    "Note",
    items.map((i) => ({ foto: i.foto, model: i.model, color: i.color || "—", last: "" })),
  );
}

type BwRow = { key: string; model: string; color: string; category: string; qty: number; foto: string };

function bestAndWorstRows(orderRows: OrderRow[], garderobes: Garderobe[]) {
  // photo lookup from the reference database (by unique MODELLO_COLORE key, then by model)
  const photoByKey = new Map<string, string>();
  const photoByModel = new Map<string, string>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        if (i.foto) {
          if (!photoByKey.has(i.key)) photoByKey.set(i.key, i.foto);
          const m = i.model.trim().toUpperCase();
          if (!photoByModel.has(m)) photoByModel.set(m, i.foto);
        }
      }

  const agg = new Map<string, BwRow>();
  const add = (r: OrderRow) => {
    const prev = agg.get(r.key);
    if (prev) {
      prev.qty += r.qty;
      return;
    }
    agg.set(r.key, {
      key: r.key,
      model: r.model,
      color: r.color,
      category: r.category,
      qty: r.qty,
      foto: photoByKey.get(r.key) || photoByModel.get(r.model.trim().toUpperCase()) || "",
    });
  };
  // include 100% of ordered items, every category, no filtering
  for (const r of orderRows) add(r);

  const totalDb = orderRows.reduce((s, r) => s + r.qty, 0);
  // verification loop: re-scan until the aggregated total equals the database total
  for (let pass = 0; pass < 5; pass++) {
    const bwTotal = [...agg.values()].reduce((s, r) => s + r.qty, 0);
    if (bwTotal === totalDb) break;
    agg.clear();
    for (const r of orderRows) add(r);
  }

  const rows = [...agg.values()].sort((a, b) => b.qty - a.qty);
  const bwTotal = rows.reduce((s, r) => s + r.qty, 0);
  return { rows, bwTotal, totalDb };
}

export async function exportBestAndWorstReport(orderRows: OrderRow[], garderobes: Garderobe[]) {
  const { rows, bwTotal, totalDb } = bestAndWorstRows(orderRows, garderobes);
  if (bwTotal !== totalDb) throw new Error("Best and Worst piece count mismatch");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blocks: PdfBlock[] = [
    { type: "text", text: `Total pcs B&W: ${bwTotal} pcs` },
    { type: "text", text: `Total Styles Uploaded: ${totalDb} pcs` },
    { type: "title", text: "BEST AND WORST - MODELS RANKED BY QUANTITY" },
    { type: "kv", label: "Ranked models", value: String(rows.length) },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    ...rows.map<PdfBlock>((i, idx) => ({
      type: "listItem",
      url: i.foto,
      noteLabel: `Sold units: ${i.qty} pcs`,
      lines: [`#${idx + 1} — ${i.model}`, i.category || "—", `Color: ${i.color || "—"}`],
    })),
  ];
  await buildPdf(`Best_And_Worst_Models_${ts}.pdf`, "Garderobe · Best and Worst", blocks);
}

export async function exportBestAndWorstXlsx(orderRows: OrderRow[], garderobes: Garderobe[]) {
  const { rows, bwTotal, totalDb } = bestAndWorstRows(orderRows, garderobes);
  if (bwTotal !== totalDb) throw new Error("Best and Worst piece count mismatch");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await buildPhotoWorkbook(
    `Best_And_Worst_Models_${ts}.xlsx`,
    "Best and Worst",
    "Quantità",
    rows.map((i) => ({ foto: i.foto, model: i.model, color: i.color || "—", last: i.qty })),
    [`Total pcs B&W: ${bwTotal} pcs`, `Total Styles Uploaded: ${totalDb} pcs`],
  );
}

type BwValueRow = BwRow & { value: number };

const euro = (n: number) =>
  n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function bestAndWorstValueRows(orderRows: OrderRow[], garderobes: Garderobe[]) {
  const photoByKey = new Map<string, string>();
  const photoByModel = new Map<string, string>();
  for (const g of garderobes)
    for (const l of g.looks)
      for (const i of l.items) {
        if (i.foto) {
          if (!photoByKey.has(i.key)) photoByKey.set(i.key, i.foto);
          const m = i.model.trim().toUpperCase();
          if (!photoByModel.has(m)) photoByModel.set(m, i.foto);
        }
      }

  const agg = new Map<string, BwValueRow>();
  const add = (r: OrderRow) => {
    const prev = agg.get(r.key);
    if (prev) {
      prev.qty += r.qty;
      prev.value += r.value;
      return;
    }
    agg.set(r.key, {
      key: r.key,
      model: r.model,
      color: r.color,
      category: r.category,
      qty: r.qty,
      value: r.value,
      foto: photoByKey.get(r.key) || photoByModel.get(r.model.trim().toUpperCase()) || "",
    });
  };
  for (const r of orderRows) add(r);

  const totalUploaded = orderRows.reduce((s, r) => s + r.value, 0);
  const eq = (a: number, b: number) => Math.abs(a - b) < 0.005;
  // Verification loop: re-scan the dataset until the report total equals the
  // total wholesale value uploaded in the .xlsx.
  for (let pass = 0; pass < 5; pass++) {
    const total = [...agg.values()].reduce((s, r) => s + r.value, 0);
    if (eq(total, totalUploaded)) break;
    agg.clear();
    for (const r of orderRows) add(r);
  }

  const rows = [...agg.values()].sort((a, b) => b.value - a.value);
  const bwValue = rows.reduce((s, r) => s + r.value, 0);
  return { rows, bwValue, totalUploaded, equal: eq(bwValue, totalUploaded) };
}

export async function exportBestAndWorstValueReport(
  orderRows: OrderRow[],
  garderobes: Garderobe[],
) {
  const { rows, bwValue, totalUploaded, equal } = bestAndWorstValueRows(orderRows, garderobes);
  if (!equal) throw new Error("Best and Worst wholesale value mismatch");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blocks: PdfBlock[] = [
    { type: "text", text: `Total Value B&W: €${euro(bwValue)}` },
    { type: "text", text: `Total Value Uploaded: €${euro(totalUploaded)}` },
    { type: "title", text: "BEST AND WORST - MODELS RANKED BY VALUE" },
    { type: "kv", label: "Ranked models", value: String(rows.length) },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    ...rows.map<PdfBlock>((i, idx) => ({
      type: "listItem",
      url: i.foto,
      noteLabel: `Sold value: €${euro(i.value)}`,
      lines: [`#${idx + 1} — ${i.model}`, i.category || "—", `Color: ${i.color || "—"}`],
    })),
  ];
  await buildPdf(`Best_And_Worst_Models_Value_${ts}.pdf`, "Garderobe · Best and Worst by Value", blocks);
}

export async function exportBestAndWorstValueXlsx(orderRows: OrderRow[], garderobes: Garderobe[]) {
  const { rows, bwValue, totalUploaded, equal } = bestAndWorstValueRows(orderRows, garderobes);
  if (!equal) throw new Error("Best and Worst wholesale value mismatch");
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await buildPhotoWorkbook(
    `Best_And_Worst_Models_Value_${ts}.xlsx`,
    "Best and Worst by Value",
    "Valore (€)",
    rows.map((i) => ({ foto: i.foto, model: i.model, color: i.color || "—", last: i.value })),
    [`Total Value B&W: €${euro(bwValue)}`, `Total Value Uploaded: €${euro(totalUploaded)}`],
  );
}

/* ---------------- Top by Category (Subcategory ranking) ---------------- */

export type CategoryRow = { subcategory: string; qty: number; value: number };

export function topCategoryRows(orderRows: OrderRow[]): CategoryRow[] {
  const agg = new Map<string, CategoryRow>();
  for (const r of orderRows) {
    if (!r.model || r.qty <= 0) continue;
    const name = (r.subcategory || "—").trim() || "—";
    const e = agg.get(name) ?? { subcategory: name, qty: 0, value: 0 };
    e.qty += r.qty;
    e.value += r.value;
    agg.set(name, e);
  }
  // Verification loop: total ranked units must equal the filtered dataset units.
  const totalUnits = orderRows.reduce((s, r) => s + (r.qty > 0 && r.model ? r.qty : 0), 0);
  let rows = [...agg.values()].sort((a, b) => b.qty - a.qty);
  for (let pass = 0; pass < 5; pass++) {
    if (rows.reduce((s, r) => s + r.qty, 0) === totalUnits) break;
    agg.clear();
    for (const r of orderRows) {
      if (!r.model || r.qty <= 0) continue;
      const name = (r.subcategory || "—").trim() || "—";
      const e = agg.get(name) ?? { subcategory: name, qty: 0, value: 0 };
      e.qty += r.qty;
      e.value += r.value;
      agg.set(name, e);
    }
    rows = [...agg.values()].sort((a, b) => b.qty - a.qty);
  }
  return rows;
}

export async function exportTopCategoryReport(orderRows: OrderRow[]) {
  const rows = topCategoryRows(orderRows);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const blocks: PdfBlock[] = [
    { type: "title", text: "TOP BY CATEGORY" },
    { type: "kv", label: "Total pcs", value: `${totalQty} pcs` },
    { type: "kv", label: "Total value", value: `€${euro(totalValue)}` },
    { type: "kv", label: "Generated", value: stamp() },
    { type: "divider" },
    { type: "row", header: true, cells: ["Rank", "Subcategory", "Pcs", "Value (€)"] },
    ...rows.map<PdfBlock>((r, idx) => ({
      type: "row",
      cells: [`#${idx + 1}`, r.subcategory, `${r.qty} pcs`, euro(r.value)],
    })),
  ];
  await buildPdf(`Top_By_Category_${ts}.pdf`, "Garderobe · Top by Category", blocks);
}

export async function exportTopCategoryXlsx(orderRows: OrderRow[]) {
  const rows = topCategoryRows(orderRows);
  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalValue = rows.reduce((s, r) => s + r.value, 0);
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await buildSimpleWorkbook(
    `Top_By_Category_${ts}.xlsx`,
    "Top by Category",
    [
      { header: "Rank", width: 10 },
      { header: "Subcategory", width: 34 },
      { header: "Quantità", width: 16 },
      { header: "Valore (€)", width: 20 },
    ],
    rows.map((r, idx) => [`#${idx + 1}`, r.subcategory, r.qty, r.value]),
    [`Total pcs: ${totalQty} pcs`, `Total Value: €${euro(totalValue)}`],
  );
}
