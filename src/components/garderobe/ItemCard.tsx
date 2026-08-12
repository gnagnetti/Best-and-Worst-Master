import { toEnglishCategory } from "@/lib/garderobe/parse";
import { SmartImage } from "@/components/garderobe/SmartImage";
import type { LookItem } from "@/lib/garderobe/types";

export function ItemCard({ item }: { item: LookItem }) {
  const ordered = item.qty > 0;
  return (
    <div className="flex gap-3 rounded-sm border border-border bg-card p-3">
      <div className="h-24 w-[72px] shrink-0 overflow-hidden rounded-sm bg-muted">
        <SmartImage
          src={item.foto}
          alt={`${item.model} ${item.color}`}
          label={item.model}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base leading-tight">{item.model}</p>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {toEnglishCategory(item.specifica)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Color {item.color || "—"}</p>
        <span
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            ordered
              ? "bg-success text-success-foreground"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {ordered ? `${item.qty} pcs ordered` : "Not ordered"}
        </span>
      </div>
    </div>
  );
}
