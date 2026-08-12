import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { OrderIndex, OrderParseResult, OrderRow, RefRow } from "./types";

const ACCESSORY_SPECIFICHE = [
  "borsa",
  "borse",
  "orecchino",
  "orecchini",
  "collana",
  "bracciale",
  "anello",
  "cintura",
  "calzature",
  "calzatura",
  "scarpe",
  "sciarpa",
  "foulard",
  "stola",
  "cappello",
  "occhiali",
  "guanti",
  "portafoglio",
  "accessorio",
  "bijoux",
  "spilla",
  "cerchietto",
  "fascia",
];

export const CATEGORY_EN: Record<string, string> = {
  giacca: "Jacket",
  giaccone: "Jacket",
  blazer: "Blazer",
  camicia: "Shirt",
  camicetta: "Blouse",
  blusa: "Blouse",
  gonna: "Skirt",
  pantalone: "Trousers",
  pantaloni: "Trousers",
  abito: "Dress",
  vestito: "Dress",
  cappotto: "Coat",
  trench: "Trench",
  maglia: "Knitwear",
  maglione: "Knitwear",
  maglieria: "Knitwear",
  cardigan: "Cardigan",
  top: "Top",
  tshirt: "T-Shirt",
  "t-shirt": "T-Shirt",
  felpa: "Sweatshirt",
  giubbotto: "Jacket",
  gilet: "Vest",
  tuta: "Jumpsuit",
  shorts: "Shorts",
  bermuda: "Shorts",
  jeans: "Jeans",
  borsa: "Bag",
  borse: "Bag",
  orecchino: "Earrings",
  orecchini: "Earrings",
  collana: "Necklace",
  bracciale: "Bracelet",
  anello: "Ring",
  cintura: "Belt",
  calzature: "Shoes",
  calzatura: "Shoes",
  scarpe: "Shoes",
  sciarpa: "Scarf",
  foulard: "Foulard",
  stola: "Stole",
  cappello: "Hat",
  occhiali: "Sunglasses",
  guanti: "Gloves",
  spilla: "Brooch",
};

export function toEnglishCategory(specifica: string) {
  const k = (specifica || "").trim().toLowerCase();
  return CATEGORY_EN[k] || (specifica || "").trim();
}

export function normalizeColor(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const paren = s.match(/\(([^)]*)\)/);
  const source = (paren ? paren[1] : s) ?? "";
  const first = source.trim().split(/[\s;,/|]+/)[0] || "";
  const digits = first.replace(/\D/g, "");
  if (!digits) return first.toUpperCase();
  return digits.length >= 4 ? digits : digits.padStart(4, "0");
}

/** Encodes raw spaces, parentheses and special characters in image URLs. */
export function sanitizeUrl(raw: string | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try {
    // Avoid double-encoding an already-encoded URL.
    const decoded = /%[0-9A-Fa-f]{2}/.test(s) ? decodeURI(s) : s;
    return encodeURI(decoded);
  } catch {
    try {
      return encodeURI(s);
    } catch {
      return s;
    }
  }
}

/** Parses a monetary cell ("€ 1.234,50", "1,234.50", 1234.5) into a number. */
export function parseMoney(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  let s = String(raw).trim().replace(/[^\d.,\-]/g, "");
  if (!s) return 0;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function makeKey(model: string, color: string) {
  return `${String(model || "").trim().toUpperCase().replace(/\s+/g, " ")}_${String(color || "")
    .trim()
    .toUpperCase()}`;
}

export function parseReferenceCsv(text: string): RefRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), {
    delimiter: ";",
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\.$/, ""),
  });

  const rows: RefRow[] = [];
  let lastGr = "";

  for (const raw of parsed.data) {
    if (!raw) continue;
    const get = (k: string) => String(raw[k] ?? "").trim();
    const gr = get("gr") || lastGr;
    if (gr) lastGr = gr;
    const look = get("nr_modello");
    const model = get("nome_modello");
    if (!gr || !look || !model) continue;
    const specifica = get("specifica");
    const colorRaw = get("colore");
    const color = normalizeColor(colorRaw);
    const abbin = get("abbinamenti")
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean);
    rows.push({
      gr,
      look,
      model,
      specifica,
      colorRaw,
      color,
      foto: sanitizeUrl(get("foto")),
      fotolook: sanitizeUrl(get("fotolook")),
      abbinamenti: abbin,
      key: makeKey(model, color),
      isApparel: !ACCESSORY_SPECIFICHE.includes(specifica.toLowerCase()),
    });
  }

  // Smart model-level photo fallback: reuse any valid photo found for the same
  // model name when a colour variant has an empty 'Foto' cell.
  const fotoByModel = new Map<string, string>();
  const lookByLook = new Map<string, string>();
  for (const r of rows) {
    const m = r.model.trim().toUpperCase();
    if (r.foto && !fotoByModel.has(m)) fotoByModel.set(m, r.foto);
    const lk = `${r.gr}|${r.look}`;
    if (r.fotolook && !lookByLook.has(lk)) lookByLook.set(lk, r.fotolook);
  }
  for (const r of rows) {
    if (!r.foto) r.foto = fotoByModel.get(r.model.trim().toUpperCase()) ?? "";
    if (!r.fotolook) r.fotolook = lookByLook.get(`${r.gr}|${r.look}`) ?? "";
  }

  return rows;
}

/** Parses EVERY row of the first sheet — no row is dropped. */
export function parseOrderXlsx(data: ArrayBuffer): OrderParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""]!;
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const WHOLESALE_HEADER = "Original Ext. Wholesale";
  const wholesaleOf = (r: Record<string, unknown>) => {
    if (WHOLESALE_HEADER in r) return parseMoney(r[WHOLESALE_HEADER]);
    const k = Object.keys(r).find(
      (h) => h.trim().toLowerCase() === WHOLESALE_HEADER.toLowerCase(),
    );
    return k ? parseMoney(r[k]) : 0;
  };

  const pick = (r: Record<string, unknown>, ...headers: string[]) => {
    for (const header of headers) {
      if (header in r) {
        const v = String(r[header] ?? "").trim();
        if (v) return v;
      }
      const k = Object.keys(r).find((h) => h.trim().toLowerCase() === header.toLowerCase());
      if (k) {
        const v = String(r[k] ?? "").trim();
        if (v) return v;
      }
    }
    return "";
  };

  const rows: OrderRow[] = json.map((r) => {
    const model = String(r["Style Name"] ?? "").trim();
    const color = normalizeColor(r["Color Code"] as string);
    const qty = Number(r["Units"] ?? 0) || 0;
    return {
      model,
      color,
      qty,
      value: wholesaleOf(r),
      category: String(r["Category"] ?? "").trim(),
      subcategory: pick(r, "Subcategory", "Sub Category", "Sub-category", "Sottocategoria"),
      country: pick(
        r,
        "Country",
        "Ship To Country",
        "Ship-to Country",
        "ShipTo Country",
        "Country Name",
        "Customer Country",
        "Nazione",
        "Paese",
      ),
      retailer: String(r["Retailer"] ?? "").trim(),
      key: makeKey(model, color),
    };
  });


  const fileRows = json.length;
  const fileUnits = json.reduce((sum, r) => sum + (Number(r["Units"] ?? 0) || 0), 0);
  const fileValue = json.reduce((sum, r) => sum + wholesaleOf(r), 0);
  const skippedRows = rows.filter((r) => !r.model).length;
  return {
    rows,
    fileRows,
    fileUnits,
    fileValue,
    parsedRows: rows.length,
    skippedRows,
    ok: rows.length === fileRows,
  };
}

export function buildOrderIndex(rows: OrderRow[]): OrderIndex {
  const byKey: OrderIndex["byKey"] = {};
  const byModel: OrderIndex["byModel"] = {};
  const retailers = new Set<string>();
  let totalUnits = 0;
  for (const r of rows) {
    if (!r.model) continue;
    if (r.retailer) retailers.add(r.retailer);
    totalUnits += r.qty;
    const e = (byKey[r.key] ||= { qty: 0, category: r.category, retailers: [] });
    e.qty += r.qty;
    if (r.category) e.category = r.category;
    if (r.retailer && !e.retailers.includes(r.retailer)) e.retailers.push(r.retailer);

    const m = r.model.trim().toUpperCase().replace(/\s+/g, " ");
    const me = (byModel[m] ||= { qty: 0, category: r.category, keys: [] });
    me.qty += r.qty;
    if (r.category) me.category = r.category;
    if (!me.keys.includes(r.key)) me.keys.push(r.key);
  }
  return { byKey, byModel, retailers: [...retailers], totalUnits };
}

/** Canonical lowercase country name — tolerates ISO codes, accents and aliases. */
const COUNTRY_ALIASES: Record<string, string> = {
  ru: "russia",
  rus: "russia",
  "russian federation": "russia",
  russie: "russia",
  russland: "russia",
  "russia federation": "russia",
  am: "armenia",
  arm: "armenia",
  az: "azerbaijan",
  aze: "azerbaijan",
  azerbaigian: "azerbaijan",
  ee: "estonia",
  est: "estonia",
  ge: "georgia",
  geo: "georgia",
  kg: "kyrgyzstan",
  kgz: "kyrgyzstan",
  kirghizistan: "kyrgyzstan",
  "kyrgyz republic": "kyrgyzstan",
  lv: "latvia",
  lva: "latvia",
  lettonia: "latvia",
  md: "moldova",
  mda: "moldova",
  "republic of moldova": "moldova",
  ua: "ukraine",
  ukr: "ukraine",
  ucraina: "ukraine",
  uz: "uzbekistan",
  uzb: "uzbekistan",
  it: "italy",
  ita: "italy",
  italia: "italy",
  italie: "italy",
};

export function normalizeCountry(raw: string): string {
  const base = (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  return COUNTRY_ALIASES[base] ?? base;
}
