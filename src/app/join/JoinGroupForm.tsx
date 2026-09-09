"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroupAction } from "@/app/actions";

export default function JoinGroupForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
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
      pin,
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
        <label className="label">השם שלך</label>
        <input
          className="field mt-1"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="איך שיוצג בטבלה"
          required
        />
      </div>
      <div>
        <label className="label">קוד אישי</label>
        <input
          className="field mt-1"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="4 ספרות או מילה שתזכרו"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-muted">
          תצטרכו את השם והקוד האישי כדי לחזור לקבוצה מכל מכשיר או דפדפן. אם אתם חוזרים —
          הזינו את אותו שם ואותו קוד.
        </p>
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
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm font-bold text-bad">{error}</p>
      )}

      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "רגע…" : "כניסה לקבוצה"}
      </button>
    </form>
  );
}
