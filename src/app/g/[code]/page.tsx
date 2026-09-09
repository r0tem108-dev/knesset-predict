import Link from "next/link";
import { notFound } from "next/navigation";
import Countdown from "@/components/Countdown";
import DeadlineBanner from "@/components/DeadlineBanner";
import InviteBox from "@/components/InviteBox";
import Leaderboard from "@/components/Leaderboard";
import SeatBars from "@/components/SeatBars";
import KnessetArc from "@/components/KnessetArc";
import RenameName from "@/components/RenameName";
import ParticipantList from "@/components/ParticipantList";
import ActivityFeed from "@/components/ActivityFeed";
import { getDashboard, AppError } from "@/lib/data";
import { formatDateTime } from "@/lib/clientTime";
import type { GroupStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<GroupStatus, { he: string; cls: string }> = {
  open: { he: "פתוח לתחזיות · עדיין אפשר לשנות", cls: "bg-good/10 text-good" },
  locked: { he: "🔒 התחזיות נעולות", cls: "bg-bad/10 text-bad" },
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
    leaderboard,
    comparison,
    groupForecast,
    groupInsights,
    activity,
    officialSeats,
    canSeePredictions,
  } = data;

  const submittedCount = participants.filter((p) => p.hasSubmitted).length;
  const isMember = Boolean(viewer.participant);
  const mySubmitted = Boolean(myPrediction?.submitted);
  const chip = STATUS_CHIP[group.status];
  const isFinal = group.status === "final";
  const open = !group.locked;

  return (
    <div className="space-y-6">
      {/* header */}
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/?home=1" className="text-xs text-brand-700">
              ← הקבוצות שלי
            </Link>
            <div className="mt-1 flex items-center gap-2">
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
            {comparison && comparison.length > 0 && (
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

        {viewer.isAdmin && (
          <div className="mt-4">
            <InviteBox code={group.code} />
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-brand-50 p-4">
            <Countdown target={election.electionDay} />
          </div>
          <Stat label="משתתפים" value={String(participants.length)} />
          <Stat label="שלחו תחזית" value={`${submittedCount} / ${participants.length}`} />
        </div>
      </section>

      {/* deadline / urgency */}
      <DeadlineBanner
        code={group.code}
        deadline={group.predictionDeadline}
        locked={group.locked}
        canEdit={isMember && open}
      />

      {/* my status */}
      {isMember && viewer.participant && (
        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">התחזית שלי</h2>
            <RenameName code={group.code} currentName={viewer.participant.displayName} />
          </div>
          {mySubmitted ? (
            <p className="mt-1 text-sm text-good">
              ✓{" "}
              {myPrediction && myPrediction.changeCount === 0
                ? `נשלחה · ${formatDateTime(myPrediction.firstSubmittedAt ?? myPrediction.submittedAt ?? "")}`
                : `עודכנה לאחרונה · ${formatDateTime(myPrediction?.submittedAt ?? "")}`}
              {myPrediction && myPrediction.changeCount > 0 && (
                <span className="text-muted">
                  {" "}
                  · {myPrediction.changeCount === 1 ? "שינוי אחד" : `${myPrediction.changeCount} שינויים`}
                </span>
              )}
              {open && " · ניתן לערוך עד מועד הנעילה."}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {group.locked
                ? "לא נשלחה תחזית תקינה לפני הנעילה."
                : `עדיין לא שלחת תחזית תקינה (חלוקה של ${election.totalSeats} מנדטים).`}
            </p>
          )}
          {open && (
            <Link href={`/g/${group.code}/predict`} className="btn btn-ghost mt-3">
              {mySubmitted ? "עריכת התחזית" : "המשך למילוי"}
            </Link>
          )}
          <p className="mt-3 text-xs text-muted">
            כדי לחזור לקבוצה ממכשיר אחר — היכנס שוב עם אותו שם ואותו קוד אישי.
          </p>
        </section>
      )}

      {/* not a member — nudge to join */}
      {!isMember && (
        <section className="card p-6 text-sm text-muted">
          הצטרפו לקבוצה כדי לראות את התחזיות של כולם, את תחזית הקבוצה ואת ההשוואות.
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
              <h3 className="mb-2 text-sm font-bold text-muted">
                התוצאות {isFinal ? "הסופיות" : "עד כה"}
              </h3>
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg">📊 תחזית הקבוצה</h2>
            {open && (
              <span className="chip bg-good/10 text-good">חי · משתנה עם כל עדכון</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            הממוצע של כל התחזיות שנשלחו — המפה הקולקטיבית של הקבוצה
            {open && " (מתעדכן בזמן אמת)"}.
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

      {/* group insights */}
      {groupInsights.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg">🔎 תובנות מהקבוצה</h2>
          {open && (
            <p className="mt-1 text-xs text-muted">משתנה בזמן אמת — התחזיות עדיין פתוחות.</p>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {groupInsights.map((ins, i) => (
              <div key={i} className="rounded-xl border border-line p-3">
                <div className="text-xs font-bold text-muted">
                  {ins.emoji} {ins.title}
                </div>
                <div className="mt-0.5 text-sm font-bold">{ins.text}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* recent activity */}
      {canSeePredictions && activity.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg">⚡ פעילות אחרונה</h2>
          <div className="mt-3">
            <ActivityFeed code={group.code} items={activity} canView={canSeePredictions} />
          </div>
        </section>
      )}

      {/* participants */}
      <section className="card p-6">
        <h2 className="text-lg">משתתפים</h2>
        {!canSeePredictions && (
          <p className="mt-1 text-xs text-muted">
            {isMember
              ? "מנהל הקבוצה כיבה את הצגת התחזיות."
              : "הצטרפו כדי לראות תחזיות."}
          </p>
        )}
        <ParticipantList
          code={group.code}
          participants={participants}
          canRename={viewer.isAdmin}
          locked={group.locked}
          canView={canSeePredictions}
          viewerId={viewer.participant?.id}
        />
        {canSeePredictions && (
          <p className="mt-2 text-xs text-muted">לחצו על שם כדי לראות את התחזית המלאה.</p>
        )}
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
