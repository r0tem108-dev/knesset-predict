"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameAction } from "@/app/actions";

export default function RenameName({
  code,
  currentName,
}: {
  code: string;
  currentName: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === currentName) {
      setEditing(false);
      setName(currentName);
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await renameAction(code, trimmed);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "שגיאה");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-muted">מוצג בטבלה בתור</span>
        <b>{currentName}</b>
        <button
          type="button"
          className="btn btn-ghost !px-2 !py-0.5 text-xs"
          onClick={() => {
            setName(currentName);
            setEditing(true);
          }}
        >
          עריכת שם
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <input
        className="field !w-40 !py-1"
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setName(currentName);
          }
        }}
      />
      <button className="btn btn-primary !px-3 !py-1 text-xs" disabled={busy} onClick={save}>
        {busy ? "שומר…" : "שמירה"}
      </button>
      <button
        className="btn btn-outline !px-3 !py-1 text-xs"
        onClick={() => {
          setEditing(false);
          setName(currentName);
          setErr(null);
        }}
      >
        ביטול
      </button>
      {err && <span className="font-bold text-bad">{err}</span>}
    </span>
  );
}
