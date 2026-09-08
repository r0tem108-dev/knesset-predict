import type { LeaderRowT, PartyT } from "@/lib/types";

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "");

export const AWARDS: {
  key: keyof LeaderRowT;
  emoji: string;
  title: string;
  desc: string;
}[] = [
  { key: "isOracle", emoji: "🔮", title: "האורקל", desc: "התחזית הכי טובה בסך הכול" },
  { key: "isBullseye", emoji: "🎯", title: "בול בפגיעה", desc: "הכי הרבה ניחושי מנדטים מדויקים" },
  { key: "isClosestKnesset", emoji: "🗺️", title: "הכנסת הקרובה", desc: "טעות המנדטים הכוללת הנמוכה ביותר" },
  { key: "isThresholdMaster", emoji: "🚪", title: "מלך אחוז החסימה", desc: "הכי הרבה ניחושי חסימה נכונים" },
  { key: "isContrarianGenius", emoji: "🧠", title: "הגאון הנגדי", desc: "סטה מהקונצנזוס — וצדק" },
  { key: "isBiggestMiss", emoji: "🙈", title: "הפספוס הגדול", desc: "הטעות הכי גדולה במפלגה אחת" },
];

export default function Leaderboard({
  rows,
  parties,
  final = false,
}: {
  rows: LeaderRowT[];
  parties: PartyT[];
  final?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">אף משתתף עדיין לא שלח תחזית תקינה.</p>;
  }
  const partyName = (k: string) => parties.find((p) => p.key === k)?.nameHe ?? k;

  return (
    <div className="space-y-4">
      {final && (
        <div className="grid gap-2 sm:grid-cols-3">
          {AWARDS.map((a) => {
            const winner = rows.find((r) => r[a.key]);
            return (
              <div key={a.key} className="rounded-xl border border-line bg-surface p-3">
                <div className="text-xs font-bold text-muted">
                  {a.emoji} {a.title}
                </div>
                <div className="mt-0.5 text-lg font-black">{winner?.displayName ?? "—"}</div>
                <div className="text-[11px] text-muted">{a.desc}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-right text-xs font-bold text-muted">
              <th className="p-2">#</th>
              <th className="p-2">משתתף/ת</th>
              <th className="p-2">ניקוד</th>
              <th className="p-2">מנדטים</th>
              <th className="p-2">בונוס</th>
              <th className="p-2">טעות כוללת</th>
              <th className="p-2">בול</th>
              <th className="p-2">טעות 1</th>
              <th className="p-2">חסימה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.participantId}
                className={`border-t border-line ${r.rank <= 3 ? "bg-accent-400/10" : ""}`}
              >
                <td className="p-2 font-black">
                  {medal(r.rank)} {r.rank}
                </td>
                <td className="p-2 font-bold">
                  {r.displayName}
                  {r.confidencePickAwarded > 0 && (
                    <span title="ניחוש הביטחון פגע" className="ms-1">
                      ⭐
                    </span>
                  )}
                  {final && (
                    <span className="ms-1">
                      {AWARDS.filter((a) => r[a.key]).map((a) => a.emoji).join("")}
                    </span>
                  )}
                </td>
                <td className="num p-2 text-base font-black text-brand-700">{r.total}</td>
                <td className="num p-2">{r.seatScore}</td>
                <td className="num p-2">{r.bonusScore}</td>
                <td className="num p-2 font-bold">{r.totalSeatError}</td>
                <td className="num p-2">{r.exactCount}</td>
                <td className="num p-2">{r.offByOneCount}</td>
                <td className="num p-2">{r.thresholdCorrectCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {final && rows.some((r) => r.worstPartyKey) && (
        <p className="text-xs text-muted">
          🙈 הפספוס הגדול ביותר:{" "}
          {(() => {
            const m = rows.find((r) => r.isBiggestMiss);
            return m ? `${m.displayName} — ${partyName(m.worstPartyKey)}, פער ${m.worstError} מנדטים` : "—";
          })()}
        </p>
      )}
    </div>
  );
}
