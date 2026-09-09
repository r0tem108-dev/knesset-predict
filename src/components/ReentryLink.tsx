"use client";

import { useState } from "react";

export default function ReentryLink({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost mt-3 !py-1 text-sm"
        onClick={() => setOpen(true)}
      >
        🔑 קישור אישי לחזרה לקבוצה
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-dashed border-brand-500 bg-brand-50 p-3">
      <div className="text-sm font-bold text-brand-700">🔑 הקישור האישי שלך</div>
      <p className="mt-1 text-xs text-muted">
        שִׁמרו אותו — שלחו לעצמכם בוואטסאפ. הוא מחזיר אתכם לקבוצה עם התחזית שלכם, מכל
        דפדפן ומכל מכשיר. אל תעבירו אותו לאחרים.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs" dir="ltr">
          {url}
        </code>
        <button className="btn btn-ghost !py-1 text-sm" onClick={copy} type="button">
          {copied ? "הועתק ✓" : "העתקה"}
        </button>
      </div>
    </div>
  );
}
