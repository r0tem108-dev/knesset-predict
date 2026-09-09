"use client";

import { relativeTime } from "@/lib/clientTime";
import type { ActivityItemT } from "@/lib/types";

function line(it: ActivityItemT): string {
  if (it.kind === "first") return `${it.displayName} שלח/ה תחזית ראשונה`;
  if (it.kind === "multi") return `${it.displayName} עדכן/ה את התחזית ${it.count} פעמים היום`;
  return `${it.displayName} עדכן/ה את התחזית`;
}

export default function ActivityFeed({ items }: { items: ActivityItemT[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">עדיין שקט כאן. שלחו תחזית כדי להתחיל 🙂</p>;
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span>
            <span className="me-1">{it.kind === "first" ? "🎬" : "✏️"}</span>
            {line(it)}
          </span>
          <span className="shrink-0 text-xs text-muted">{relativeTime(it.at)}</span>
        </li>
      ))}
    </ul>
  );
}
