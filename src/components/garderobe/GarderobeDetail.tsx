import { ArrowLeft, FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { retailerBanner } from "@/lib/garderobe/analysis";
import { exportGarderobeReport } from "@/lib/garderobe/reports";
import type { Garderobe, OrderIndex } from "@/lib/garderobe/types";
import { LookSection } from "./LookSection";

export function GarderobeDetail({
  garderobe,
  order,
  onBack,
}: {
  garderobe: Garderobe;
  order: OrderIndex;
  onBack: () => void;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2 px-0 hover:bg-transparent">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await exportGarderobeReport(garderobe, order);
            setBusy(false);
          }}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" /> Export This Garderobe PDF
        </Button>
      </div>

      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-espresso">
        {retailerBanner(order.retailers)}
      </p>
      <h1 className="mt-2 font-display text-5xl">Garderobe {garderobe.gr}</h1>
      <div className="mt-4 flex flex-wrap gap-8 text-sm">
        <span>
          <strong className="text-primary">{garderobe.completeness.toFixed(1)}%</strong> apparel
          completion
        </span>
        <span>
          <strong>{garderobe.completeLooks}</strong> / {garderobe.looks.length} complete looks
        </span>
        <span>
          <strong>{garderobe.totalQty}</strong> pcs ordered
        </span>
      </div>
      <div className="luxe-rule mt-6" />

      {garderobe.looks.map((l) => (
        <LookSection key={l.look} look={l} />
      ))}
    </div>
  );
}
