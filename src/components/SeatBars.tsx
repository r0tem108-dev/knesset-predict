import type { PartyT } from "@/lib/types";

/** Horizontal seat bars, sorted by `sortBy` value descending. */
export default function SeatBars({
  parties,
  values,
  compareValues,
  max = 40,
}: {
  parties: PartyT[];
  values: Record<string, number>;
  /** optional second series (e.g. a participant's prediction) drawn as an outline marker */
  compareValues?: Record<string, number>;
  max?: number;
}) {
  const rows = parties
    .map((p) => ({
      p,
      v: Number(values[p.key] ?? 0),
      c: compareValues ? Number(compareValues[p.key] ?? 0) : null,
    }))
    .filter((r) => r.v > 0 || (r.c ?? 0) > 0)
    .sort((a, b) => b.v - a.v);

  const scaleMax = Math.max(max, ...rows.map((r) => Math.max(r.v, r.c ?? 0)));

  return (
    <div className="space-y-1.5">
      {rows.map(({ p, v, c }) => (
        <div key={p.key} className="flex items-center gap-2 text-sm">
          <div className="w-28 shrink-0 truncate font-bold" title={p.nameHe}>
            {p.nameHe}
          </div>
          <div className="relative h-5 flex-1 rounded bg-bg">
            <div
              className="absolute inset-y-0 right-0 rounded"
              style={{ width: `${(v / scaleMax) * 100}%`, background: p.color }}
            />
            {c !== null && (
              <div
                className="absolute inset-y-0 right-0 rounded border-2 border-ink/50"
                style={{ width: `${(c / scaleMax) * 100}%` }}
                title={`תחזית: ${c}`}
              />
            )}
          </div>
          <div className="num w-14 shrink-0 text-left font-black">
            {v}
            {c !== null && <span className="text-xs font-bold text-muted"> / {c}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
