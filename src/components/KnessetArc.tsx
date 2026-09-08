import type { PartyT } from "@/lib/types";

/**
 * Parliament-style semicircle of the 120 Knesset seats, filled left→right by an
 * ordering of parties (by bloc, then size). Pure SVG, theme-agnostic, no deps.
 */
export default function KnessetArc({
  parties,
  seats,
  totalSeats = 120,
  size = 320,
  showMajority = true,
}: {
  parties: PartyT[];
  seats: Record<string, number>;
  totalSeats?: number;
  size?: number;
  showMajority?: boolean;
}) {
  // Order seats: by bloc grouping (as parties are ordered), largest first within.
  const ordered = [...parties]
    .filter((p) => (seats[p.key] ?? 0) > 0)
    .sort((a, b) => a.order - b.order);

  const seatColors: string[] = [];
  for (const p of ordered) {
    const n = Math.round(seats[p.key] ?? 0);
    for (let i = 0; i < n; i++) seatColors.push(p.color);
  }
  while (seatColors.length < totalSeats) seatColors.push("var(--color-line)");
  seatColors.length = totalSeats;

  // Lay out seats in concentric rows of a semicircle.
  const rows = 5;
  const rowCounts: number[] = [];
  let remaining = totalSeats;
  // weight rows by their radius so outer rows hold more seats
  const weights = Array.from({ length: rows }, (_, i) => i + 3);
  const wSum = weights.reduce((a, b) => a + b, 0);
  for (let r = 0; r < rows; r++) {
    const c = r === rows - 1 ? remaining : Math.round((weights[r] / wSum) * totalSeats);
    rowCounts.push(c);
    remaining -= c;
  }

  const w = size;
  const h = size / 2 + 14;
  const cx = w / 2;
  const cy = h - 6;
  const rOuter = w / 2 - 6;
  const rInner = rOuter * 0.45;
  const dots: { x: number; y: number; c: string }[] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const count = rowCounts[r];
    const radius = rInner + ((rOuter - rInner) * r) / (rows - 1);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = Math.PI - t * Math.PI; // 180°→0°
      dots.push({
        x: cx + radius * Math.cos(angle),
        y: cy - radius * Math.sin(angle),
        c: seatColors[idx] ?? "var(--color-line)",
      });
      idx++;
    }
  }

  const dotR = Math.max(3, w / 70);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="חלוקת מנדטים">
      {showMajority && (
        <line
          x1={cx}
          y1={cy - rOuter - 4}
          x2={cx}
          y2={cy - rInner + 6}
          stroke="var(--color-ink)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.35"
        />
      )}
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={dotR} fill={d.c} />
      ))}
      <text
        x={cx}
        y={cy - 2}
        textAnchor="middle"
        className="num"
        fontSize={w / 12}
        fontWeight="900"
        fill="var(--color-ink)"
      >
        {Math.round(Object.values(seats).reduce((a, b) => a + (b || 0), 0))}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize={w / 30}
        fill="var(--color-muted)"
      >
        מתוך {totalSeats}
      </text>
    </svg>
  );
}
