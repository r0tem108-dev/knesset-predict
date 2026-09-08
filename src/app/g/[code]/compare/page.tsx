import Link from "next/link";
import { notFound } from "next/navigation";
import CompareView from "./CompareView";
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

  const { group, parties, comparison, groupForecast, officialSeats } = data;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
          ← {group.name}
        </Link>
        <h1 className="text-2xl">השוואת תחזיות</h1>
      </div>

      {!comparison ? (
        <div className="card p-6 text-sm text-muted">
          {group.locked
            ? "מנהל הקבוצה כיבה את אפשרות ההשוואה."
            : "טבלת ההשוואה תיפתח אוטומטית כשהתחזיות ינעלו (מצב החשיפה)."}
        </div>
      ) : comparison.length === 0 ? (
        <div className="card p-6 text-sm text-muted">אין תחזיות להצגה.</div>
      ) : (
        <CompareView
          parties={parties}
          comparison={comparison}
          groupForecast={groupForecast}
          officialSeats={officialSeats}
        />
      )}
    </div>
  );
}
