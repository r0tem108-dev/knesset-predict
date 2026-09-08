"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const clamp = Math.max(0, ms);
  const s = Math.floor(clamp / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: ms <= 0,
  };
}

export default function Countdown({
  target,
  label = "עד יום הבחירות",
  compact = false,
}: {
  target: string;
  label?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const targetMs = new Date(target).getTime();
  const p = parts(now === null ? 0 : targetMs - now);
  const cells = [
    { v: p.days, l: "ימים" },
    { v: p.hours, l: "שעות" },
    { v: p.minutes, l: "דקות" },
    { v: p.seconds, l: "שניות" },
  ];

  if (compact) {
    return (
      <span className="num font-extrabold">
        {now === null
          ? "—"
          : p.done
            ? "הבחירות כבר כאן"
            : `${p.days} ימים ${String(p.hours).padStart(2, "0")}:${String(p.minutes).padStart(2, "0")}:${String(p.seconds).padStart(2, "0")}`}
      </span>
    );
  }

  return (
    <div>
      <div className="mb-2 text-sm font-bold text-muted">{label}</div>
      {p.done ? (
        <div className="text-2xl font-extrabold text-brand-700">יום הבחירות הגיע 🎉</div>
      ) : (
        <div className="flex gap-2">
          {cells.map((c) => (
            <div
              key={c.l}
              className="min-w-16 flex-1 rounded-xl bg-brand-50 px-2 py-3 text-center"
            >
              <div className="num text-2xl font-extrabold text-brand-700 sm:text-3xl">
                {now === null ? "–" : String(c.v).padStart(2, "0")}
              </div>
              <div className="text-[11px] font-bold text-muted">{c.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
