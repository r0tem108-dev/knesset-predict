import Link from "next/link";
import { notFound } from "next/navigation";
import Countdown from "@/components/Countdown";
import InviteBox from "@/components/InviteBox";
import Leaderboard from "@/components/Leaderboard";
import SeatBars from "@/components/SeatBars";
import { getDashboard, AppError } from "@/lib/data";
import { formatDateTime } from "@/lib/clientTime";

export const dynamic = "force-dynamic";

export default async function GroupDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { code } = await params;
  const { created } = await searchParams;

  let data;
  try {
    data = await getDashboard(code);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  const { group, election, parties, viewer, participants, myPrediction, leaderboard, officialSeats } =
    data;

  const submittedCount = participants.filter((p) => p.hasSubmitted).length;
  const isMember = Boolean(viewer.participant);
  const mySubmitted = Boolean(myPrediction?.submitted);

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl">{group.name}</h1>
              {group.locked ? (
                <span className="chip bg-bad/10 text-bad">נעול</span>
              ) : (
                <span className="chip bg-good/10 text-good">פתוח לתחזיות</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {election.nameHe} · נוצר על ידי {group.creatorName} · קוד{" "}
              <span className="num font-bold">{group.code}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {viewer.isAdmin && (
              <Link href={`/g/${group.code}/admin`} className="btn btn-outline">
                ניהול
              </Link>
            )}
            {group.locked && group.settings.revealPredictionsAfterLock && (
              <Link href={`/g/${group.code}/compare`} className="btn btn-outline">
                טבלת השוואה
              </Link>
            )}
            {isMember ? (
              <Link href={`/g/${group.code}/predict`} className="btn btn-primary">
                {mySubmitted ? "עריכת התחזית" : "מילוי התחזית"}
              </Link>
            ) : (
              <Link href={`/join?code=${group.code}`} className="btn btn-primary">
                הצטרפות לקבוצה
              </Link>
            )}
          </div>
        </div>

        {created === "1" && viewer.isAdmin && (
          <div className="mt-4">
            <InviteBox code={group.code} />
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-brand-50 p-4">
            <Countdown target={election.electionDay} />
          </div>
          <Stat label="משתתפים" value={String(participants.length)} />
          <Stat
            label="שלחו תחזית"
            value={`${submittedCount} / ${participants.length}`}
            sub={
              group.locked
                ? "התחזיות ננעלו"
                : `נעילה: ${formatDateTime(group.predictionDeadline)}`
            }
          />
        </div>

        {!created && viewer.isAdmin && (
          <div className="mt-4">
            <InviteBox code={group.code} />
          </div>
        )}
      </section>

      {/* my status */}
      {isMember && (
        <section className="card p-6">
          <h2 className="text-lg">התחזית שלי</h2>
          {mySubmitted ? (
            <p className="mt-1 text-sm text-good">
              ✓ נשלחה{myPrediction?.submittedAt ? ` · ${formatDateTime(myPrediction.submittedAt)}` : ""}.
              {!group.locked && " ניתן לערוך עד מועד הנעילה."}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              עדיין לא שלחת תחזית תקינה (חלוקה של {election.totalSeats} מנדטים).
            </p>
          )}
          {!group.locked && (
            <Link href={`/g/${group.code}/predict`} className="btn btn-ghost mt-3">
              {mySubmitted ? "עריכת התחזית" : "המשך למילוי"}
            </Link>
          )}
        </section>
      )}

      {/* results */}
      {group.resultsPublishedAt && leaderboard && (
        <section className="card p-6">
          <h2 className="text-lg">טבלת מובילים</h2>
          <p className="mt-1 text-sm text-muted">
            התוצאות הרשמיות פורסמו · {formatDateTime(group.resultsPublishedAt)}
          </p>
          <div className="mt-4">
            <Leaderboard rows={leaderboard} />
          </div>
          {officialSeats && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-muted">התוצאות הרשמיות</h3>
              <SeatBars parties={parties} values={officialSeats} />
            </div>
          )}
        </section>
      )}

      {/* participants */}
      <section className="card p-6">
        <h2 className="text-lg">משתתפים</h2>
        {!group.locked && (
          <p className="mt-1 text-xs text-muted">הניקוד יוצג רק לאחר פרסום התוצאות הרשמיות.</p>
        )}
        <ul className="mt-3 divide-y divide-line">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <span className="font-bold">
                {p.displayName}
                {p.isAdmin && <span className="chip ms-2 bg-brand-100 text-brand-700">מנהל</span>}
              </span>
              {p.hasSubmitted ? (
                <span className="chip bg-good/10 text-good">✓ שלח/ה</span>
              ) : (
                <span className="chip bg-line text-muted">ממתין</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className="num mt-1 text-2xl font-black">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
