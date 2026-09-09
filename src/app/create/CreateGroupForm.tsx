"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction } from "@/app/actions";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/clientTime";

export default function CreateGroupForm({
  electionName,
  defaultDeadlineISO,
}: {
  electionName: string;
  defaultDeadlineISO: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [deadline, setDeadline] = useState(toLocalInputValue(defaultDeadlineISO));
  const [revealAfter, setRevealAfter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createGroupAction({
      name,
      creatorName,
      pin,
      password: password || undefined,
      predictionDeadline: deadline ? fromLocalInputValue(deadline) : undefined,
      showPredictions: revealAfter,
    });
    if (!res.ok || !res.data) {
      setError(res.error ?? "שגיאה");
      setBusy(false);
      return;
    }
    router.push(`/g/${res.data.code}?created=1`);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">שם הקבוצה</label>
        <input
          className="field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="למשל: ניחושים במשפחה"
          required
        />
      </div>

      <div>
        <label className="label">השם שלך</label>
        <input
          className="field mt-1"
          value={creatorName}
          onChange={(e) => setCreatorName(e.target.value)}
          placeholder="איך יקראו לך בטבלה"
          required
        />
      </div>

      <div>
        <label className="label">קוד אישי שלך</label>
        <input
          className="field mt-1"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="4 ספרות או מילה שתזכרו"
          autoComplete="off"
          required
        />
        <p className="mt-1 text-xs text-muted">
          עם השם והקוד הזה תוכל לחזור לניהול הקבוצה מכל מכשיר. אל תשכח אותו.
        </p>
      </div>

      <div>
        <label className="label">סיסמה לקבוצה (אופציונלי)</label>
        <input
          className="field mt-1"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ריק = כל מי שיש לו את הקוד יכול להצטרף"
        />
      </div>

      <div>
        <label className="label">מועד אחרון לשליחת תחזיות</label>
        <input
          className="field mt-1"
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-muted">
          אחרי מועד זה התחזיות ננעלות אוטומטית. ({electionName})
        </p>
      </div>

      <fieldset className="rounded-xl border border-line p-3">
        <legend className="label px-1">חשיפת תחזיות</legend>
        <label className="flex items-center gap-2 py-1 text-sm">
          <input
            type="checkbox"
            checked={revealAfter}
            onChange={(e) => setRevealAfter(e.target.checked)}
          />
          חברי הקבוצה רואים תחזיות, השוואות ותחזית קבוצתית של כולם
        </label>
        <p className="py-1 text-xs text-muted">
          התחזיות גלויות לחברי הקבוצה לאורך כל הדרך — גם לפני המועד האחרון (כשעדיין
          אפשר לשנות) וגם אחרי הנעילה. אפשר לכבות כאן אם רוצים משחק &quot;עיוור&quot;.
        </p>
      </fieldset>

      {error && (
        <p className="rounded-lg bg-bad/10 px-3 py-2 text-sm font-bold text-bad">{error}</p>
      )}

      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "יוצר…" : "יצירת הקבוצה"}
      </button>
    </form>
  );
}
