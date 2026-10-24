"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PartyT, QuestionT, BlocT, WildQuestionT, ConfidencePickT } from "@/lib/types";
import { savePredictionAction } from "@/app/actions";
import { formatDateTime } from "@/lib/clientTime";
import KnessetArc from "@/components/KnessetArc";

type Seats = Record<string, number>;
type Answers = Record<string, string | number | boolean>;

export default function PredictionForm({
  code,
  totalSeats,
  thresholdSeats,
  deadline,
  parties,
  questions,
  wildQuestion,
  blocs,
  initialSeats,
  initialAnswers,
  initialConfidencePick,
  initialWildAnswer,
  alreadySubmitted,
}: {
  code: string;
  totalSeats: number;
  thresholdSeats: number;
  deadline: string;
  parties: PartyT[];
  questions: QuestionT[];
  wildQuestion: WildQuestionT;
  blocs: BlocT[];
  initialSeats: Seats;
  initialAnswers: Answers;
  initialConfidencePick: ConfidencePickT;
  initialWildAnswer: string | number | boolean | null;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seats>(() => {
    const s: Seats = {};
    for (const p of parties) s[p.key] = Number(initialSeats[p.key] ?? 0);
    return s;
  });
  const [answers, setAnswers] = useState<Answers>({ ...initialAnswers });
  const [confidenceKey, setConfidenceKey] = useState(initialConfidencePick.partyKey || "");
  const [wildAnswer, setWildAnswer] = useState<string>(
    initialWildAnswer == null ? "" : String(initialWildAnswer),
  );
  const [showSummary, setShowSummary] = useState(false);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const total = useMemo(() => Object.values(seats).reduce((a, b) => a + (b || 0), 0), [seats]);
  const remaining = totalSeats - total;
  const belowThresholdParties = useMemo(
    () => parties.filter((p) => (seats[p.key] ?? 0) > 0 && (seats[p.key] ?? 0) < thresholdSeats),
    [parties, seats, thresholdSeats],
  );
  const valid = total === totalSeats && belowThresholdParties.length === 0;

  function setSeat(key: string, value: number) {
    const v = Math.max(0, Math.min(totalSeats, Math.floor(value || 0)));
    setSeats((s) => ({ ...s, [key]: v }));
    if (v === 0 && confidenceKey === key) setConfidenceKey("");
    setMsg(null);
  }
  const bump = (key: string, delta: number) => {
    const cur = seats[key] ?? 0;
    if (delta > 0 && cur < thresholdSeats) {
      setSeat(key, thresholdSeats);
    } else if (delta < 0 && cur <= thresholdSeats) {
      setSeat(key, 0);
    } else {
      setSeat(key, cur + delta);
    }
  };

  const blocTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const b of blocs) t[b.key] = 0;
    for (const p of parties) if (p.bloc) t[p.bloc] = (t[p.bloc] ?? 0) + (seats[p.key] ?? 0);
    return t;
  }, [seats, parties, blocs]);

  const listsIn = parties.filter((p) => (seats[p.key] ?? 0) > 0).length;

  async function save(submit: boolean) {
    if (submit && belowThresholdParties.length > 0) {
      setMsg({
        kind: "err",
        text: `לא ניתן לתת פחות מ-${thresholdSeats} מנדטים למפלגה שעוברת את אחוז החסימה (0 או ${thresholdSeats}+ בלבד)`,
      });
      return;
    }
    if (submit && !valid) {
      setMsg({ kind: "err", text: `צריך לחלק בדיוק ${totalSeats} מנדטים` });
      return;
    }
    if (submit && !confidenceKey) {
      setMsg({ kind: "err", text: "בחרו ניחוש ביטחון אחד (⭐) לפני השליחה" });
      return;
    }
    setBusy(submit ? "submit" : "draft");
    setMsg(null);
    const res = await savePredictionAction(code, {
      seats,
      answers,
      confidencePick: confidenceKey
        ? { partyKey: confidenceKey, seats: seats[confidenceKey] ?? 0 }
        : undefined,
      wildAnswer: wildQuestion.enabled && wildAnswer ? wildAnswer : null,
      submit,
    });
    setBusy(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error ?? "שגיאה" });
      return;
    }
    if (submit) {
      setShowSummary(false);
      router.push(`/g/${code}`);
      router.refresh();
    } else {
      setMsg({ kind: "ok", text: "הטיוטה נשמרה ✓" });
    }
  }

  const pct = Math.min(100, (total / totalSeats) * 100);

  return (
    <div className="space-y-4 pb-28">
      {/* live Knesset map */}
      <div className="card p-4">
        <KnessetArc parties={parties} seats={seats} totalSeats={totalSeats} size={340} />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          {blocs.map((b) => (
            <div key={b.key} className="rounded-lg bg-bg py-1.5">
              <div className="text-[11px] font-bold text-muted">{b.labelHe}</div>
              <div className="num text-lg font-black">{blocTotals[b.key] ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center text-xs text-muted">
          {listsIn} רשימות עוברות את אחוז החסימה בתחזית שלך
        </div>
      </div>

      <div className="card p-4 text-sm text-muted">
        חלקו בדיוק <b className="text-ink">{totalSeats}</b> מנדטים. רשימה עם{" "}
        <b className="text-ink">0</b> = ניחוש שהיא <b>לא</b> עוברת את אחוז החסימה (מינימום{" "}
        <b className="text-ink">{thresholdSeats}</b> מנדטים למפלגה שעוברת). אפשר לשנות
        כמה שרוצים עד {formatDateTime(deadline)} — <b className="text-ink">חברי הקבוצה רואים
        את הגרסה האחרונה שלך</b>.
      </div>

      {/* seats */}
      <div className="grid gap-2 sm:grid-cols-2">
        {parties.map((p) => {
          const v = seats[p.key] ?? 0;
          const enters = v > 0;
          const near = v > 0 && v < thresholdSeats;
          const isPick = confidenceKey === p.key;
          return (
            <div
              key={p.key}
              className={`card flex items-center gap-2 p-3 transition ${
                enters ? "" : "opacity-60"
              } ${isPick ? "ring-2 ring-accent-500" : ""}`}
            >
              <span
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: enters ? p.color : "var(--color-line)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-bold">
                  {p.nameHe}
                  {p.ballotLetters && (
                    <span className="text-[11px] font-normal text-muted">({p.ballotLetters})</span>
                  )}
                </div>
                <div className="text-xs text-muted">
                  {p.leaderHe || p.name}
                  {!enters && <span className="text-bad"> · לא עוברת</span>}
                  {near && (
                    <span className="font-bold text-bad">
                      {" "}
                      · מינימום {thresholdSeats} מנדטים (או 0)
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                title="ניחוש הביטחון שלי"
                disabled={!enters}
                onClick={() => setConfidenceKey(isPick ? "" : p.key)}
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg disabled:opacity-30 ${
                  isPick ? "bg-accent-500 text-white" : "bg-bg"
                }`}
              >
                ★
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="btn btn-outline h-8 w-8 !p-0 text-lg"
                  onClick={() => bump(p.key, -1)}
                  aria-label="הפחתה"
                >
                  −
                </button>
                <input
                  className={`field num w-14 !px-1 text-center font-black ${
                    near ? "border-bad text-bad" : ""
                  }`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={totalSeats}
                  value={v === 0 ? "" : v}
                  placeholder="0"
                  onChange={(e) => setSeat(p.key, Number(e.target.value))}
                  onBlur={() => {
                    if (v > 0 && v < thresholdSeats) setSeat(p.key, thresholdSeats);
                  }}
                />
                <button
                  type="button"
                  className="btn btn-outline h-8 w-8 !p-0 text-lg"
                  onClick={() => bump(p.key, 1)}
                  aria-label="הוספה"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* confidence pick summary */}
      <div className="card p-4 text-sm">
        <div className="font-bold">⭐ ניחוש הביטחון</div>
        <p className="mt-1 text-muted">
          {confidenceKey ? (
            <>
              אני הכי בטוח/ה ש<b className="text-ink">{partyName(parties, confidenceKey)}</b> תקבל{" "}
              <b className="num text-ink">{seats[confidenceKey] ?? 0}</b> מנדטים. פגיעה מדויקת =
              בונוס גדול.
            </>
          ) : (
            "סמנו ★ ליד רשימה אחת שאתם הכי בטוחים לגבי מספר המנדטים שלה."
          )}
        </p>
      </div>

      {/* bonus questions */}
      {questions.length > 0 && (
        <div className="card space-y-4 p-4">
          <h2 className="text-lg">שאלות בונוס</h2>
          {questions.map((q) => (
            <QuestionField
              key={q.qid}
              q={q}
              parties={parties}
              blocs={blocs}
              value={answers[q.qid]}
              onChange={(val) => {
                setAnswers((a) => ({ ...a, [q.qid]: val }));
                setMsg(null);
              }}
            />
          ))}
        </div>
      )}

      {/* wild prediction */}
      {wildQuestion.enabled && (
        <div className="card space-y-2 p-4">
          <h2 className="text-lg">🎲 הניחוש הפראי</h2>
          <label className="label">
            {wildQuestion.textHe} <span className="text-brand-700">· {wildQuestion.points} נק׳</span>
          </label>
          {wildQuestion.options.length > 0 ? (
            <select
              className="field"
              value={wildAnswer}
              onChange={(e) => setWildAnswer(e.target.value)}
            >
              <option value="">— בחירה —</option>
              {wildQuestion.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="field"
              value={wildAnswer}
              onChange={(e) => setWildAnswer(e.target.value)}
              placeholder="התשובה שלך"
            />
          )}
        </div>
      )}

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            msg.kind === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* sticky footer with progress bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
        <div className="h-1.5 w-full bg-bg">
          <div
            className={`h-full transition-all ${valid ? "bg-good" : "bg-brand-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div
            className={`num rounded-xl px-3 py-2 text-sm font-black ${
              valid ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
            }`}
          >
            {total} / {totalSeats}
            <span className="ms-1 font-bold">
              {valid ? "✓" : remaining > 0 ? `(חסרים ${remaining})` : `(עודף ${-remaining})`}
            </span>
          </div>
          <div className="flex-1" />
          {!alreadySubmitted && (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy !== null}
              onClick={() => save(false)}
            >
              {busy === "draft" ? "שומר…" : "שמירת טיוטה"}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={!valid || busy !== null}
            onClick={() => setShowSummary(true)}
          >
            {alreadySubmitted ? "עדכון התחזית" : "שליחה"}
          </button>
        </div>
      </div>

      {showSummary && (
        <SummaryModal
          parties={parties}
          questions={questions}
          wildQuestion={wildQuestion}
          wildAnswer={wildAnswer}
          blocs={blocs}
          seats={seats}
          answers={answers}
          confidenceKey={confidenceKey}
          total={total}
          onClose={() => setShowSummary(false)}
          onConfirm={() => save(true)}
          busy={busy === "submit"}
        />
      )}
    </div>
  );
}

function partyName(parties: PartyT[], key: string) {
  return parties.find((p) => p.key === key)?.nameHe ?? key;
}

function QuestionField({
  q,
  parties,
  blocs,
  value,
  onChange,
}: {
  q: QuestionT;
  parties: PartyT[];
  blocs: BlocT[];
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
}) {
  return (
    <div>
      <label className="label">
        {q.textHe} <span className="text-brand-700">· {q.points} נק׳</span>
        {q.kind === "turnout" && <span className="text-muted"> · שובר שוויון</span>}
      </label>
      <div className="mt-1">
        {q.type === "party" && (
          <select
            className="field"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">— בחירה —</option>
            {parties.map((p) => (
              <option key={p.key} value={p.key}>
                {p.nameHe}
              </option>
            ))}
          </select>
        )}
        {q.type === "choice" && (
          <select
            className="field"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">— בחירה —</option>
            {(q.autoResolve === "blocWinner"
              ? blocs.map((b) => ({ value: b.key, label: b.labelHe }))
              : q.options
            ).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {q.type === "boolean" && (
          <div className="flex gap-2">
            {[
              { v: true, l: "כן" },
              { v: false, l: "לא" },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                className={`btn ${value === o.v ? "btn-primary" : "btn-outline"}`}
                onClick={() => onChange(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
        )}
        {q.type === "number" && (
          <input
            className="field num w-32"
            type="number"
            inputMode="decimal"
            min={0}
            value={value === undefined || value === "" ? "" : Number(value)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        )}
      </div>
    </div>
  );
}

function SummaryModal({
  parties,
  questions,
  wildQuestion,
  wildAnswer,
  blocs,
  seats,
  answers,
  confidenceKey,
  total,
  onClose,
  onConfirm,
  busy,
}: {
  parties: PartyT[];
  questions: QuestionT[];
  wildQuestion: WildQuestionT;
  wildAnswer: string;
  blocs: BlocT[];
  seats: Seats;
  answers: Answers;
  confidenceKey: string;
  total: number;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const labelFor = (q: QuestionT): string => {
    const raw = answers[q.qid];
    if (raw === undefined || raw === "") return "— (לא נענתה)";
    if (q.type === "boolean") return raw ? "כן" : "לא";
    if (q.type === "party") return parties.find((p) => p.key === raw)?.nameHe ?? String(raw);
    if (q.type === "choice") {
      const opts =
        q.autoResolve === "blocWinner"
          ? blocs.map((b) => ({ value: b.key, label: b.labelHe }))
          : q.options;
      return opts.find((o) => o.value === raw)?.label ?? String(raw);
    }
    return String(raw);
  };

  const sorted = parties
    .map((p) => ({ p, v: seats[p.key] ?? 0 }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
  const failing = parties.filter((p) => (seats[p.key] ?? 0) === 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="card max-h-[85dvh] w-full max-w-lg overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl">אישור התחזית</h2>
        <p className="mt-1 text-sm text-muted">בדקו לפני השליחה. אפשר לערוך עד מועד הנעילה.</p>

        <h3 className="mt-4 text-sm font-bold text-muted">חלוקת מנדטים ({total})</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {sorted.map(({ p, v }) => (
            <li key={p.key} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                {p.nameHe}
                {confidenceKey === p.key && <span>⭐</span>}
              </span>
              <span className="num font-black">{v}</span>
            </li>
          ))}
        </ul>

        {failing.length > 0 && (
          <p className="mt-2 text-xs text-muted">
            לא עוברות את החסימה: {failing.map((p) => p.nameHe).join(", ")}
          </p>
        )}

        {questions.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-bold text-muted">שאלות בונוס</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {questions.map((q) => (
                <li key={q.qid} className="flex items-center justify-between gap-3">
                  <span className="text-muted">{q.textHe}</span>
                  <span className="font-bold">{labelFor(q)}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {wildQuestion.enabled && (
          <p className="mt-3 text-sm">
            <span className="text-muted">🎲 {wildQuestion.textHe}: </span>
            <b>
              {wildQuestion.options.find((o) => o.value === wildAnswer)?.label ||
                wildAnswer ||
                "— (לא נענתה)"}
            </b>
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={busy}>
            חזרה
          </button>
          <button className="btn btn-primary flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "שולח…" : "שליחת התחזית"}
          </button>
        </div>
      </div>
    </div>
  );
}
