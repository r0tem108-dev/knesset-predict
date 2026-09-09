import Link from "next/link";
import { notFound } from "next/navigation";
import KnessetArc from "@/components/KnessetArc";
import SeatBars from "@/components/SeatBars";
import { getParticipantCard, AppError } from "@/lib/data";
import { formatDateTime, relativeTime } from "@/lib/clientTime";
import type { QuestionT, BlocT, PartyT } from "@/lib/types";

export const dynamic = "force-dynamic";

function answerLabel(
  q: QuestionT,
  raw: string | number | boolean | undefined,
  parties: PartyT[],
  blocs: BlocT[],
): string {
  if (raw === undefined || raw === "" || raw === null) return "— (לא נענתה)";
  if (q.type === "boolean") return raw ? "כן" : "לא";
  if (q.type === "party") return parties.find((p) => p.key === raw)?.nameHe ?? String(raw);
  if (q.type === "choice") {
    const opts =
      q.autoResolve === "blocWinner"
        ? blocs.map((b) => ({ value: b.key, label: b.labelHe }))
        : q.options;
    return opts.find((o) => o.value === raw)?.label ?? String(raw);
  }
  if (q.kind === "turnout") return `${raw}%`;
  return String(raw);
}

export default async function ParticipantCardPage({
  params,
}: {
  params: Promise<{ code: string; pid: string }>;
}) {
  const { code, pid } = await params;

  let data;
  try {
    data = await getParticipantCard(code, pid);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }
  if (!data) notFound();

  const {
    group,
    election,
    parties,
    participant,
    isMe,
    hidden,
    submitted,
    seats,
    answers,
    confidencePick,
    wildAnswer,
    totalSeats,
    lastUpdatedAt,
    firstSubmittedAt,
    changeCount,
    groupForecast,
    officialSeats,
  } = data;

  const blocTotals: Record<string, number> = {};
  for (const b of election.blocs) blocTotals[b.key] = 0;
  for (const p of parties) if (p.bloc) blocTotals[p.bloc] = (blocTotals[p.bloc] ?? 0) + (seats[p.key] ?? 0);
  const listsIn = parties.filter((p) => (seats[p.key] ?? 0) > 0).length;

  const questions = group.questions.filter((q) => q.enabled);
  const cpParty = parties.find((p) => p.key === confidencePick.partyKey);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
          ← {group.name}
        </Link>
        <h1 className="text-2xl">
          התחזית של {participant.displayName}
          {isMe && <span className="text-muted"> (אתה)</span>}
        </h1>
        {submitted && (
          <p className="text-sm text-muted">
            {changeCount === 0 && firstSubmittedAt
              ? `נשלחה · ${formatDateTime(firstSubmittedAt)}`
              : `עודכן לאחרונה ${lastUpdatedAt ? relativeTime(lastUpdatedAt) : ""}`}
            {changeCount > 0 && ` · ${changeCount === 1 ? "שינוי אחד" : `${changeCount} שינויים`}`}
            {group.locked && " · 🔒 נעול"}
          </p>
        )}
      </div>

      {hidden ? (
        <div className="card p-6 text-sm text-muted">
          {data.viewer.participant
            ? "מנהל הקבוצה כיבה את הצגת התחזיות. אפשר לראות רק את התחזית שלך."
            : "הצטרפו לקבוצה כדי לראות את התחזית הזו."}
        </div>
      ) : !submitted ? (
        <div className="card p-6 text-sm text-muted">
          {participant.displayName} עדיין לא שלח/ה תחזית תקינה.
        </div>
      ) : (
        <>
          <section className="card p-4">
            <KnessetArc parties={parties} seats={seats} totalSeats={election.totalSeats} size={340} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              {election.blocs.map((b) => (
                <div key={b.key} className="rounded-lg bg-bg py-1.5">
                  <div className="text-[11px] font-bold text-muted">{b.labelHe}</div>
                  <div className="num text-lg font-black">{blocTotals[b.key] ?? 0}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-center text-xs text-muted">
              {listsIn} רשימות עוברות את אחוז החסימה · סה״כ {totalSeats}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-2 text-lg">חלוקת המנדטים</h2>
            <p className="mb-3 text-xs text-muted">
              המספר השני = {officialSeats ? "התוצאה הרשמית" : "תחזית הקבוצה"}
            </p>
            <SeatBars
              parties={parties}
              values={seats}
              compareValues={officialSeats ?? groupForecast?.seats ?? undefined}
            />
            {parties.some((p) => (seats[p.key] ?? 0) === 0) && (
              <p className="mt-3 text-xs text-muted">
                ניחש/ה שלא עוברות את החסימה:{" "}
                {parties
                  .filter((p) => (seats[p.key] ?? 0) === 0)
                  .map((p) => p.nameHe)
                  .join(", ")}
              </p>
            )}
          </section>

          {cpParty && (
            <section className="card border-accent-500 bg-accent-400/10 p-6">
              <h2 className="text-lg">⭐ ניחוש הביטחון</h2>
              <p className="mt-1 text-sm">
                הכי בטוח/ה ש<b>{cpParty.nameHe}</b> תקבל{" "}
                <b className="num">{confidencePick.seats}</b> מנדטים.
              </p>
            </section>
          )}

          {questions.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-3 text-lg">שאלות בונוס</h2>
              <ul className="space-y-2 text-sm">
                {questions.map((q) => (
                  <li key={q.qid} className="flex items-center justify-between gap-3">
                    <span className="text-muted">{q.textHe}</span>
                    <span className="font-bold">
                      {answerLabel(q, answers[q.qid], parties, election.blocs)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {group.wildQuestion.enabled && (
            <section className="card p-6">
              <h2 className="text-lg">🎲 הניחוש הפראי</h2>
              <p className="mt-1 text-sm text-muted">{group.wildQuestion.textHe}</p>
              <p className="mt-1 font-bold">
                {group.wildQuestion.options.find((o) => o.value === wildAnswer)?.label ||
                  (wildAnswer != null && wildAnswer !== "" ? String(wildAnswer) : "— (לא נענתה)")}
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
