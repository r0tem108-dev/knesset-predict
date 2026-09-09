/** Helpers for <input type="datetime-local">, which speaks local wall-clock time. */

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Hebrew relative time, e.g. "לפני 8 דקות", "לפני שעתיים", "אתמול". */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const s = Math.round((now - t) / 1000);
  if (s < 45) return "עכשיו";
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "לפני דקה" : m === 2 ? "לפני שתי דקות" : `לפני ${m} דקות`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "לפני שעה" : h === 2 ? "לפני שעתיים" : `לפני ${h} שעות`;
  const d = Math.round(h / 24);
  if (d === 1) return "אתמול";
  if (d < 7) return `לפני ${d} ימים`;
  const w = Math.round(d / 7);
  if (w < 5) return w === 1 ? "לפני שבוע" : `לפני ${w} שבועות`;
  return formatDateTime(iso);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jerusalem",
  });
}
