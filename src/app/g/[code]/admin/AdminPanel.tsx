"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupT, ElectionT, PartyT, QuestionT } from "@/lib/types";
import {
  lockGroupAction,
  updateQuestionsAction,
  updateScoringAction,
  saveResultsAction,
} from "@/app/actions";
import { resolveAutoAnswer, type QuestionLite, type PartyLite } from "@/lib/scoring";
import { formatDateTime } from "@/lib/clientTime";
import type { OfficialResultDraft } from "@/lib/data";

type Tab = "status" | "questions" | "scoring" | "results";

export default function AdminPanel({
  code,
  group,
  election,
  parties,
  participantCount,
  submittedCount,
  resultDraft,
}: {
  code: string;
  group: GroupT;
  election: ElectionT;
  parties: PartyT[];
  participantCount: number;
  submittedCount: number;
  resultDraft: OfficialResultDraft;
}) {
  const [tab, setTab] = useState<Tab>("status");

  const tabs: [Tab, string][] = [
    ["status", "סטטוס ונעילה"],
    ["questions", "שאלות בונוס"],
    ["scoring", "שיטת ניקוד"],
    ["results", "תוצאות רשמיות"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map(([t, label]) => (
          <button
            key={t}
            className={`btn ${tab === t ? "btn-primary" : "btn-outline"}`}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "status" && (
        <StatusTab
          code={code}
          group={group}
          participantCount={participantCount}
          submittedCount={submittedCount}
        />
      )}
      {tab === "questions" && (
        <QuestionsTab code={code} group={group} parties={parties} />
      )}
      {tab === "scoring" && <ScoringTab code={code} group={group} />}
      {tab === "results" && (
        <ResultsTab
          code={code}
          group={group}
          election={election}
          parties={parties}
          draft={resultDraft}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------- status --- */

function StatusTab({
  code,
  group,
  participantCount,
  submittedCount,
}: {
  code: string;
  group: GroupT;
  participantCount: number;
  submittedCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleLock(lock: boolean) {
    setBusy(true);
    await lockGroupAction(code, lock);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5 text-sm">
      <Row k="קוד קבוצה" v={group.code} />
      <Row k="מועד נעילה" v={formatDateTime(group.predictionDeadline)} />
      <Row
        k="מצב"
        v={group.locked ? "נעול" : "פתוח"}
      />
      <Row k="משתתפים" v={`${submittedCount} / ${participantCount} שלחו תחזית`} />
      <Row
        k="נעילה ידנית"
        v={group.lockedAt ? `ננעל ב-${formatDateTime(group.lockedAt)}` : "—"}
      />
      <div className="flex gap-2 pt-2">
        {group.lockedAt ? (
          <button className="btn btn-outline" disabled={busy} onClick={() => toggleLock(false)}>
            ביטול נעילה ידנית
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={() => toggleLock(true)}>
            נעילת התחזיות עכשיו
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        גם ללא נעילה ידנית, התחזיות ננעלות אוטומטית במועד הנעילה.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-line pb-2">
      <span className="text-muted">{k}</span>
      <span className="num font-bold">{v}</span>
    </div>
  );
}

/* ------------------------------------------------------------ questions --- */

const AUTO_LABELS: Record<string, string> = {
  "": "ידני (מוזן בתוצאות)",
  largestParty: "אוטומטי · מפלגה גדולה",
  blocWinner: "אוטומטי · גוש מנצח",
  partyCount: "אוטומטי · מספר מפלגות",
  anyPartyBelowThreshold: "אוטומטי · מפלגה מתחת לחסימה",
};

function QuestionsTab({
  code,
  group,
  parties,
}: {
  code: string;
  group: GroupT;
  parties: PartyT[];
}) {
  const router = useRouter();
  const [list, setList] = useState<QuestionT[]>(group.questions);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function patch(i: number, p: Partial<QuestionT>) {
    setList((l) => l.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  }
  function remove(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function add() {
    setList((l) => [
      ...l,
      {
        qid: `q_${Date.now()}`,
        type: "boolean",
        text: "New question",
        textHe: "שאלה חדשה",
        options: [],
        points: 5,
        autoResolve: "",
        enabled: true,
        order: l.length + 1,
      },
    ]);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateQuestionsAction(
      code,
      list.map((q, i) => ({ ...q, order: i + 1 })),
    );
    setBusy(false);
    setMsg(res.ok ? "נשמר ✓" : res.error ?? "שגיאה");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      {group.locked && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm font-bold text-bad">
          התחזיות נעולות — לא ניתן לשנות שאלות.
        </p>
      )}
      {list.map((q, i) => (
        <div key={q.qid} className="card space-y-2 p-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={q.enabled}
              onChange={(e) => patch(i, { enabled: e.target.checked })}
            />
            <input
              className="field flex-1"
              value={q.textHe}
              onChange={(e) => patch(i, { textHe: e.target.value })}
            />
            <button className="btn btn-outline !px-3" onClick={() => remove(i)} type="button">
              מחיקה
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              סוג:
              <select
                className="field !w-auto !py-1"
                value={q.type}
                onChange={(e) => patch(i, { type: e.target.value as QuestionT["type"] })}
              >
                <option value="party">מפלגה</option>
                <option value="choice">בחירה</option>
                <option value="boolean">כן/לא</option>
                <option value="number">מספר</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              ניקוד:
              <input
                className="field num !w-20 !py-1"
                type="number"
                value={q.points}
                onChange={(e) => patch(i, { points: Number(e.target.value) })}
              />
            </label>
            <span className="chip bg-brand-50 text-brand-700">
              {AUTO_LABELS[q.autoResolve] ?? q.autoResolve}
            </span>
          </div>
          {q.type === "choice" && !q.autoResolve && (
            <div>
              <label className="label">אפשרויות (שורה לכל אחת: ערך | תווית)</label>
              <textarea
                className="field mt-1 font-mono text-xs"
                rows={Math.max(2, q.options.length)}
                value={q.options.map((o) => `${o.value} | ${o.label}`).join("\n")}
                onChange={(e) =>
                  patch(i, {
                    options: e.target.value
                      .split("\n")
                      .map((line) => line.split("|").map((s) => s.trim()))
                      .filter((p) => p[0])
                      .map((p) => ({ value: p[0], label: p[1] ?? p[0] })),
                  })
                }
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button className="btn btn-outline" onClick={add} type="button">
          + הוספת שאלה
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy || group.locked}>
          {busy ? "שומר…" : "שמירת שאלות"}
        </button>
        {msg && <span className="text-sm font-bold text-muted">{msg}</span>}
      </div>
      <p className="text-xs text-muted">
        לידיעה: שאלות מסוג &quot;מפלגה&quot; לוקחות את הרשימה מ-{parties.length} המפלגות במערכת.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- scoring --- */

function ScoringTab({ code, group }: { code: string; group: GroupT }) {
  const router = useRouter();
  const [s, setS] = useState(group.scoring);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateScoringAction(code, {
      seatMethod: s.seatMethod,
      tiers: s.tiers,
      linearBase: s.linearBase,
      linearSlope: s.linearSlope,
      exactBonus: s.exactBonus,
      thresholdPoints: s.thresholdPoints,
    });
    setBusy(false);
    setMsg(res.ok ? "נשמר ✓" : res.error ?? "שגיאה");
    if (res.ok) router.refresh();
  }

  return (
    <div className="card space-y-4 p-5 text-sm">
      <label className="flex items-center gap-2">
        שיטת ניקוד למנדטים:
        <select
          className="field !w-auto"
          value={s.seatMethod}
          onChange={(e) =>
            setS({ ...s, seatMethod: e.target.value as "tiered" | "linear" })
          }
        >
          <option value="tiered">מדורג (לפי גודל טעות)</option>
          <option value="linear">לינארי</option>
        </select>
      </label>

      {s.seatMethod === "tiered" ? (
        <div>
          <div className="label mb-1">מדרגות (טעות עד → נקודות)</div>
          {s.tiers.map((t, i) => (
            <div key={i} className="mb-1 flex items-center gap-2">
              <span>טעות עד</span>
              <input
                className="field num !w-16 !py-1"
                type="number"
                value={t.maxError}
                onChange={(e) =>
                  setS({
                    ...s,
                    tiers: s.tiers.map((x, idx) =>
                      idx === i ? { ...x, maxError: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
              <span>→</span>
              <input
                className="field num !w-16 !py-1"
                type="number"
                value={t.points}
                onChange={(e) =>
                  setS({
                    ...s,
                    tiers: s.tiers.map((x, idx) =>
                      idx === i ? { ...x, points: Number(e.target.value) } : x,
                    ),
                  })
                }
              />
              <span>נק׳</span>
              <button
                className="btn btn-outline !px-2 !py-1"
                type="button"
                onClick={() => setS({ ...s, tiers: s.tiers.filter((_, idx) => idx !== i) })}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn btn-outline !py-1"
            type="button"
            onClick={() =>
              setS({ ...s, tiers: [...s.tiers, { maxError: s.tiers.length, points: 0 }] })
            }
          >
            + מדרגה
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <label className="flex items-center gap-1">
            בסיס:
            <input
              className="field num !w-20 !py-1"
              type="number"
              value={s.linearBase}
              onChange={(e) => setS({ ...s, linearBase: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-1">
            הפחתה לכל טעות:
            <input
              className="field num !w-20 !py-1"
              type="number"
              value={s.linearSlope}
              onChange={(e) => setS({ ...s, linearSlope: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      <label className="flex items-center gap-2">
        בונוס לכל ניחוש &quot;בול&quot;:
        <input
          className="field num !w-20 !py-1"
          type="number"
          value={s.exactBonus}
          onChange={(e) => setS({ ...s, exactBonus: Number(e.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        נקודות לכל ניחוש נכון של מעבר/אי-מעבר אחוז חסימה:
        <input
          className="field num !w-20 !py-1"
          type="number"
          value={s.thresholdPoints}
          onChange={(e) => setS({ ...s, thresholdPoints: Number(e.target.value) })}
        />
      </label>

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "שומר…" : "שמירת הגדרות ניקוד"}
        </button>
        {msg && <span className="font-bold text-muted">{msg}</span>}
      </div>
      <p className="text-xs text-muted">
        שינוי הניקוד לאחר פרסום תוצאות יעדכן אוטומטית את הטבלה בטעינה הבאה.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------- results --- */

function ResultsTab({
  code,
  group,
  election,
  parties,
  draft,
}: {
  code: string;
  group: GroupT;
  election: ElectionT;
  parties: PartyT[];
  draft: OfficialResultDraft;
}) {
  const router = useRouter();
  const [seats, setSeats] = useState<Record<string, number>>(() => {
    const s: Record<string, number> = {};
    for (const p of parties) s[p.key] = Number(draft.seats[p.key] ?? 0);
    return s;
  });
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>(
    () => ({ ...draft.answers }),
  );
  const [enteredBy, setEnteredBy] = useState(draft.enteredBy || group.creatorName);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const total = useMemo(() => Object.values(seats).reduce((a, b) => a + (b || 0), 0), [seats]);
  const valid = total === election.totalSeats;

  const partyLites: PartyLite[] = parties.map((p) => ({
    key: p.key,
    name: p.name,
    nameHe: p.nameHe,
    color: p.color,
    bloc: p.bloc,
  }));

  const manualQuestions = group.questions.filter((q) => q.enabled && !q.autoResolve);
  const autoQuestions = group.questions.filter((q) => q.enabled && q.autoResolve);

  function autoPreview(q: QuestionT) {
    const val = resolveAutoAnswer(
      q as QuestionLite,
      partyLites,
      seats,
      election.thresholdSeats,
      election.blocs,
    );
    if (val === null) return "—";
    if (typeof val === "boolean") return val ? "כן" : "לא";
    if (q.autoResolve === "largestParty")
      return parties.find((p) => p.key === val)?.nameHe ?? String(val);
    if (q.autoResolve === "blocWinner")
      return election.blocs.find((b) => b.key === val)?.labelHe ?? String(val);
    return String(val);
  }

  async function save(publish: boolean) {
    if (publish && !valid) {
      setMsg({ kind: "err", text: `סך המנדטים חייב להיות ${election.totalSeats}` });
      return;
    }
    setBusy(publish ? "publish" : "draft");
    setMsg(null);
    const res = await saveResultsAction(code, { seats, answers, enteredBy, publish });
    setBusy(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error ?? "שגיאה" });
      return;
    }
    setMsg({ kind: "ok", text: publish ? "התוצאות פורסמו והטבלה מחושבת" : "טיוטה נשמרה" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">מנדטים רשמיים</h2>
          <span
            className={`num rounded-lg px-3 py-1 text-sm font-black ${
              valid ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
            }`}
          >
            {total} / {election.totalSeats}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {parties.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <span className="h-8 w-1.5 rounded-full" style={{ background: p.color }} />
              <span className="flex-1 truncate text-sm font-bold">{p.nameHe}</span>
              <input
                className="field num w-16 !px-1 text-center font-black"
                type="number"
                min={0}
                value={seats[p.key] === 0 ? "" : seats[p.key]}
                placeholder="0"
                onChange={(e) =>
                  setSeats((s) => ({
                    ...s,
                    [p.key]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </div>

      {autoQuestions.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-bold text-muted">תשובות אוטומטיות (מחושבות מהמנדטים)</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {autoQuestions.map((q) => (
              <li key={q.qid} className="flex justify-between">
                <span className="text-muted">{q.textHe}</span>
                <span className="font-bold">{autoPreview(q)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {manualQuestions.length > 0 && (
        <div className="card space-y-3 p-4">
          <h3 className="text-sm font-bold text-muted">תשובות ידניות</h3>
          {manualQuestions.map((q) => (
            <div key={q.qid}>
              <label className="label">{q.textHe}</label>
              <div className="mt-1">
                {q.type === "boolean" ? (
                  <div className="flex gap-2">
                    {[
                      { v: true, l: "כן" },
                      { v: false, l: "לא" },
                    ].map((o) => (
                      <button
                        key={o.l}
                        type="button"
                        className={`btn ${answers[q.qid] === o.v ? "btn-primary" : "btn-outline"}`}
                        onClick={() => setAnswers((a) => ({ ...a, [q.qid]: o.v }))}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                ) : q.type === "party" ? (
                  <select
                    className="field"
                    value={String(answers[q.qid] ?? "")}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.qid]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {parties.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.nameHe}
                      </option>
                    ))}
                  </select>
                ) : q.type === "choice" ? (
                  <select
                    className="field"
                    value={String(answers[q.qid] ?? "")}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.qid]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {q.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="field num w-32"
                    type="number"
                    value={answers[q.qid] === undefined ? "" : Number(answers[q.qid])}
                    onChange={(e) =>
                      setAnswers((a) => ({ ...a, [q.qid]: Number(e.target.value) }))
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-3 p-4">
        <label className="label">הוזן על ידי</label>
        <input
          className="field"
          value={enteredBy}
          onChange={(e) => setEnteredBy(e.target.value)}
        />
        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              msg.kind === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
            }`}
          >
            {msg.text}
          </p>
        )}
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            disabled={busy !== null}
            onClick={() => save(false)}
          >
            {busy === "draft" ? "שומר…" : "שמירת טיוטה"}
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid || busy !== null}
            onClick={() => save(true)}
          >
            {busy === "publish" ? "מפרסם…" : "פרסום התוצאות וחישוב הטבלה"}
          </button>
        </div>
        {group.resultsPublishedAt && (
          <p className="text-xs text-good">
            התוצאות פורסמו · {formatDateTime(group.resultsPublishedAt)}
          </p>
        )}
      </div>
    </div>
  );
}
