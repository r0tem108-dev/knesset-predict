import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PredictionForm from "./PredictionForm";
import SeatBars from "@/components/SeatBars";
import KnessetArc from "@/components/KnessetArc";
import { getDashboard, AppError } from "@/lib/data";
import { formatDateTime } from "@/lib/clientTime";

export const dynamic = "force-dynamic";

export default async function PredictPage({
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

  const { group, election, parties, viewer, myPrediction } = data;

  if (!viewer.participant) redirect(`/join?code=${group.code}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
            ← {group.name}
          </Link>
          <h1 className="text-2xl">התחזית שלי</h1>
        </div>
      </div>

      {group.locked ? (
        <div className="card p-6">
          <p className="font-bold text-bad">התחזיות בקבוצה זו נעולות.</p>
          <p className="mt-1 text-sm text-muted">
            מועד הנעילה: {formatDateTime(group.predictionDeadline)}
          </p>
          {myPrediction?.submitted ? (
            <div className="mt-4">
              <h2 className="mb-2 text-sm font-bold text-muted">התחזית שנשלחה</h2>
              <KnessetArc parties={parties} seats={myPrediction.seats} totalSeats={election.totalSeats} />
              <div className="mt-3">
                <SeatBars parties={parties} values={myPrediction.seats} />
              </div>
              {myPrediction.confidencePick.partyKey && (
                <p className="mt-3 text-sm">
                  ⭐ ניחוש הביטחון:{" "}
                  <b>
                    {parties.find((p) => p.key === myPrediction.confidencePick.partyKey)?.nameHe}
                  </b>{" "}
                  — <span className="num">{myPrediction.confidencePick.seats}</span> מנדטים
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm">לא נשלחה תחזית תקינה לפני הנעילה.</p>
          )}
        </div>
      ) : (
        <PredictionForm
          code={group.code}
          totalSeats={election.totalSeats}
          thresholdSeats={election.thresholdSeats}
          deadline={group.predictionDeadline}
          parties={parties}
          questions={group.questions.filter((q) => q.enabled)}
          wildQuestion={group.wildQuestion}
          blocs={election.blocs}
          initialSeats={myPrediction?.seats ?? {}}
          initialAnswers={myPrediction?.answers ?? {}}
          initialConfidencePick={myPrediction?.confidencePick ?? { partyKey: "", seats: 0 }}
          initialWildAnswer={myPrediction?.wildAnswer ?? null}
          alreadySubmitted={Boolean(myPrediction?.submitted)}
        />
      )}
    </div>
  );
}
