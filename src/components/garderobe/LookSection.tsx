import { lookAbbinamenti, lookRecommendation } from "@/lib/garderobe/analysis";
import { toEnglishCategory } from "@/lib/garderobe/parse";
import type { Look } from "@/lib/garderobe/types";
import { ItemCard } from "./ItemCard";
import { SmartImage } from "./SmartImage";

export function LookSection({ look }: { look: Look }) {
  const rec = lookRecommendation(look);
  const abbin = lookAbbinamenti(look);

  return (
    <section className="border-t border-border py-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-2xl">Look #{look.look}</h3>
            <span className="rounded-full border border-primary px-3 py-0.5 text-xs font-semibold tracking-wider text-primary">
              {look.apparelMatched}/{look.apparelTotal} apparel
            </span>
            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {look.totalQty} pcs ordered
            </span>
          </div>

          {rec && (
            <p className="mt-4 rounded-sm bg-primary/15 px-4 py-3 text-sm leading-relaxed">
              Since you ordered the{" "}
              <strong>
                {toEnglishCategory(rec.ordered.specifica)} {rec.ordered.model}
              </strong>{" "}
              we suggest to add the{" "}
              <span className="rounded-sm bg-primary px-1.5 py-0.5 font-semibold text-primary-foreground">
                {toEnglishCategory(rec.missing.specifica)} {rec.missing.model}
              </span>{" "}
              to complete the look {look.look}
            </p>
          )}

          {abbin.length > 0 && (
            <p className="mt-3 text-xs italic text-muted-foreground">
              Matching abbinamenti — {abbin.join(" · ")}
            </p>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {look.items.map((i, idx) => (
              <ItemCard key={`${i.key}-${idx}`} item={i} />
            ))}
          </div>
        </div>

        <div>
          <div className="aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted shadow-luxe">
            <SmartImage
              src={look.fotolook}
              alt={`Look ${look.look} full outfit`}
              label={`Look ${look.look}`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
