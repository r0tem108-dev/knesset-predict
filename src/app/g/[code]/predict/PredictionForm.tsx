"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PartyT, QuestionT, BlocT } from "@/lib/types";
import { savePredictionAction } from "@/app/actions";
import { formatDateTime } from "@/lib/clientTime";

type Seats = Record<string, number>;
type Answers = Record<string, string | number | boolean>;

export default function PredictionForm({
  code,
  totalSeats,
  thresholdSeats,
  deadline,
  parties,
  questions,
  blocs,
  initialSeats,
  initialAnswers,
  alreadySubmitted,
}: {
  code: string;
  totalSeats: number;
  thresholdSeats: number;
  deadline: string;
  parties: PartyT[];
  questions: QuestionT[];
  blocs: BlocT[];
  initialSeats: Seats;
  initialAnswers: Answers;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState<Seats>(() => {
    const s: Seats = {};
    for (const p of parties) s[p.key] = Number(initialSeats[p.key] ?? 0);
    return s;
  });
  const [answers, setAnswers] = useState<Answers>({ ...initialAnswers });
  const [showSummary, setShowSummary] = useState(false);
  const [busy, setBusy] = useState<"draft" | "submit" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const total = useMemo(() => Object.values(seats).reduce((a, b) => a + (b || 0), 0), [seats]);
  const remaining = totalSeats - total;
  const valid = total === totalSeats;

  function setSeat(key: string, value: number) {
    const v = Math.max(0, Math.min(totalSeats, Math.floor(value || 0)));
    setSeats((s) => ({ ...s, [key]: v }));
    setMsg(null);
  }
  function bump(key: string, delta: number) {
    setSeat(key, (seats[key] ?? 0) + delta);
  }

  const blocTotals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const b of blocs) t[b.key] = 0;
    for (const p of parties) if (p.bloc) t[p.bloc] = (t[p.bloc] ?? 0) + (seats[p.key] ?? 0);
    return t;
  }, [seats, parties, blocs]);

  const partiesIn = parties.filter((p) => (seats[p.key] ?? 0) >= thresholdSeats).length;

  async function save(submit: boolean) {
    if (submit && !valid) {
      setMsg({ kind: "err", text: `צריך לחלק בדיוק ${totalSeats} מנדטים` });
      return;
    }
    setBusy(submit ? "submit" : "draft");
    setMsg(null);
    const res = await savePredictionAction(code, { seats, answers, submit });
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
      setMsg({ kind: "ok", text: "הטיוטה נשמרה" });
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="card p-4 text-sm text-muted">
        חלקו בדיוק <b className="text-ink">{totalSeats}</b> מנדטים בין המפלגות. אפשר לשמור
        טיוטה בכל שלב ולערוך עד {formatDateTime(deadline)}.
      </div>

      {/* seats */}
      <div className="grid gap-2 sm:grid-cols-2">
        {parties.map((p) => {
          const v = seats[p.key] ?? 0;
          const passes = v >= thresholdSeats;
          return (
            <div key={p.key} className="card flex items-center gap-3 p-3">
              <span
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.nameHe}</div>
                <div className="text-xs text-muted">
                  {p.name}
                  {p.abbr && p.abbr !== "—" ? ` · ${p.abbr}` : ""}
                  {v > 0 && (
                    <span className={passes ? "text-good" : "text-bad"}>
                      {" "}
                      · {passes ? "עובר אחוז חסימה" : "מתחת לחסימה"}
                    </span>
                  )}
                </div>
              </div>
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
                  className="field num w-14 !px-1 text-center font-black"
                  type="number"
                  min={0}
                  max={totalSeats}
                  value={v === 0 ? "" : v}
                  placeholder="0"
                  onChange={(e) => setSeat(p.key, Number(e.target.value))}
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

      {/* bloc + threshold readout */}
      <div className="card grid gap-3 p-4 text-sm sm:grid-cols-3">
        {blocs.map((b) => (
          <div key={b.key}>
            <div className="text-xs font-bold text-muted">{b.labelHe}</div>
            <div className="num text-xl font-black">{blocTotals[b.key] ?? 0}</div>
          </div>
        ))}
        <div>
          <div className="text-xs font-bold text-muted">מפלגות שעוברות את החסימה</div>
          <div className="num text-xl font-black">{partiesIn}</div>
        </div>
      </div>

      {/* questions */}
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

      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-bold ${
            msg.kind === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
          }`}
        >
          {msg.text}
        </p>
      )}

      {/* sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
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
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy !== null}
            onClick={() => save(false)}
          >
            {busy === "draft" ? "שומר…" : "שמירת טיוטה"}
          </button>
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
          blocs={blocs}
          seats={seats}
          answers={answers}
          total={total}
          onClose={() => setShowSummary(false)}
          onConfirm={() => save(true)}
          busy={busy === "submit"}
        />
      )}
    </div>
  );
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
  blocs,
  seats,
  answers,
  total,
  onClose,
  onConfirm,
  busy,
}: {
  parties: PartyT[];
  questions: QuestionT[];
  blocs: BlocT[];
  seats: Seats;
  answers: Answers;
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

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4"
      onClick={onClose}
    >
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
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: p.color }}
                />
                {p.nameHe}
              </span>
              <span className="num font-black">{v}</span>
            </li>
          ))}
        </ul>

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
