"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroupAction } from "@/app/actions";

export default function JoinGroupForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await joinGroupAction({
      code: code.trim().toUpperCase(),
      displayName,
      password: password || undefined,
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? "שגיאה");
      setBusy(false);
      return;
    }
    router.push(`/g/${res.data.code}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">קוד קבוצה</label>
        <input
          className="field mt-1 text-center text-lg font-black tracking-[0.3em]"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          maxLength={6}
          required
        />
      </div>
      <div>
        <label className="label">השם שיוצג בטבלה</label>
        <input
          className="field mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label">סיסמת קבוצה (אם נדרשת)</label>
        <input
          className="field mt-1"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-bad/10 px-3 py-2 text-sm text-bad">
          <p className="font-bold">{error}</p>
          {error.includes("תפוס") && (
            <p className="mt-1 font-normal">
              אם זה השם שלך מפעם קודמת — אל תיצור/י חדש. בקש/י מהמנהל של הקבוצה לשלוח לך את
              &quot;הקישור האישי&quot; שלך (הוא מופיע אצלו במסך הניהול).
            </p>
          )}
        </div>
      )}

      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "מצטרף…" : "הצטרפות"}
      </button>
    </form>
  );
}
