"use client";

import { useState } from "react";

export default function InviteBox({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${code}`
      : `/join?code=${code}`;

  async function copy(kind: "code" | "link", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-brand-500 bg-brand-50 p-4">
      <div className="text-sm font-bold text-brand-700">הזמינו את החברים</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="num rounded-lg bg-white px-3 py-1.5 text-lg font-black tracking-[0.2em]">
          {code}
        </span>
        <button
          className="btn btn-ghost px-3 py-1.5 text-sm"
          onClick={() => copy("code", code)}
          type="button"
        >
          {copied === "code" ? "הועתק ✓" : "העתקת קוד"}
        </button>
        <button
          className="btn btn-ghost px-3 py-1.5 text-sm"
          onClick={() => copy("link", link)}
          type="button"
        >
          {copied === "link" ? "הועתק ✓" : "העתקת קישור הזמנה"}
        </button>
      </div>
      <div className="mt-2 truncate text-xs text-muted" dir="ltr">
        {link}
      </div>
    </div>
  );
}
