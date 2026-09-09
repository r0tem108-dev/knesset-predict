import Link from "next/link";
import { notFound } from "next/navigation";
import Countdown from "@/components/Countdown";
import InviteBox from "@/components/InviteBox";
import Leaderboard from "@/components/Leaderboard";
import SeatBars from "@/components/SeatBars";
import KnessetArc from "@/components/KnessetArc";
import RenameName from "@/components/RenameName";
import ParticipantList from "@/components/ParticipantList";
import { getDashboard, AppError } from "@/lib/data";
import { formatDateTime } from "@/lib/clientTime";
import type { GroupStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<GroupStatus, { he: string; cls: string }> = {
  open: { he: "פתוח לתחזיות", cls: "bg-good/10 text-good" },
  locked: { he: "תחזיות נעולות", cls: "bg-bad/10 text-bad" },
  provisional: { he: "🌙 ליל הבחירות · תוצאות ביניים", cls: "bg-accent-400/20 text-accent-500" },
  final: { he: "✔️ תוצאות סופיות", cls: "bg-brand-100 text-brand-700" },
};

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

  const {
    group,
    election,
    parties,
    viewer,
    participants,
    myPrediction,
    myVersionCount,
    leaderboard,
    comparison,
    groupForecast,
    officialSeats,
  } = data;

  const submittedCount = participants.filter((p) => p.hasSubmitted).length;
  const isMember = Boolean(viewer.participant);
  const mySubmitted = Boolean(myPrediction?.submitted);
  const chip = STATUS_CHIP[group.status];
  const isFinal = group.status === "final";

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl">{group.name}</h1>
              <span className={`chip ${chip.cls}`}>{chip.he}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {election.nameHe} · נוצר על ידי {group.creatorName} · קוד{" "}
              <span className="num font-bold">{group.code}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {viewer.isAdmin && (
              <Link href={`/g/${group.code}/admin`} className="btn btn-outline">
                ניהול
              </Link>
            )}
            {comparison && (
              <Link href={`/g/${group.code}/compare`} className="btn btn-outline">
                השוואת תחזיות
              </Link>
            )}
            {isMember ? (
              <Link href={`/g/${group.code}/predict`} className="btn btn-primary">
                {group.locked ? "התחזית שלי" : mySubmitted ? "עריכת התחזית" : "מילוי התחזית"}
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
              group.locked ? "התחזיות ננעלו" : `נעילה: ${formatDateTime(group.predictionDeadline)}`
            }
          />
        </div>

        {!created && viewer.isAdmin && (
          <div className="mt-4">
            <InviteBox code={group.code} />
          </div>
        )}
      </section>

      {/* reveal banner */}
      {group.locked && comparison && (
        <section className="card border-brand-500 bg-brand-50 p-6">
          <h2 className="text-lg">🎭 מצב החשיפה פעיל</h2>
          <p className="mt-1 text-sm text-muted">
            התחזיות ננעלו וכולן חשופות עכשיו. אפשר לראות מי ניחש מה,{" "}
            <Link href={`/g/${group.code}/compare`} className="font-bold text-brand-700">
              בטבלת ההשוואה
            </Link>
            .
          </p>
        </section>
      )}

      {/* my status */}
      {isMember && viewer.participant && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">התחזית שלי</h2>
            <RenameName code={group.code} currentName={viewer.participant.displayName} />
          </div>
          {mySubmitted ? (
            <p className="mt-1 text-sm text-good">
              ✓ נשלחה
              {myPrediction?.submittedAt ? ` · ${formatDateTime(myPrediction.submittedAt)}` : ""}.
              {!group.locked && " ניתן לערוך עד מועד הנעילה."}
              {isFinal && myVersionCount > 1 && (
                <span className="text-muted"> · שינית את התחזית {myVersionCount} פעמים.</span>
              )}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {group.locked
                ? "לא נשלחה תחזית תקינה לפני הנעילה."
                : `עדיין לא שלחת תחזית תקינה (חלוקה של ${election.totalSeats} מנדטים).`}
            </p>
          )}
          {!group.locked && (
            <Link href={`/g/${group.code}/predict`} className="btn btn-ghost mt-3">
              {mySubmitted ? "עריכת התחזית" : "המשך למילוי"}
            </Link>
          )}
        </section>
      )}

      {/* results / leaderboard */}
      {leaderboard && (
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg">{isFinal ? "🏆 הטבלה הסופית" : "טבלת מובילים"}</h2>
            {!isFinal && (
              <span className="chip bg-accent-400/20 text-accent-500">אם אלו התוצאות הסופיות…</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            {isFinal
              ? `סומן כסופי · ${formatDateTime(group.resultsFinalizedAt ?? group.resultsPublishedAt ?? "")}`
              : `תוצאות ביניים · עודכן ${formatDateTime(group.resultsPublishedAt ?? "")}`}
          </p>
          <div className="mt-4">
            <Leaderboard rows={leaderboard} parties={parties} final={isFinal} />
          </div>
          {officialSeats && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-bold text-muted">התוצאות {isFinal ? "הסופיות" : "עד כה"}</h3>
              <KnessetArc parties={parties} seats={officialSeats} totalSeats={election.totalSeats} />
              <div className="mt-3">
                <SeatBars parties={parties} values={officialSeats} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* group forecast */}
      {groupForecast && (
        <section className="card p-6">
          <h2 className="text-lg">📊 תחזית הקבוצה</h2>
          <p className="mt-1 text-sm text-muted">
            הממוצע של כל התחזיות שנשלחו — המפה הקולקטיבית של הקבוצה.
          </p>
          <div className="mt-3">
            <KnessetArc
              parties={parties}
              seats={groupForecast.seats}
              totalSeats={election.totalSeats}
            />
            <div className="mt-3">
              <SeatBars
                parties={parties}
                values={groupForecast.seats}
                compareValues={officialSeats ?? undefined}
              />
            </div>
          </div>
        </section>
      )}

      {/* participants */}
      <section className="card p-6">
        <h2 className="text-lg">משתתפים</h2>
        {!group.locked && (
          <p className="mt-1 text-xs text-muted">
            עד הנעילה רואים רק מי הצטרף ומי שלח — לא את התחזיות עצמן.
          </p>
        )}
        <ParticipantList code={group.code} participants={participants} canRename={viewer.isAdmin} />
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
