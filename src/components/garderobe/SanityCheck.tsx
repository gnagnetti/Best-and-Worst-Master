import { ArrowLeft, Database, FileSpreadsheet } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { exportMissingStylesCsv, exportProcessedDatabaseCsv } from "@/lib/garderobe/reports";
import type { OrderParseStats, OrderRow, RefRow } from "@/lib/garderobe/types";

export function SanityCheck({
  orderRows,
  stats,
  refRows,
  onBack,
}: {
  orderRows: OrderRow[];
  stats: OrderParseStats;
  refRows: RefRow[];
  onBack: () => void;
}) {
  const missing = useMemo(() => {
    const refKeys = new Set(refRows.map((r) => r.key));
    const refModels = new Set(refRows.map((r) => r.model.trim().toUpperCase()));
    const seen = new Set<string>();
    const out: OrderRow[] = [];
    for (const r of orderRows) {
      if (!r.model) continue;
      if (refKeys.has(r.key) || refModels.has(r.model.trim().toUpperCase())) continue;
      if (seen.has(r.key)) continue;
      seen.add(r.key);
      out.push(r);
    }
    return out;
  }, [orderRows, refRows]);

  const uploadedPcs = stats.fileUnits;
  const dbPcs = useMemo(() => orderRows.reduce((s, r) => s + r.qty, 0), [orderRows]);
  const missingPcs = useMemo(() => missing.reduce((s, r) => s + r.qty, 0), [missing]);
  const ok = uploadedPcs === dbPcs;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Button variant="ghost" onClick={onBack} className="gap-2 px-0 hover:bg-transparent">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Button>

      <h1 className="mt-8 font-display text-5xl">Sanity Check</h1>
      <div className="luxe-rule mt-6" />

      <div className="mt-8 space-y-2 text-lg">
        <p>
          Pieces uploaded (.xlsx): <strong className="text-primary">{uploadedPcs}</strong> pcs
        </p>
        <p>
          Pieces in Database: <strong className="text-primary">{dbPcs}</strong> pcs
        </p>
        <p>
          Styles not found in reference database: <strong>{missing.length}</strong> ({missingPcs} pcs)
        </p>
      </div>

      <p
        className={`mt-4 text-sm font-semibold uppercase tracking-[0.16em] ${
          ok ? "text-primary" : "text-destructive"
        }`}
      >
        {ok
          ? "Integrity verified — every piece from the .xlsx was ingested."
          : `Mismatch detected — ${Math.abs(uploadedPcs - dbPcs)} piece(s) differ.`}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button className="gap-2" onClick={() => exportMissingStylesCsv(missing)}>
          <FileSpreadsheet className="h-4 w-4" /> Export Missing Styles CSV
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => exportProcessedDatabaseCsv(orderRows)}>
          <Database className="h-4 w-4" /> Export Database
        </Button>
      </div>

      {missing.length > 0 && (
        <ul className="mt-10 space-y-1 text-sm">
          {missing.map((m, i) => (
            <li key={i} className="flex justify-between border-b border-border/60 py-1">
              <span>
                {m.model} — {m.color || "—"}
              </span>
              <span className="text-muted-foreground">{m.qty} pcs</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
