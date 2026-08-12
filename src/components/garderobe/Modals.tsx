import { useState, type ReactNode } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toEnglishCategory } from "@/lib/garderobe/parse";
import { SmartImage } from "@/components/garderobe/SmartImage";
import { topGarderobes, topLooks, unorderedAccessories } from "@/lib/garderobe/analysis";
import {
  exportAccessoriesReport,
  exportBestAndWorstReport,
  exportBestAndWorstXlsx,
  exportBestAndWorstValueReport,
  exportBestAndWorstValueXlsx,
  exportTopGarderobesReport,
  exportTopGarderobesCsv,
  exportTopCategoryReport,
  exportTopCategoryXlsx,
  exportTopLooksReport,
  topCategoryRows,
  exportUnorderedApparelReport,
  exportUnorderedApparelXlsx,
} from "@/lib/garderobe/reports";
import type { Garderobe, OrderRow } from "@/lib/garderobe/types";

function ReportDialog({
  open,
  onOpenChange,
  title,
  exportLabel,
  onExport,
  children,
  extraActions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  exportLabel: string;
  onExport: () => Promise<void>;
  children: ReactNode;
  extraActions?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={busy}
            className="w-fit gap-2"
            onClick={async () => {
              setBusy(true);
              await onExport();
              setBusy(false);
            }}
          >
            <FileDown className="h-4 w-4" /> {busy ? "Preparing…" : exportLabel}
          </Button>
          {extraActions}
        </div>
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function AccessoriesModal({
  open,
  onOpenChange,
  garderobes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garderobes: Garderobe[];
}) {
  const rows = unorderedAccessories(garderobes);
  return (
    <ReportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Unordered Accessories"
      exportLabel="Export Accessories PDF Report"
      onExport={() => exportAccessoriesReport(garderobes)}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No missing accessories in active looks.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r, i) => (
            <div key={i} className="flex gap-3 rounded-sm border border-border bg-card p-3">
              <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-sm bg-muted">
                <SmartImage
                  src={r.item.foto}
                  alt={r.item.model}
                  label={r.item.model}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-base">{r.item.model}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {toEnglishCategory(r.item.specifica)} · {r.item.color}
                </p>
                <p className="mt-2 text-xs text-espresso">
                  Proposable for: Garderobe {r.gr} - Look #{r.look}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportDialog>
  );
}

export function TopLooksModal({
  open,
  onOpenChange,
  garderobes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garderobes: Garderobe[];
}) {
  const ranked = topLooks(garderobes);
  return (
    <ReportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Top Purchased Looks"
      exportLabel="Export Top Looks PDF Report"
      onExport={() => exportTopLooksReport(garderobes)}
    >
      <div className="space-y-4">
        {ranked.map((r, idx) => (
          <div key={r.look} className="flex gap-4 rounded-sm border border-border bg-card p-4">
            <div className="w-32 shrink-0">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
                <SmartImage
                  src={r.fotolook}
                  alt={`Look ${r.look}`}
                  label={`Look ${r.look}`}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl">
                Rank #{idx + 1} — Look #{r.look}
              </p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Garderobe {r.grs.join(", ")} · {r.qty} pcs ordered
              </p>
              <ul className="mt-3 space-y-1 text-xs">
                {r.items.map((i, k) => (
                  <li key={k} className="flex justify-between border-b border-border/60 py-1">
                    <span>
                      {i.model} — {toEnglishCategory(i.specifica)} — {i.color}
                    </span>
                    <span className="font-semibold">{i.qty} pcs</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </ReportDialog>
  );
}

export function TopGarderobesModal({
  open,
  onOpenChange,
  garderobes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garderobes: Garderobe[];
}) {
  const ranked = topGarderobes(garderobes);
  return (
    <ReportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Top Garderobes by Quantity"
      exportLabel="Export Top Garderobes PDF Report"
      onExport={() => exportTopGarderobesReport(garderobes)}
      extraActions={
        <>
          <Button
            variant="outline"
            className="w-fit gap-2"
            onClick={() => exportTopGarderobesCsv(garderobes)}
          >
            <FileDown className="h-4 w-4" /> Export Top Garderobes CSV
          </Button>
          <Button
            variant="outline"
            className="w-fit gap-2"
            onClick={() => exportUnorderedApparelReport(garderobes)}
          >
            <FileDown className="h-4 w-4" /> Styles not ordered
          </Button>
          <Button
            variant="outline"
            className="w-fit gap-2"
            onClick={() => exportUnorderedApparelXlsx(garderobes)}
          >
            <FileDown className="h-4 w-4" /> styles not ordered xls
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        {ranked.map((g, idx) => (
          <div key={g.gr} className="rounded-sm border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Rank #{idx + 1}</p>
            <p className="font-display text-3xl">Garderobe #{g.gr}</p>
            <p className="mt-1 text-sm font-semibold">Total Pcs Ordered: {g.totalQty} pcs</p>
            <p className="text-xs text-muted-foreground">
              Apparel completeness {g.completeness.toFixed(1)}% · {g.looks.length} looks
            </p>

            <div className="mt-5 space-y-6">
              {[...g.looks]
                .sort((a, b) => b.totalQty - a.totalQty)
                .map((l) => (
                <div key={l.look}>
                  <p className="border-b border-border pb-1 font-display text-xl">
                    Look #{l.look}
                    <span className="ml-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                      {l.totalQty} pcs ordered
                    </span>
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {l.items.map((item, k) => {
                      const ordered = item.qty > 0;
                      return (
                        <div key={k} className="rounded-sm border border-border bg-background p-2">
                          <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
                            <SmartImage
                              src={item.foto}
                              alt={`${item.model} ${item.color}`}
                              label={item.model}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="mt-2 truncate font-display text-sm">{item.model}</p>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            {toEnglishCategory(item.specifica)} · {item.color || "—"}
                          </p>
                          <p className="mt-1 text-xs font-semibold">Ordered: {item.qty} pcs</p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              ordered
                                ? "bg-success text-success-foreground"
                                : "bg-destructive text-destructive-foreground"
                            }`}
                          >
                            {ordered ? "Matched" : "Missing"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </ReportDialog>
  );
}

export function BestWorstModal({
  open,
  onOpenChange,
  garderobes,
  orderRows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garderobes: Garderobe[];
  orderRows: OrderRow[];
}) {
  const [busy, setBusy] = useState<null | "pdf" | "xls">(null);
  const run = async (kind: "pdf" | "xls") => {
    setBusy(kind);
    if (kind === "pdf") await exportBestAndWorstReport(orderRows, garderobes);
    else await exportBestAndWorstXlsx(orderRows, garderobes);
    setBusy(null);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Best and Worst by pcs</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          All matched models ranked from highest to lowest sold units.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy !== null} className="gap-2" onClick={() => run("pdf")}>
            <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Preparing…" : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            className="gap-2"
            onClick={() => run("xls")}
          >
            <FileDown className="h-4 w-4" /> {busy === "xls" ? "Preparing…" : "Export XLS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BestWorstValueModal({
  open,
  onOpenChange,
  garderobes,
  orderRows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  garderobes: Garderobe[];
  orderRows: OrderRow[];
}) {
  const [busy, setBusy] = useState<null | "pdf" | "xls">(null);
  const run = async (kind: "pdf" | "xls") => {
    setBusy(kind);
    try {
      if (kind === "pdf") await exportBestAndWorstValueReport(orderRows, garderobes);
      else await exportBestAndWorstValueXlsx(orderRows, garderobes);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Best and Worst by value</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          All matched models ranked from highest to lowest wholesale value (€).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy !== null} className="gap-2" onClick={() => run("pdf")}>
            <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Preparing…" : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            className="gap-2"
            onClick={() => run("xls")}
          >
            <FileDown className="h-4 w-4" /> {busy === "xls" ? "Preparing…" : "Export XLS"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Luca's area — Russia Cis. ROW = every country NOT in this list. */
export const RUSSIA_CIS = [
  "Armenia",
  "Azerbaijan",
  "Estonia",
  "Georgia",
  "Kyrgyzstan",
  "Latvia",
  "Moldova",
  "Russia",
  "Ukraine",
  "Uzbekistan",
  "Italy",
];


export type AreaFilter = "all" | "rus" | "row";

export const AREA_LABEL: Record<AreaFilter, string> = {
  all: "All",
  rus: "Russia Cis",
  row: "ROW",
};

export function AreaManagerModal({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: AreaFilter;
  onSelect: (v: AreaFilter) => void;
}) {
  const options: { id: AreaFilter; label: string; hint: string }[] = [
    { id: "rus", label: "Russia Cis", hint: "Luca's Area" },
    { id: "row", label: "ROW", hint: "Juliana's Area — Rest of World" },
    { id: "all", label: "All Areas", hint: "Clear filter" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Select Area Manager Filter</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {options.map((o) => (
            <Button
              key={o.id}
              variant={value === o.id ? "default" : "outline"}
              className="w-full justify-between"
              onClick={() => {
                onSelect(o.id);
                onOpenChange(false);
              }}
            >
              <span>{o.label}</span>
              <span className="text-xs opacity-70">{o.hint}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TopCategoryModal({
  open,
  onOpenChange,
  orderRows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderRows: OrderRow[];
}) {
  const [busy, setBusy] = useState<null | "pdf" | "xls">(null);
  const rows = topCategoryRows(orderRows);
  const euro = (n: number) =>
    n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const run = async (kind: "pdf" | "xls") => {
    setBusy(kind);
    try {
      if (kind === "pdf") await exportTopCategoryReport(orderRows);
      else await exportTopCategoryXlsx(orderRows);
    } finally {
      setBusy(null);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Top by Category</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy !== null} className="gap-2" onClick={() => run("pdf")}>
            <FileDown className="h-4 w-4" /> {busy === "pdf" ? "Preparing…" : "Export PDF"}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            className="gap-2"
            onClick={() => run("xls")}
          >
            <FileDown className="h-4 w-4" /> {busy === "xls" ? "Preparing…" : "Export XLS"}
          </Button>
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={r.subcategory} className="flex justify-between border-b border-border/60 py-1">
              <span>
                #{i + 1} — {r.subcategory}
              </span>
              <span className="text-muted-foreground">
                {r.qty} pcs · €{euro(r.value)}
              </span>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="text-muted-foreground">No ordered items in the current selection.</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
