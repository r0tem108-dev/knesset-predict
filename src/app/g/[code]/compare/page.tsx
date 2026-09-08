import Link from "next/link";
import { notFound } from "next/navigation";
import { getDashboard, AppError } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let data;
  try {
    data = await getDashboard(code);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  const { group, parties, comparison, officialSeats } = data;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
          ← {group.name}
        </Link>
        <h1 className="text-2xl">טבלת השוואה</h1>
      </div>

      {!comparison ? (
        <div className="card p-6 text-sm text-muted">
          {group.locked
            ? "מנהל הקבוצה כיבה את אפשרות ההשוואה."
            : "טבלת ההשוואה תיפתח לאחר נעילת התחזיות."}
        </div>
      ) : comparison.length === 0 ? (
        <div className="card p-6 text-sm text-muted">אין תחזיות להצגה.</div>
      ) : (
        <div className="card overflow-x-auto p-4">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-right text-xs font-bold text-muted">
                <th className="p-2">מפלגה</th>
                {officialSeats && <th className="p-2 text-brand-700">רשמי</th>}
                {comparison.map((c) => (
                  <th key={c.participantId} className="p-2">
                    {c.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parties.map((p) => (
                <tr key={p.key} className="border-t border-line">
                  <td className="p-2 font-bold">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.nameHe}
                    </span>
                  </td>
                  {officialSeats && (
                    <td className="num p-2 font-black text-brand-700">
                      {officialSeats[p.key] ?? 0}
                    </td>
                  )}
                  {comparison.map((c) => (
                    <td key={c.participantId} className="num p-2">
                      {c.seats[p.key] ?? 0}
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
                {comparison.map((c) => (
                  <td key={c.participantId} className="num p-2">
                    {Object.values(c.seats).reduce((a, b) => a + b, 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
