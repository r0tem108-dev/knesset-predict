"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRenameAction } from "@/app/actions";
import type { ParticipantT } from "@/lib/types";

type Row = ParticipantT & { hasSubmitted: boolean };

export default function ParticipantList({
  code,
  participants,
  canRename,
}: {
  code: string;
  participants: Row[];
  canRename: boolean;
}) {
  return (
    <ul className="mt-3 divide-y divide-line">
      {participants.map((p) => (
        <ParticipantRow key={p.id} code={code} p={p} canRename={canRename} />
      ))}
    </ul>
  );
}

function ParticipantRow({ code, p, canRename }: { code: string; p: Row; canRename: boolean }) {
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
      )}
      {p.hasSubmitted ? (
        <span className="chip bg-good/10 text-good">✓ שלח/ה</span>
      ) : (
        <span className="chip bg-line text-muted">ממתין</span>
      )}
    </li>
  );
}
