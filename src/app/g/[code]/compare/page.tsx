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

  const { group, parties, comparison, groupForecast, officialSeats, viewer } = data;

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
          ← {group.name}
        </Link>
        <h1 className="text-2xl">השוואת תחזיות</h1>
      </div>

      {!group.locked ? (
        <p className="rounded-lg bg-good/10 px-3 py-2 text-sm font-bold text-good">
          התחזיות עדיין פתוחות — משתתפים יכולים לשנות עד המועד האחרון. מוצגת תמיד הגרסה
          האחרונה שנשמרה.
        </p>
      ) : (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm font-bold text-bad">
          🔒 התחזיות נעולות — כל מה שמוצג כאן סופי.
        </p>
      )}

      {!comparison ? (
        <div className="card p-6 text-sm text-muted">
          {viewer.participant
            ? "מנהל הקבוצה כיבה את הצגת התחזיות."
            : "הצטרפו לקבוצה כדי לראות את ההשוואה."}
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
