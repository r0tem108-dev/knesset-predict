"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRenameAction } from "@/app/actions";
import { relativeTime, formatDateTime } from "@/lib/clientTime";
import type { DashParticipantT } from "@/lib/types";

function changeLabel(n: number): string {
  if (n <= 0) return "שינויים: 0";
  if (n >= 7) return `שינויים: ${n} · חושב על זה מחדש 🤔`;
  if (n >= 4) return `שינויים: ${n} · מפקפק בהכול`;
  return `שינויים: ${n}`;
}

export default function ParticipantList({
  code,
  participants,
  canRename,
  locked,
}: {
  code: string;
  participants: DashParticipantT[];
  canRename: boolean;
  locked: boolean;
}) {
  return (
    <ul className="mt-3 divide-y divide-line">
      {participants.map((p) => (
        <ParticipantRow key={p.id} code={code} p={p} canRename={canRename} locked={locked} />
      ))}
    </ul>
  );
}

function ParticipantRow({
  code,
  p,
  canRename,
  locked,
}: {
  code: string;
  p: DashParticipantT;
  canRename: boolean;
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.displayName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === p.displayName) {
      setEditing(false);
      setName(p.displayName);
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await adminRenameAction(code, p.id, trimmed);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "שגיאה");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const updated =
    p.changeCount === 0 && p.firstSubmittedAt
      ? `${locked ? "ננעל · " : ""}נשלחה ${relativeTime(p.firstSubmittedAt)}`
      : p.lastUpdatedAt
        ? `עודכן ${relativeTime(p.lastUpdatedAt)}`
        : "";

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      {editing ? (
        <span className="flex flex-wrap items-center gap-2">
          <input
            className="field !w-40 !py-1"
            value={name}
            maxLength={40}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <button className="btn btn-primary !px-3 !py-1 text-xs" disabled={busy} onClick={save}>
            שמירה
          </button>
          <button
            className="btn btn-outline !px-3 !py-1 text-xs"
            onClick={() => {
              setEditing(false);
              setName(p.displayName);
              setErr(null);
            }}
          >
            ביטול
          </button>
          {err && <span className="font-bold text-bad">{err}</span>}
        </span>
      ) : (
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-bold">
            {p.displayName}
            {p.isAdmin && <span className="chip bg-brand-100 text-brand-700">מנהל</span>}
            {canRename && (
              <button
                className="btn btn-ghost !px-2 !py-0.5 text-xs font-normal"
                onClick={() => {
                  setName(p.displayName);
                  setEditing(true);
                }}
              >
                עריכת שם
              </button>
            )}
          </span>
          {p.hasSubmitted && (
            <span
              className="block text-xs text-muted"
              title={p.lastUpdatedAt ? formatDateTime(p.lastUpdatedAt) : undefined}
            >
              {updated}
              {p.changeCount > 0 && ` · ${changeLabel(p.changeCount)}`}
            </span>
          )}
        </span>
      )}
      {p.hasSubmitted ? (
        <span className="chip bg-good/10 text-good">✓ שלח/ה</span>
      ) : (
        <span className="chip bg-line text-muted">ממתין</span>
      )}
    </li>
  );
}
