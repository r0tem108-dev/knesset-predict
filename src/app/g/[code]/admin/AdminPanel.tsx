"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupT, ElectionT, PartyT, QuestionT } from "@/lib/types";
import {
  lockGroupAction,
  updateGroupSettingsAction,
  updateQuestionsAction,
  updateWildQuestionAction,
  updateScoringAction,
  updatePartiesAction,
  saveResultsAction,
  adminResetPinAction,
} from "@/app/actions";
import { resolveAutoAnswer, type QuestionLite, type PartyLite } from "@/lib/scoring";
import { formatDateTime, toLocalInputValue, fromLocalInputValue } from "@/lib/clientTime";
import type { OfficialResultDraft } from "@/lib/data";

type Tab = "status" | "parties" | "questions" | "scoring" | "results";

const STATUS_HE: Record<GroupT["status"], string> = {
  open: "התחזיות פתוחות",
  locked: "התחזיות נעולות",
  provisional: "ליל הבחירות · תוצאות ביניים",
  final: "תוצאות סופיות",
};

interface Member {
  participantId: string;
  displayName: string;
  hasPin: boolean;
}

export default function AdminPanel({
  code,
  group,
  election,
  parties,
  allParties,
  participantCount,
  submittedCount,
  resultDraft,
  members,
}: {
  code: string;
  group: GroupT;
  election: ElectionT;
  parties: PartyT[];
  allParties: PartyT[];
  participantCount: number;
  submittedCount: number;
  resultDraft: OfficialResultDraft;
  members: Member[];
}) {
  const [tab, setTab] = useState<Tab>("status");
  const tabs: [Tab, string][] = [
    ["status", "סטטוס ונעילה"],
    ["parties", "רשימות (מפלגות)"],
    ["questions", "שאלות בונוס"],
    ["scoring", "שיטת ניקוד"],
    ["results", "תוצאות / ליל הבחירות"],
  ];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
        {(["open", "locked", "provisional", "final"] as GroupT["status"][]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted">→</span>}
            <span
              className={`chip ${
                group.status === s ? "bg-brand-600 text-white" : "bg-bg text-muted"
              }`}
            >
              {STATUS_HE[s]}
            </span>
          </span>
        ))}
      </div>

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
          members={members}
        />
      )}
      {tab === "parties" && (
        <PartiesTab code={code} group={group} allParties={allParties} blocs={election.blocs} />
      )}
      {tab === "questions" && <QuestionsTab code={code} group={group} parties={parties} />}
      {tab === "scoring" && <ScoringTab code={code} group={group} />}
      {tab === "results" && (
        <ResultsTab code={code} group={group} election={election} parties={parties} draft={resultDraft} />
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
  members,
}: {
  code: string;
  group: GroupT;
  participantCount: number;
  submittedCount: number;
  members: Member[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [deadline, setDeadline] = useState(toLocalInputValue(group.predictionDeadline));
  const [reveal, setReveal] = useState(group.settings.showPredictions);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggleLock(lock: boolean) {
    setBusy(true);
    await lockGroupAction(code, lock);
    setBusy(false);
    router.refresh();
  }
  async function saveSettings() {
    setBusy(true);
    setMsg(null);
    const res = await updateGroupSettingsAction(code, {
      predictionDeadline: deadline ? fromLocalInputValue(deadline) : undefined,
      showPredictions: reveal,
    });
    setBusy(false);
    setMsg(res.ok ? "נשמר ✓" : res.error ?? "שגיאה");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="card space-y-3 p-5 text-sm">
        <Row k="קוד קבוצה" v={group.code} />
        <Row k="מצב נוכחי" v={STATUS_HE[group.status]} />
        <Row k="משתתפים" v={`${submittedCount} / ${participantCount} שלחו תחזית`} />
        <Row k="נעילה ידנית" v={group.lockedAt ? formatDateTime(group.lockedAt) : "—"} />

        <div>
          <label className="label">מועד אחרון לשליחת תחזיות</label>
          <input
            className="field num mt-1"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={group.locked}
          />
          {group.locked && (
            <p className="mt-1 text-xs text-muted">התחזיות כבר נעולות — לא ניתן לשנות מועד.</p>
          )}
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={reveal}
            onChange={(e) => setReveal(e.target.checked)}
          />
          חברי הקבוצה רואים תחזיות, השוואות ותחזית קבוצתית (לפני ואחרי הנעילה)
        </label>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button className="btn btn-primary" disabled={busy} onClick={saveSettings}>
            שמירת הגדרות
          </button>
          {group.lockedAt ? (
            <button className="btn btn-outline" disabled={busy} onClick={() => toggleLock(false)}>
              ביטול נעילה ידנית
            </button>
          ) : (
            <button className="btn btn-outline" disabled={busy} onClick={() => toggleLock(true)}>
              נעילת התחזיות עכשיו
            </button>
          )}
          {msg && <span className="text-sm font-bold text-muted">{msg}</span>}
        </div>
        <p className="text-xs text-muted">
          גם ללא נעילה ידנית, התחזיות ננעלות אוטומטית במועד שנקבע.
        </p>
      </div>

      <MemberCodesBox code={code} members={members} />
    </div>
  );
}

function MemberCodesBox({ code, members }: { code: string; members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reset(id: string, name: string) {
    const pin = window.prompt(`קוד אישי חדש עבור ${name} (לפחות 3 תווים):`);
    if (!pin) return;
    setBusyId(id);
    setMsg(null);
    const res = await adminResetPinAction(code, id, pin.trim());
    setBusyId(null);
    if (!res.ok) {
      setMsg(res.error ?? "שגיאה");
      return;
    }
    setMsg(`הקוד של ${name} עודכן. מסרו לו/ה: "${pin.trim()}"`);
    router.refresh();
  }

  return (
    <div className="card p-5 text-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between font-bold"
        onClick={() => setOpen((o) => !o)}
      >
        <span>🔑 איפוס קוד אישי למשתתפ/ת ({members.length})</span>
        <span className="text-muted">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <>
          <p className="mt-2 text-xs text-muted">
            אם מישהו שכח את הקוד האישי שלו — אפסו אותו כאן, ומִסרו לו/ה את הקוד החדש. הוא/היא
            ייכנס/תיכנס עם השם שלו/ה + הקוד החדש.
          </p>
          {msg && (
            <p className="mt-2 rounded-lg bg-good/10 px-3 py-2 text-xs font-bold text-good">{msg}</p>
          )}
          <ul className="mt-3 space-y-2">
            {members.map((m) => (
              <li key={m.participantId} className="flex items-center justify-between gap-2">
                <span className="font-bold">
                  {m.displayName}
                  {!m.hasPin && <span className="ms-1 text-xs font-normal text-muted">(ללא קוד)</span>}
                </span>
                <button
                  className="btn btn-ghost !py-1 text-xs"
                  onClick={() => reset(m.participantId, m.displayName)}
                  type="button"
                  disabled={busyId === m.participantId}
                >
                  איפוס קוד
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
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

/* -------------------------------------------------------------- parties --- */

function PartiesTab({
  code,
  group,
  allParties,
  blocs,
}: {
  code: string;
  group: GroupT;
  allParties: PartyT[];
  blocs: { key: string; labelHe: string }[];
}) {
  const router = useRouter();
  const [list, setList] = useState<PartyT[]>(allParties);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const patch = (i: number, p: Partial<PartyT>) =>
    setList((l) => l.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  const add = () =>
    setList((l) => [
      ...l,
      {
        id: "",
        key: `list_${Date.now()}`,
        name: "",
        nameHe: "",
        commonNameHe: "",
        ballotLetters: "",
        leaderHe: "",
        color: "#64748b",
        logoUrl: "",
        bloc: "",
        status: "active",
        order: l.length + 1,
      },
    ]);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updatePartiesAction(
      code,
      list
        .filter((p) => p.nameHe.trim())
        .map((p, i) => ({
          key: p.key,
          nameHe: p.nameHe,
          name: p.name || p.nameHe,
          commonNameHe: p.commonNameHe,
          ballotLetters: p.ballotLetters,
          leaderHe: p.leaderHe,
          color: p.color,
          bloc: p.bloc,
          status: p.status,
          order: i + 1,
        })),
    );
    setBusy(false);
    setMsg(res.ok ? "נשמר ✓" : res.error ?? "שגיאה");
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        רשימת המפלגות שייכת לבחירות ({group.status === "open" ? "ניתן לעריכה" : "נעול אחרי הנעילה"}
        ). עדכנו שמות, אותיות פתק, ראשי רשימה, צבעים וסטטוס. אותיות הפתק מתפרסמות רק אחרי הגשת
        הרשימות — עדכנו כשיתפרסמו.
      </p>
      {list.map((p, i) => (
        <div key={p.key} className="card grid gap-2 p-3 sm:grid-cols-[1fr_1fr] sm:items-center">
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-8 w-8 rounded"
              value={p.color}
              onChange={(e) => patch(i, { color: e.target.value })}
            />
            <input
              className="field flex-1"
              placeholder="שם הרשימה"
              value={p.nameHe}
              onChange={(e) => patch(i, { nameHe: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              className="field !w-20"
              placeholder="אותיות"
              value={p.ballotLetters}
              onChange={(e) => patch(i, { ballotLetters: e.target.value })}
            />
            <input
              className="field flex-1"
              placeholder="ראש הרשימה"
              value={p.leaderHe}
              onChange={(e) => patch(i, { leaderHe: e.target.value })}
            />
            <select
              className="field !w-auto"
              value={p.bloc}
              onChange={(e) => patch(i, { bloc: e.target.value })}
            >
              <option value="">ללא גוש</option>
              {blocs.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.labelHe}
                </option>
              ))}
            </select>
            <select
              className="field !w-auto"
              value={p.status}
              onChange={(e) => patch(i, { status: e.target.value as PartyT["status"] })}
            >
              <option value="active">פעילה</option>
              <option value="withdrawn">פרשה</option>
              <option value="disqualified">נפסלה</option>
            </select>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button className="btn btn-outline" onClick={add} type="button" disabled={group.locked}>
          + הוספת רשימה
        </button>
        <button className="btn btn-primary" onClick={save} disabled={busy || group.locked}>
          {busy ? "שומר…" : "שמירת רשימות"}
        </button>
        {msg && <span className="text-sm font-bold text-muted">{msg}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ questions --- */

const AUTO_LABELS: Record<string, string> = {
  "": "ידני (מוזן בתוצאות)",
  largestParty: "אוטומטי · מפלגה גדולה",
  blocWinner: "אוטומטי · גוש מנצח",
  partyCount: "אוטומטי · מספר רשימות בכנסת",
  anyPartyBelowThreshold: "אוטומטי · רשימה שלא עברה",
};

function QuestionsTab({ code, group, parties }: { code: string; group: GroupT; parties: PartyT[] }) {
  const router = useRouter();
  const [list, setList] = useState<QuestionT[]>(group.questions);
  const [wild, setWild] = useState(group.wildQuestion);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const patch = (i: number, p: Partial<QuestionT>) =>
    setList((l) => l.map((q, idx) => (idx === i ? { ...q, ...p } : q)));
  const remove = (i: number) => setList((l) => l.filter((_, idx) => idx !== i));
  const add = () =>
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
        kind: "",
        enabled: true,
        order: l.length + 1,
      },
    ]);

  async function save() {
    setBusy(true);
    setMsg(null);
    const r1 = await updateQuestionsAction(code, list.map((q, i) => ({ ...q, order: i + 1 })));
    const r2 = await updateWildQuestionAction(code, {
      enabled: wild.enabled,
      textHe: wild.textHe,
      options: wild.options,
      points: wild.points,
    });
    setBusy(false);
    const ok = r1.ok && r2.ok;
    setMsg(ok ? "נשמר ✓" : r1.error ?? r2.error ?? "שגיאה");
    if (ok) router.refresh();
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
            {q.kind === "turnout" && (
              <span className="chip bg-accent-400/20 text-accent-500">שובר שוויון</span>
            )}
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

      {/* wild prediction */}
      <div className="card space-y-2 p-4">
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={wild.enabled}
            onChange={(e) => setWild({ ...wild, enabled: e.target.checked })}
          />
          🎲 הניחוש הפראי (שאלה חופשית שאתם מנסחים)
        </label>
        {wild.enabled && (
          <>
            <input
              className="field"
              placeholder="נוסח השאלה"
              value={wild.textHe}
              onChange={(e) => setWild({ ...wild, textHe: e.target.value })}
            />
            <label className="label">אפשרויות (ריק = תשובה חופשית; שורה לכל אחת: ערך | תווית)</label>
            <textarea
              className="field font-mono text-xs"
              rows={3}
              value={wild.options.map((o) => `${o.value} | ${o.label}`).join("\n")}
              onChange={(e) =>
                setWild({
                  ...wild,
                  options: e.target.value
                    .split("\n")
                    .map((l) => l.split("|").map((s) => s.trim()))
                    .filter((p) => p[0])
                    .map((p) => ({ value: p[0], label: p[1] ?? p[0] })),
                })
              }
            />
            <label className="flex items-center gap-1 text-sm">
              ניקוד:
              <input
                className="field num !w-20 !py-1"
                type="number"
                value={wild.points}
                onChange={(e) => setWild({ ...wild, points: Number(e.target.value) })}
              />
            </label>
          </>
        )}
      </div>

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
        שאלות מסוג &quot;מפלגה&quot; לוקחות את הרשימה מ-{parties.length} הרשימות הפעילות.
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

  const num = (k: keyof typeof s) => (
    <input
      className="field num !w-20 !py-1"
      type="number"
      value={s[k] as number}
      onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })}
    />
  );

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateScoringAction(code, s);
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
          onChange={(e) => setS({ ...s, seatMethod: e.target.value as "tiered" | "linear" })}
        >
          <option value="tiered">מדורג (לפי גודל טעות)</option>
          <option value="linear">לינארי</option>
        </select>
      </label>

      {s.seatMethod === "tiered" ? (
        <div>
          <div className="label mb-1">מדרגות (טעות עד → נקודות) — חל רק על רשימות שנכנסו לכנסת</div>
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
            onClick={() => setS({ ...s, tiers: [...s.tiers, { maxError: s.tiers.length, points: 0 }] })}
          >
            + מדרגה
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <label className="flex items-center gap-1">בסיס: {num("linearBase")}</label>
          <label className="flex items-center gap-1">הפחתה לכל טעות: {num("linearSlope")}</label>
        </div>
      )}

      <label className="flex items-center gap-2">בונוס לכל ניחוש &quot;בול&quot;: {num("exactBonus")}</label>
      <label className="flex items-center gap-2">
        בונוס לניחוש נכון שרשימה <b>כן</b> עוברת את החסימה: {num("thresholdEnterPoints")}
      </label>
      <label className="flex items-center gap-2">
        בונוס לניחוש נכון שרשימה <b>לא</b> עוברת את החסימה: {num("thresholdFailPoints")}
      </label>
      <label className="flex items-center gap-2">
        קנס לכל מנדט שהוקצה לרשימה שלא עברה: {num("failedListSeatPenaltyPerSeat")}
      </label>
      <label className="flex items-center gap-2">
        בונוס ניחוש הביטחון (⭐) בפגיעה מדויקת: {num("confidencePickBonus")}
      </label>

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? "שומר…" : "שמירת הגדרות ניקוד"}
        </button>
        {msg && <span className="font-bold text-muted">{msg}</span>}
      </div>
      <p className="text-xs text-muted">
        שינוי הניקוד אחרי פרסום תוצאות מעדכן את הטבלה אוטומטית בטעינה הבאה.
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
  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>(() => ({
    ...draft.answers,
  }));
  const [wildAnswer, setWildAnswer] = useState<string>(
    draft.wildAnswer == null ? "" : String(draft.wildAnswer),
  );
  const [turnout, setTurnout] = useState<string>(
    draft.turnoutPercent == null ? "" : String(draft.turnoutPercent),
  );
  const [enteredBy, setEnteredBy] = useState(draft.enteredBy || group.creatorName);
  const [busy, setBusy] = useState<"save" | "provisional" | "final" | null>(null);
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
  const manualQuestions = group.questions.filter((q) => q.enabled && !q.autoResolve && q.kind !== "turnout");
  const autoQuestions = group.questions.filter((q) => q.enabled && q.autoResolve);

  function autoPreview(q: QuestionT) {
    const val = resolveAutoAnswer(q as QuestionLite, partyLites, seats, election.thresholdSeats, election.blocs);
    if (val === null) return "—";
    if (typeof val === "boolean") return val ? "כן" : "לא";
    if (q.autoResolve === "largestParty") return parties.find((p) => p.key === val)?.nameHe ?? String(val);
    if (q.autoResolve === "blocWinner") return election.blocs.find((b) => b.key === val)?.labelHe ?? String(val);
    return String(val);
  }

  async function run(action: "save" | "provisional" | "final") {
    if (action === "final" && !valid) {
      setMsg({ kind: "err", text: `תוצאות סופיות חייבות להסתכם ל-${election.totalSeats}` });
      return;
    }
    setBusy(action);
    setMsg(null);
    const res = await saveResultsAction(code, {
      seats,
      answers,
      wildAnswer: wildAnswer || null,
      turnoutPercent: turnout === "" ? null : Number(turnout),
      enteredBy,
      action,
    });
    setBusy(null);
    if (!res.ok) {
      setMsg({ kind: "err", text: res.error ?? "שגיאה" });
      return;
    }
    setMsg({
      kind: "ok",
      text:
        action === "final"
          ? "התוצאות סומנו כסופיות — טבלה ופרסים חושבו"
          : action === "provisional"
            ? "תוצאות ביניים פורסמו — הטבלה מתעדכנת"
            : "טיוטה נשמרה",
    });
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
                inputMode="numeric"
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

      <div className="card p-4">
        <label className="label">אחוז הצבעה ארצי (%) — שובר שוויון</label>
        <input
          className="field num mt-1 w-32"
          type="number"
          step="0.1"
          value={turnout}
          onChange={(e) => setTurnout(e.target.value)}
          placeholder="לדוגמה 70.6"
        />
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

      {(manualQuestions.length > 0 || group.wildQuestion.enabled) && (
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
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.qid]: Number(e.target.value) }))}
                  />
                )}
              </div>
            </div>
          ))}
          {group.wildQuestion.enabled && (
            <div>
              <label className="label">🎲 {group.wildQuestion.textHe}</label>
              {group.wildQuestion.options.length > 0 ? (
                <select
                  className="field mt-1"
                  value={wildAnswer}
                  onChange={(e) => setWildAnswer(e.target.value)}
                >
                  <option value="">—</option>
                  {group.wildQuestion.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="field mt-1"
                  value={wildAnswer}
                  onChange={(e) => setWildAnswer(e.target.value)}
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="card space-y-3 p-4">
        <label className="label">הוזן על ידי</label>
        <input className="field" value={enteredBy} onChange={(e) => setEnteredBy(e.target.value)} />
        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm font-bold ${
              msg.kind === "ok" ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
            }`}
          >
            {msg.text}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-outline" disabled={busy !== null} onClick={() => run("save")}>
            {busy === "save" ? "שומר…" : "שמירת טיוטה"}
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy !== null}
            onClick={() => run("provisional")}
          >
            {busy === "provisional" ? "מפרסם…" : "🌙 פרסום תוצאות ביניים (ליל הבחירות)"}
          </button>
          <button
            className="btn btn-primary"
            disabled={!valid || busy !== null}
            onClick={() => run("final")}
          >
            {busy === "final" ? "מסמן…" : "✔️ סימון כתוצאות סופיות"}
          </button>
        </div>
        <p className="text-xs text-muted">
          תוצאות ביניים ניתן לעדכן שוב ושוב — הטבלה מציגה &quot;אם אלו התוצאות הסופיות…&quot;. סימון
          כסופיות נועל את הפרסים והטבלה הסופית.
        </p>
        {group.resultsPublishedAt && (
          <p className="text-xs text-good">
            פורסם לראשונה · {formatDateTime(group.resultsPublishedAt)}
            {group.resultsFinalizedAt && ` · סופי: ${formatDateTime(group.resultsFinalizedAt)}`}
          </p>
        )}
      </div>
    </div>
  );
}
