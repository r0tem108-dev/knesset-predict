"use client";

import Link from "next/link";
import { relativeTime } from "@/lib/clientTime";
import type { ActivityItemT } from "@/lib/types";

function tail(it: ActivityItemT): string {
  if (it.kind === "first") return "שלח/ה תחזית ראשונה";
  if (it.kind === "multi") return `עדכן/ה את התחזית ${it.count} פעמים היום`;
  return "עדכן/ה את התחזית";
}

export default function ActivityFeed({
  code,
  items,
  canView,
}: {
  code: string;
  items: ActivityItemT[];
  canView: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">עדיין שקט כאן. שלחו תחזית כדי להתחיל 🙂</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span>
            <span className="me-1">{it.kind === "first" ? "🎬" : "✏️"}</span>
            {canView ? (
              <Link href={`/g/${code}/p/${it.participantId}`} className="font-bold text-brand-700 hover:underline">
                {it.displayName}
              </Link>
            ) : (
              <b>{it.displayName}</b>
            )}{" "}
            {tail(it)}
          </span>
          <span className="shrink-0 text-xs text-muted">{relativeTime(it.at)}</span>
        </li>
      ))}
    </ul>
  );
}
