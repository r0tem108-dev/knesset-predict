"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PartyT, ComparisonRowT, GroupForecastT } from "@/lib/types";

export default function CompareView({
  code,
  parties,
  comparison,
  groupForecast,
  officialSeats,
}: {
  code: string;
  parties: PartyT[];
  comparison: ComparisonRowT[];
  groupForecast: GroupForecastT | null;
  officialSeats: Record<string, number> | null;
}) {
  const [mode, setMode] = useState<"table" | "h2h">("table");
  const [a, setA] = useState(comparison[0]?.participantId ?? "");
  const [b, setB] = useState(comparison[1]?.participantId ?? comparison[0]?.participantId ?? "");

  const pa = comparison.find((c) => c.participantId === a);
  const pb = comparison.find((c) => c.participantId === b);

  // parties that anyone gave seats to (or that got official seats), by size
  const rows = useMemo(() => {
    return parties
      .filter(
        (p) =>
          comparison.some((c) => (c.seats[p.key] ?? 0) > 0) ||
          (officialSeats?.[p.key] ?? 0) > 0,
      )
      .sort((x, y) => {
        const sx = comparison.reduce((s, c) => s + (c.seats[x.key] ?? 0), 0);
        const sy = comparison.reduce((s, c) => s + (c.seats[y.key] ?? 0), 0);
        return sy - sx;
      });
  }, [parties, comparison, officialSeats]);

  const h2h = useMemo(() => {
    if (!pa || !pb) return null;
    const diffs = rows
      .map((p) => ({
        p,
        av: pa.seats[p.key] ?? 0,
        bv: pb.seats[p.key] ?? 0,
        d: (pa.seats[p.key] ?? 0) - (pb.seats[p.key] ?? 0),
      }))
      .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const agree = diffs.filter((x) => x.d === 0 && (x.av > 0 || x.bv > 0));
    const mapDistance = diffs.reduce((s, x) => s + Math.abs(x.d), 0);
    return { diffs, agree, mapDistance };
  }, [pa, pb, rows]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className={`btn ${mode === "table" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setMode("table")}
        >
          טבלה מלאה
        </button>
        <button
          className={`btn ${mode === "h2h" ? "btn-primary" : "btn-outline"}`}
          onClick={() => setMode("h2h")}
        >
          ראש בראש
        </button>
      </div>

      {mode === "table" ? (
        <div className="card overflow-x-auto p-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-right text-xs font-bold text-muted">
                <th className="p-2">רשימה</th>
                {officialSeats && <th className="p-2 text-brand-700">רשמי</th>}
                {groupForecast && <th className="p-2">קבוצה</th>}
                {comparison.map((c) => (
                  <th key={c.participantId} className="p-2">
                    <Link
                      href={`/g/${code}/p/${c.participantId}`}
                      className="text-brand-700 hover:underline"
                    >
                      {c.displayName}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="p-2 font-bold">
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                      {p.nameHe}
                    </span>
                  </td>
                  {officialSeats && (
                    <td className="num p-2 font-black text-brand-700">
                      {officialSeats[p.key] ?? 0}
                    </td>
                  )}
                  {groupForecast && (
                    <td className="num p-2">{groupForecast.seats[p.key] ?? 0}</td>
                  )}
                  {comparison.map((c) => (
                    <td key={c.participantId} className="num p-2">
                      {c.seats[p.key] ?? 0}
                      {c.confidencePick.partyKey === p.key && (
                        <span title="ניחוש ביטחון">⭐</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-line font-black">
                <td className="p-2">סה״כ</td>
                {officialSeats && (
                  <td className="num p-2">
                    {Object.values(officialSeats).reduce((a, b) => a + b, 0)}
                  </td>
                )}
                {groupForecast && (
                  <td className="num p-2">
                    {Object.values(groupForecast.seats).reduce((a, b) => a + b, 0)}
                  </td>
                )}
                {comparison.map((c) => (
                  <td key={c.participantId} className="num p-2">
                    {c.totalSeats}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select className="field !w-auto" value={a} onChange={(e) => setA(e.target.value)}>
              {comparison.map((c) => (
                <option key={c.participantId} value={c.participantId}>
                  {c.displayName}
                </option>
              ))}
            </select>
            <span className="font-black">מול</span>
            <select className="field !w-auto" value={b} onChange={(e) => setB(e.target.value)}>
              {comparison.map((c) => (
                <option key={c.participantId} value={c.participantId}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {pa && pb && h2h && a !== b && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-bg p-3">
                  <div className="text-xs text-muted">מרחק בין המפות</div>
                  <div className="num text-2xl font-black">{h2h.mapDistance}</div>
                  <div className="text-[11px] text-muted">סך הפרשי מנדטים</div>
                </div>
                <div className="rounded-lg bg-bg p-3">
                  <div className="text-xs text-muted">הסכמות</div>
                  <div className="num text-2xl font-black">{h2h.agree.length}</div>
                  <div className="text-[11px] text-muted">רשימות עם אותו מספר</div>
                </div>
                <div className="rounded-lg bg-bg p-3">
                  <div className="text-xs text-muted">סך מנדטים</div>
                  <div className="num text-lg font-black">
                    {pa.totalSeats} · {pb.totalSeats}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-xs font-bold text-muted">
                      <th className="p-2">רשימה</th>
                      <th className="p-2">{pa.displayName}</th>
                      <th className="p-2">{pb.displayName}</th>
                      <th className="p-2">פער</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2h.diffs
                      .filter((x) => x.av > 0 || x.bv > 0)
                      .map((x) => (
                        <tr key={x.p.key} className="border-t border-line">
                          <td className="p-2 font-bold">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-3 w-3 rounded-full"
                                style={{ background: x.p.color }}
                              />
                              {x.p.nameHe}
                            </span>
                          </td>
                          <td className={`num p-2 ${x.d > 0 ? "font-black text-good" : ""}`}>
                            {x.av}
                          </td>
                          <td className={`num p-2 ${x.d < 0 ? "font-black text-good" : ""}`}>
                            {x.bv}
                          </td>
                          <td className="num p-2 font-bold">
                            {x.d === 0 ? "=" : x.d > 0 ? `+${x.d}` : x.d}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {a === b && (
            <p className="text-sm text-muted">בחרו שני משתתפים שונים.</p>
          )}
        </div>
      )}
    </div>
  );
}
