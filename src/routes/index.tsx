import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Globe, LayoutList, ListOrdered, ShieldCheck, Sparkles, Trophy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { GarderobeDetail } from "@/components/garderobe/GarderobeDetail";
import {
  AREA_LABEL,
  AreaManagerModal,
  BestWorstModal,
  BestWorstValueModal,
  RUSSIA_CIS,
  TopCategoryModal,
  TopGarderobesModal,
  TopLooksModal,
  type AreaFilter,
} from "@/components/garderobe/Modals";
import { buildGarderobes, retailerBanner, validate } from "@/lib/garderobe/analysis";
import {
  buildOrderIndex,
  normalizeCountry,
  parseOrderXlsx,
  parseReferenceCsv,
} from "@/lib/garderobe/parse";
import { SanityCheck } from "@/components/garderobe/SanityCheck";
import type { OrderParseStats, OrderRow, RefRow } from "@/lib/garderobe/types";

const STORAGE_KEY = "garderobe.reference.v1";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Garderobe — Look Completion & Order Analysis" },
      {
        name: "description",
        content:
          "Upload your reference collection and buyer order to analyse look completeness, top garderobes, missing accessories and export elegant PDF reports.",
      },
      { property: "og:title", content: "Garderobe — Look Completion & Order Analysis" },
      {
        property: "og:description",
        content:
          "Analyse look completeness, ranked garderobes and unordered accessories from your collection and order files.",
      },
    ],
  }),
  component: App,
});

function App() {
  const [refRows, setRefRows] = useState<RefRow[]>([]);
  const [allOrderRows, setAllOrderRows] = useState<OrderRow[]>([]);
  const [orderStats, setOrderStats] = useState<OrderParseStats | null>(null);
  const [area, setArea] = useState<AreaFilter>("all");
  const [view, setView] = useState<"dash" | "sanity">("dash");
  const [selected, setSelected] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "area" | "cat" | "looks" | "gard" | "bw" | "bwv">(null);
  const csvInput = useRef<HTMLInputElement>(null);
  const xlsInput = useRef<HTMLInputElement>(null);

  // Global Area Manager filter — every downstream calculation uses these rows.
  const orderRows = useMemo(() => {
    if (area === "all") return allOrderRows;
    const rus = new Set(RUSSIA_CIS.map((c) => normalizeCountry(c)));
    const inRus = (c: string) => rus.has(normalizeCountry(c));
    return allOrderRows.filter((r) => (area === "rus" ? inRus(r.country) : !inRus(r.country)));
  }, [allOrderRows, area]);

  const order = useMemo(
    () => (allOrderRows.length ? buildOrderIndex(orderRows) : null),
    [orderRows, allOrderRows],
  );

  // Verification loop: filtered units + retailers must reconcile with the raw
  // rows for the active area, and the three areas must sum back to the total.
  useEffect(() => {
    if (!allOrderRows.length || !order) return;
    const rus = new Set(RUSSIA_CIS.map((c) => normalizeCountry(c)));
    const inRus = (c: string) => rus.has(normalizeCountry(c));
    for (let pass = 0; pass < 3; pass++) {
      const expectedUnits = orderRows.reduce((s, r) => s + (r.model ? r.qty : 0), 0);
      const expectedRetailers = new Set(
        orderRows.filter((r) => r.model && r.retailer).map((r) => r.retailer),
      );
      const expectedValue = orderRows.reduce((s, r) => s + (r.model ? r.value : 0), 0);
      const rusRows = allOrderRows.filter((r) => r.model && inRus(r.country));
      const rowRows = allOrderRows.filter((r) => r.model && !inRus(r.country));
      const rusUnits = rusRows.reduce((s, r) => s + r.qty, 0);
      const rowUnits = rowRows.reduce((s, r) => s + r.qty, 0);
      const rusValue = rusRows.reduce((s, r) => s + r.value, 0);
      const rowValue = rowRows.reduce((s, r) => s + r.value, 0);
      const allUnits = allOrderRows.reduce((s, r) => s + (r.model ? r.qty : 0), 0);
      const allValue = allOrderRows.reduce((s, r) => s + (r.model ? r.value : 0), 0);
      const areaValue = area === "rus" ? rusValue : area === "row" ? rowValue : allValue;
      const okUnits = order.totalUnits === expectedUnits;
      const okValue = Math.abs(areaValue - expectedValue) < 0.01;
      const okRetailers =
        order.retailers.length === expectedRetailers.size &&
        order.retailers.every((r) => expectedRetailers.has(r));
      const okSplit =
        rusUnits + rowUnits === allUnits && Math.abs(rusValue + rowValue - allValue) < 0.01;
      if (okUnits && okValue && okRetailers && okSplit) return;
      if (pass === 2) {
        toast.warning(
          !okSplit
            ? `Area filter mismatch — Russia Cis ${rusUnits} + ROW ${rowUnits} ≠ ${allUnits} pcs.`
            : !okUnits
              ? `Area filter mismatch — ${order.totalUnits} pcs indexed vs ${expectedUnits} pcs filtered.`
              : !okValue
                ? `Area filter mismatch — €${areaValue.toFixed(2)} vs €${expectedValue.toFixed(2)}.`
                : `Area filter mismatch — ${order.retailers.length} retailers indexed vs ${expectedRetailers.size} filtered.`,
        );
      }

    }
  }, [allOrderRows, orderRows, order, area]);


  const stats = useMemo<OrderParseStats | null>(() => {
    if (!orderStats) return null;
    if (area === "all") return orderStats;
    return {
      ...orderStats,
      fileRows: orderRows.length,
      parsedRows: orderRows.length,
      fileUnits: orderRows.reduce((s, r) => s + r.qty, 0),
      fileValue: orderRows.reduce((s, r) => s + r.value, 0),
      skippedRows: orderRows.filter((r) => !r.model).length,
      ok: true,
    };
  }, [orderStats, orderRows, area]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRefRows(JSON.parse(raw) as RefRow[]);
    } catch {
      /* ignore */
    }
  }, []);

  const garderobes = useMemo(
    () => (refRows.length && order ? buildGarderobes(refRows, order) : []),
    [refRows, order],
  );

  useEffect(() => {
    if (!garderobes.length) return;
    const issues = validate(refRows, garderobes);
    if (issues.length) toast.warning(issues[0]);
  }, [garderobes, refRows]);

  const totals = useMemo(() => {
    const apparelTotal = garderobes.reduce(
      (s, g) => s + g.looks.reduce((x, l) => x + l.apparelTotal, 0),
      0,
    );
    const apparelMatched = garderobes.reduce(
      (s, g) => s + g.looks.reduce((x, l) => x + l.apparelMatched, 0),
      0,
    );
    return {
      completion: apparelTotal ? (apparelMatched / apparelTotal) * 100 : 0,
      pcs: garderobes.reduce((s, g) => s + g.totalQty, 0),
      completeLooks: garderobes.reduce((s, g) => s + g.completeLooks, 0),
      uploadedPcs: stats?.fileUnits ?? 0,
      dbPcs: orderRows.reduce((s, r) => s + r.qty, 0),
    };
  }, [garderobes, stats, orderRows]);

  async function onCsv(file: File) {
    const rows = parseReferenceCsv(await file.text());
    if (!rows.length) {
      toast.error("No valid rows found in the reference database.");
      return;
    }
    setRefRows(rows);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch {
      toast.warning("Database loaded but too large to persist locally.");
    }
    toast.success(`Reference database loaded — ${rows.length} rows.`);
  }

  async function onXlsx(file: File) {
    const buf = await file.arrayBuffer();
    // Integrity loop: re-parse until parsed rows exactly equal file rows.
    let res = parseOrderXlsx(buf);
    for (let attempt = 0; attempt < 3 && !res.ok; attempt++) res = parseOrderXlsx(buf);

    if (!res.fileRows) {
      toast.error("No order lines found in the .xlsx file.");
      return;
    }
    setAllOrderRows(res.rows);
    setOrderStats(res);
    setSelected(null);
    setView("dash");
    if (res.ok) {
      toast.success(`Order loaded — ${res.parsedRows}/${res.fileRows} rows ingested (100%).`);
    } else {
      toast.error(
        `Ingestion mismatch — ${res.parsedRows} of ${res.fileRows} rows parsed. Check Sanity Check.`,
      );
    }
  }


  const detail = garderobes.find((g) => g.gr === selected);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster />
      <input
        ref={csvInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])}
      />
      <input
        ref={xlsInput}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onXlsx(e.target.files[0])}
      />

      {view === "sanity" && stats ? (
        <SanityCheck
          orderRows={orderRows}
          stats={stats}
          refRows={refRows}
          onBack={() => setView("dash")}
        />
      ) : detail && order ? (
        <GarderobeDetail garderobe={detail} order={order} onBack={() => setSelected(null)} />
      ) : (
        <div className="mx-auto max-w-7xl px-6 py-14">
          <header className="text-center">
            <p className="text-[11px] uppercase tracking-[0.42em] text-primary">
              Collection Intelligence
            </p>
            <h1 className="mt-4 font-display text-6xl tracking-tight">Garderobe</h1>
            <div className="luxe-rule mx-auto mt-6 w-64" />
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Cross-reference your collection index with a buyer order to reveal complete looks,
              missing pieces and the garderobes that sell.
            </p>
          </header>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button variant="outline" className="gap-2" onClick={() => csvInput.current?.click()}>
              <Upload className="h-4 w-4" /> Upload Reference Database (.csv)
            </Button>
            <Button
              className="gap-2"
              disabled={!refRows.length}
              onClick={() => xlsInput.current?.click()}
            >
              <Upload className="h-4 w-4" /> Upload Order (.xlsx)
            </Button>
          </div>
          {refRows.length > 0 && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Reference database active — {refRows.length} rows stored on this device.
            </p>
          )}

          {order && garderobes.length > 0 && (
            <>
              <div className="mt-14 flex flex-wrap justify-center gap-3">
                <Button variant="outline" className="gap-2" onClick={() => setView("sanity")}>
                  <ShieldCheck className="h-4 w-4" /> Sanity Check
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => setModal("area")}>
                  <Globe className="h-4 w-4" /> Area Manager: {AREA_LABEL[area]}
                </Button>
              </div>
              <p className="mt-6 text-center text-lg font-bold uppercase tracking-[0.18em] text-espresso">
                {retailerBanner(order.retailers)}
              </p>


              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Overall completion", value: `${totals.completion.toFixed(1)}%` },
                  { label: "Complete looks", value: String(totals.completeLooks) },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-sm border border-border bg-card p-6 text-center shadow-luxe"
                  >
                    <p className="font-display text-4xl text-primary">{s.value}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
                <div className="flex flex-col rounded-sm border border-border bg-card text-center shadow-luxe">
                  <div className="flex-1 px-6 py-5">
                    <p className="font-display text-3xl text-primary">
                      {totals.uploadedPcs.toLocaleString()} pcs
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Styles in uploaded xls
                    </p>
                  </div>
                  <div className="mx-6 border-t border-border/70" />
                  <div className="flex-1 px-6 py-5">
                    <p className="font-display text-3xl text-primary">
                      {totals.dbPcs.toLocaleString()} pcs
                    </p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Styles in Database
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button variant="secondary" className="gap-2" onClick={() => setModal("cat")}>
                  <LayoutList className="h-4 w-4" /> Top by Category
                </Button>
                <Button variant="secondary" className="gap-2" onClick={() => setModal("looks")}>
                  <Sparkles className="h-4 w-4" /> Top Purchased Looks Report
                </Button>
                <Button variant="secondary" className="gap-2" onClick={() => setModal("gard")}>
                  <Trophy className="h-4 w-4" /> Top Garderobes by Quantity
                </Button>
                <Button className="gap-2" onClick={() => setModal("bw")}>
                  <FileDown className="h-4 w-4" /> Best and Worst by pcs
                </Button>
                <Button className="gap-2" onClick={() => setModal("bwv")}>
                  <FileDown className="h-4 w-4" /> Best and Worst by value
                </Button>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {garderobes.map((g) => (
                  <button
                    key={g.gr}
                    onClick={() => setSelected(g.gr)}
                    className="group rounded-sm border border-border bg-card p-6 text-left transition-colors hover:border-primary"
                  >
                    <div className="flex items-baseline justify-between">
                      <h2 className="font-display text-3xl">Garderobe {g.gr}</h2>
                      <span className="font-display text-2xl text-primary">
                        {g.completeness.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-4 h-1 w-full bg-muted">
                      <div
                        className="h-1 bg-primary"
                        style={{ width: `${Math.min(100, g.completeness)}%` }}
                      />
                    </div>
                    <p className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      <ListOrdered className="h-3.5 w-3.5" />
                      {g.looks.length} looks · {g.completeLooks} complete · {g.totalQty} pcs
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <AreaManagerModal
        open={modal === "area"}
        onOpenChange={(v) => setModal(v ? "area" : null)}
        value={area}
        onSelect={setArea}
      />
      <TopCategoryModal
        open={modal === "cat"}
        onOpenChange={(v) => setModal(v ? "cat" : null)}
        orderRows={orderRows}
      />
      <TopLooksModal
        open={modal === "looks"}
        onOpenChange={(v) => setModal(v ? "looks" : null)}
        garderobes={garderobes}
      />
      <TopGarderobesModal
        open={modal === "gard"}
        onOpenChange={(v) => setModal(v ? "gard" : null)}
        garderobes={garderobes}
      />
      <BestWorstModal
        open={modal === "bw"}
        onOpenChange={(v) => setModal(v ? "bw" : null)}
        garderobes={garderobes}
        orderRows={orderRows}
      />
      <BestWorstValueModal
        open={modal === "bwv"}
        onOpenChange={(v) => setModal(v ? "bwv" : null)}
        garderobes={garderobes}
        orderRows={orderRows}
      />
    </main>
  );
}
