import Link from "next/link";
import { redirect } from "next/navigation";
import Countdown from "@/components/Countdown";
import { getDefaultElection, getMyGroups, type MyGroupT } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUS_HE: Record<MyGroupT["status"], string> = {
  open: "פתוח לתחזיות",
  locked: "נעול",
  provisional: "ליל הבחירות",
  final: "תוצאות סופיות",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>;
}) {
  const { home } = await searchParams;
  const { election, parties } = await getDefaultElection();
  const myGroups = await getMyGroups();

  // One group and not explicitly asking for the home page → go straight in.
  if (myGroups.length === 1 && home === undefined) {
    redirect(`/g/${myGroups[0].code}`);
  }

  return (
    <div className="space-y-10">
      {myGroups.length > 0 && (
        <section className="card p-6">
          <h2 className="text-xl">הקבוצות שלי</h2>
          <ul className="mt-3 space-y-2">
            {myGroups.map((g) => (
              <li key={g.code}>
                <Link
                  href={`/g/${g.code}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3 hover:bg-bg"
                >
                  <span className="min-w-0">
                    <span className="font-bold">{g.name}</span>
                    <span className="text-sm text-muted"> · </span>
                    <span className="num text-sm text-muted">{g.code}</span>
                    {g.isAdmin && (
                      <span className="chip ms-2 bg-brand-100 text-brand-700">מנהל</span>
                    )}
                    <span className="block text-xs text-muted">
                      בתור {g.displayName} · {STATUS_HE[g.status]}
                      {" · "}
                      {g.hasSubmitted ? "שלחת תחזית" : "עדיין לא שלחת"}
                    </span>
                  </span>
                  <span className="btn btn-ghost !py-1.5 text-sm">כניסה →</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/create" className="btn btn-outline !py-1.5 text-sm">
              + קבוצה חדשה
            </Link>
            <Link href="/join" className="btn btn-outline !py-1.5 text-sm">
              הצטרפות לקבוצה נוספת
            </Link>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="relative p-7 sm:p-10">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-brand-100 blur-2xl" />
          <div className="relative">
            <span className="chip bg-accent-400/20 text-accent-500">
              ליגת ניחושים חברתית · {election.nameHe}
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
              נחשו את תוצאות הבחירות
              <br />
              והתחרו מול החברים
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
              פותחים קבוצה פרטית, כל אחד מחלק 120 מנדטים בין המפלגות ועונה על שאלות
              בונוס. אחרי הבחירות המערכת מחשבת ניקוד לפי דיוק ומכתירה מנצח. בלי כסף
              אמיתי — רק כבוד.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/create" className="btn btn-primary">
                יצירת קבוצה
              </Link>
              <Link href="/join" className="btn btn-outline">
                הצטרפות לקבוצה קיימת
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-line bg-brand-50/50 p-7 sm:p-10">
          <Countdown target={election.electionDay} />
          <p className="mt-3 text-xs text-muted">
            יום הבחירות: {new Date(election.electionDay).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jerusalem" })}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { n: "1", t: "פותחים קבוצה", d: "שם קבוצה, קוד הצטרפות וקישור לשיתוף בין החברים." },
          { n: "2", t: "מנחשים", d: `מחלקים בדיוק 120 מנדטים בין ${parties.length} מפלגות + שאלות בונוס.` },
          { n: "3", t: "מתחרים", d: "אחרי התוצאות הרשמיות נפתחת טבלת מובילים עם ניקוד מפורט." },
        ].map((s) => (
          <div key={s.n} className="card p-5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 font-black text-white">
              {s.n}
            </div>
            <h3 className="mt-3 text-lg">{s.t}</h3>
            <p className="mt-1 text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="text-xl">איך מנקדים?</h2>
        <p className="mt-1 text-sm text-muted">
          ברירת המחדל — ניקוד לכל מפלגה לפי גודל הטעות במנדטים. ניתן לשנות בהגדרות הקבוצה.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
          {[
            ["בול", "10"],
            ["טעות 1", "7"],
            ["טעות 2", "5"],
            ["טעות 3", "3"],
            ["טעות 4", "1"],
            ["5+", "0"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line p-3 text-center">
              <div className="num text-2xl font-black text-brand-700">{v}</div>
              <div className="text-xs font-bold text-muted">{k}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          בנוסף: בונוס על ניחוש נכון של אחוז החסימה לכל רשימה, <b>ניחוש ביטחון</b> אחד (⭐)
          שנותן בונוס גדול בפגיעה מדויקת, שאלות בונוס (מפלגה גדולה, ראש ממשלה, גוש מנצח, הקמת
          ממשלה תוך {election.coalitionWindowDays} יום, אחוז הצבעה ועוד) ו<b>ניחוש פראי</b> של
          מנהל הקבוצה. המדד המרכזי: <b>טעות המנדטים הכוללת</b> — מי בנה את מפת הכנסת הקרובה ביותר.
        </p>
      </section>
    </div>
  );
}
