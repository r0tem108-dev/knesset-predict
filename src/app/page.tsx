import Link from "next/link";
import Countdown from "@/components/Countdown";
import { getDefaultElection } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { election, parties } = await getDefaultElection();

  return (
    <div className="space-y-10">
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
            תאריך משוער ({new Date(election.electionDay).toLocaleDateString("he-IL")}) — ניתן
            לעדכן לכשייקבע מועד רשמי.
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
          בנוסף: שאלות בונוס (מפלגה גדולה, ראש ממשלה, גוש מנצח, אחוז חסימה, הקמת ממשלה תוך{" "}
          {election.coalitionWindowDays} יום ועוד) עם ניקוד נפרד לכל שאלה.
        </p>
      </section>
    </div>
  );
}
