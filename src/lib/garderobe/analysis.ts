import type { Garderobe, Look, LookItem, OrderIndex, RefRow } from "./types";

export function buildGarderobes(refRows: RefRow[], order: OrderIndex): Garderobe[] {
  const lookMap = new Map<string, LookItem[]>();
  for (const r of refRows) {
    const id = `${r.gr}::${r.look}`;
    // Normalized key match first; if the colour code differs between the
    // reference database and the order file, fall back to a model-level match
    // when that model was ordered in a single colour.
    const modelKey = r.model.trim().toUpperCase().replace(/\s+/g, " ");
    const byModel = order.byModel?.[modelKey];
    const entry =
      order.byKey[r.key] ??
      (byModel && byModel.keys.length === 1
        ? { qty: byModel.qty, category: byModel.category, retailers: [] }
        : undefined);
    const item: LookItem = {
      ...r,
      qty: entry?.qty ?? 0,
      orderCategory: entry?.category ?? (r.isApparel ? "Apparel" : "Accessories"),
    };
    const arr = lookMap.get(id);
    if (arr) arr.push(item);
    else lookMap.set(id, [item]);
  }

  const grMap = new Map<string, Look[]>();
  for (const [id, items] of lookMap) {
    const [gr = "", look = ""] = id.split("::");
    const apparel = items.filter((i) => i.isApparel);
    const accessories = items.filter((i) => !i.isApparel);
    const apparelMatched = apparel.filter((i) => i.qty > 0).length;
    const apparelTotal = apparel.length;
    const l: Look = {
      gr,
      look,
      fotolook: items.find((i) => i.fotolook)?.fotolook ?? "",
      items,
      apparel,
      accessories,
      apparelMatched,
      apparelTotal,
      completeness: apparelTotal ? (apparelMatched / apparelTotal) * 100 : 0,
      totalQty: items.reduce((s, i) => s + i.qty, 0),
      isActive: apparelMatched > 0,
    };
    const arr = grMap.get(gr);
    if (arr) arr.push(l);
    else grMap.set(gr, [l]);
  }

  const garderobes: Garderobe[] = [];
  for (const [gr, looks] of grMap) {
    looks.sort((a, b) => Number(a.look) - Number(b.look));
    const apparelTotal = looks.reduce((s, l) => s + l.apparelTotal, 0);
    const apparelMatched = looks.reduce((s, l) => s + l.apparelMatched, 0);
    const uniqueQty = new Map<string, number>();
    for (const l of looks)
      for (const i of l.items) if (!uniqueQty.has(i.key)) uniqueQty.set(i.key, i.qty);
    garderobes.push({
      gr,
      looks,
      completeness: apparelTotal ? (apparelMatched / apparelTotal) * 100 : 0,
      totalQty: [...uniqueQty.values()].reduce((s, q) => s + q, 0),
      completeLooks: looks.filter((l) => l.apparelTotal > 0 && l.apparelMatched === l.apparelTotal)
        .length,
    });
  }

  garderobes.sort((a, b) => b.completeness - a.completeness || b.totalQty - a.totalQty);
  return garderobes;
}

export function unorderedAccessories(garderobes: Garderobe[]) {
  const out: { item: LookItem; gr: string; look: string }[] = [];
  for (const g of garderobes) {
    for (const l of g.looks) {
      if (!l.isActive) continue;
      for (const a of l.accessories) {
        if (a.qty === 0) out.push({ item: a, gr: g.gr, look: l.look });
      }
    }
  }
  return out;
}

export function topLooks(garderobes: Garderobe[]) {
  const map = new Map<string, { look: string; grs: Set<string>; qty: number; looks: Look[] }>();
  for (const g of garderobes) {
    for (const l of g.looks) {
      if (l.totalQty <= 0) continue;
      const e = map.get(l.look) ?? { look: l.look, grs: new Set<string>(), qty: 0, looks: [] };
      e.qty += l.totalQty;
      e.grs.add(g.gr);
      e.looks.push(l);
      map.set(l.look, e);
    }
  }
  return [...map.values()]
    .map((e) => ({
      look: e.look,
      grs: [...e.grs],
      qty: e.qty,
      fotolook: e.looks.find((l) => l.fotolook)?.fotolook ?? "",
      items: e.looks[0]?.items.filter((i) => i.qty > 0) ?? [],
    }))
    .sort((a, b) => b.qty - a.qty);
}

export function topGarderobes(garderobes: Garderobe[]) {
  return [...garderobes].filter((g) => g.totalQty > 0).sort((a, b) => b.totalQty - a.totalQty);
}

export function retailerBanner(retailers: string[]) {
  if (retailers.length === 0) return "No retailer";
  return retailers.length <= 10 ? retailers.join(" / ") : `${retailers.length} Retailers`;
}

export function lookRecommendation(look: Look) {
  const ordered = look.apparel.find((i) => i.qty > 0);
  const missing = look.apparel.find((i) => i.qty === 0);
  if (!ordered || !missing) return null;
  return { ordered, missing };
}

export function lookAbbinamenti(look: Look) {
  const lines: string[] = [];
  for (const i of look.items) {
    if (i.qty <= 0 || !i.abbinamenti.length) continue;
    const present = i.abbinamenti.filter((a) => {
      const name = a.split(/\s+/)[0]?.toUpperCase() ?? "";
      return look.items.some((o) => o.qty > 0 && o.model.toUpperCase().includes(name));
    });
    if (present.length) lines.push(`${i.model}: ${present.join(", ")}`);
  }
  return lines;
}

export function validate(refRows: RefRow[], garderobes: Garderobe[]) {
  const issues: string[] = [];
  if (refRows.some((r) => !r.gr)) issues.push("Some rows are missing a GR value after fill-down.");
  if (refRows.some((r) => !r.look)) issues.push("Some rows are missing nr_modello (look id).");
  for (const g of garderobes) {
    const uniq = new Map<string, number>();
    for (const l of g.looks) for (const i of l.items) if (!uniq.has(i.key)) uniq.set(i.key, i.qty);
    const expected = [...uniq.values()].reduce((s, q) => s + q, 0);
    if (expected !== g.totalQty)
      issues.push(
        `Garderobe ${g.gr} total pcs (${g.totalQty}) does not match deduplicated sum (${expected}).`,
      );
  }
  const tl = topLooks(garderobes);
  for (let i = 1; i < tl.length; i++)
    if ((tl[i - 1]?.qty ?? 0) < (tl[i]?.qty ?? 0)) issues.push("Top Looks ranking is not descending.");
  const tg = topGarderobes(garderobes);
  for (let i = 1; i < tg.length; i++)
    if ((tg[i - 1]?.totalQty ?? 0) < (tg[i]?.totalQty ?? 0))
      issues.push("Top Garderobes ranking is not descending.");
  return issues;
}
