import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ניחוש הבחירות · ליגת התחזיות של החברים",
  description:
    "נחשו את תוצאות הבחירות לכנסת והתחרו מול החברים. חלוקת מנדטים, שאלות בונוס וטבלת מובילים.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
          <header className="flex items-center justify-between py-5">
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
                🗳️
              </span>
              <span>ניחוש הבחירות</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <Link href="/create" className="btn btn-ghost">
                יצירת קבוצה
              </Link>
              <Link href="/join" className="btn btn-outline">
                הצטרפות
              </Link>
            </nav>
          </header>

          <main className="flex-1 pb-16">{children}</main>

          <footer className="border-t border-line py-6 text-center text-xs text-muted">
            משחק חברתי לניחוש תוצאות הבחירות · לא כרוך בכסף אמיתי
          </footer>
        </div>
      </body>
    </html>
  );
}
