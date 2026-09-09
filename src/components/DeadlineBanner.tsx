"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Countdown to the prediction deadline, with escalating urgency:
 *  > 24h  — quiet line
 *  1–24h  — amber card
 *  < 1h   — red, "final hour"
 *  passed — locked
 */
export default function DeadlineBanner({
  code,
  deadline,
  locked,
  canEdit,
}: {
  code: string;
  deadline: string;
  locked: boolean;
  canEdit: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(deadline).getTime();
  const ms = now === null ? 0 : target - now;
  const passed = locked || ms <= 0;

  const editLink = canEdit ? (
    <Link href={`/g/${code}/predict`} className="btn btn-primary !py-1.5">
      עדכון התחזית
    </Link>
  ) : null;

  if (passed) {
    return (
      <div className="card border-bad/40 bg-bad/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-black text-bad">🔒 התחזיות ננעלו</div>
            <div className="text-sm text-muted">
              כל התחזיות המוצגות סופיות. אי אפשר יותר לשנות.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const totalH = ms / 3_600_000;

  // > 24h — quiet
  if (totalH >= 24 || now === null) {
    return (
      <div className="card p-4 text-sm">
        <span className="font-bold text-good">התחזיות פתוחות</span> — כל אחד יכול לשנות את
        הבחירות שלו עד <b>{new Date(deadline).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" })}</b>
        {now !== null && (
          <span className="text-muted">
            {" "}
            (עוד {d} ימים {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")})
          </span>
        )}
      </div>
    );
  }

  const finalHour = totalH < 1;

  return (
    <div
      className={`card p-4 ${
        finalHour ? "border-bad bg-bad/10" : "border-accent-500 bg-accent-400/10"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className={`text-lg font-black ${finalHour ? "text-bad" : "text-accent-500"}`}>
            {finalHour
              ? "⏰ השעה האחרונה — התחזיות ננעלות בקרוב"
              : `⏳ נותרו ${h} שעות ו-${m} דקות לשינוי התחזית`}
          </div>
          <div className="num mt-1 text-2xl font-black">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
          </div>
        </div>
        {editLink}
      </div>
    </div>
  );
}
