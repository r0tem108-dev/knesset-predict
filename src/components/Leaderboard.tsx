import type { LeaderRowT } from "@/lib/types";

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "");

export default function Leaderboard({ rows }: { rows: LeaderRowT[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">אף משתתף עדיין לא שלח תחזית תקינה.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        <Highlight label="מקום ראשון" value={rows.find((r) => r.isFirst)?.displayName} emoji="👑" />
        <Highlight
          label="הכי מדויק (טעות ממוצעת)"
          value={rows.find((r) => r.isMostAccurate)?.displayName}
          emoji="🎯"
        />
        <Highlight
          label="הכי הרבה ניחושים בול"
          value={rows.find((r) => r.isMostExact)?.displayName}
          emoji="✅"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-right text-xs font-bold text-muted">
              <th className="p-2">#</th>
              <th className="p-2">משתתף/ת</th>
              <th className="p-2">ניקוד כולל</th>
              <th className="p-2">מנדטים</th>
              <th className="p-2">בונוס</th>
              <th className="p-2">טעות ממוצעת</th>
              <th className="p-2">ניחושים בול</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.participantId}
                className={`border-t border-line ${r.isFirst ? "bg-accent-400/10" : ""}`}
              >
                <td className="p-2 font-black">
                  {medal(r.rank)} {r.rank}
                </td>
                <td className="p-2 font-bold">
                  {r.displayName}
                  <span className="ms-1">
                    {r.isMostAccurate && "🎯"}
                    {r.isMostExact && "✅"}
                  </span>
                </td>
                <td className="num p-2 text-base font-black text-brand-700">{r.total}</td>
                <td className="num p-2">{r.seatScore}</td>
                <td className="num p-2">{r.bonusScore}</td>
                <td className="num p-2">{r.avgError}</td>
                <td className="num p-2">{r.exactCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Highlight({
  label,
  value,
  emoji,
}: {
  label: string;
  value?: string;
  emoji: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="mt-1 text-lg font-black">
        {emoji} {value ?? "—"}
      </div>
    </div>
  );
}
