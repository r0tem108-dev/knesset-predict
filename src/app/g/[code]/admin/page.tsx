import Link from "next/link";
import { notFound } from "next/navigation";
import AdminPanel from "./AdminPanel";
import {
  getDashboard,
  getOfficialResultDraft,
  getDefaultElection,
  getGroupMembers,
  AppError,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  let data;
  try {
    data = await getDashboard(code);
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }

  const { group, election, parties, viewer, participants } = data;

  if (!viewer.isAdmin) {
    return (
      <div className="card p-6">
        <p className="font-bold text-bad">גישת ניהול נדרשת.</p>
        <p className="mt-1 text-sm text-muted">
          רק מי שיצר את הקבוצה (מאותו דפדפן) יכול לנהל אותה.
        </p>
        <Link href={`/g/${group.code}`} className="btn btn-outline mt-3">
          חזרה לקבוצה
        </Link>
      </div>
    );
  }

  const draft = await getOfficialResultDraft(code);
  const { allParties } = await getDefaultElection();
  const members = await getGroupMembers(code);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${group.code}`} className="text-sm text-brand-700">
          ← {group.name}
        </Link>
        <h1 className="text-2xl">ניהול הקבוצה</h1>
      </div>
      <AdminPanel
        code={group.code}
        group={group}
        election={election}
        parties={parties}
        allParties={allParties}
        participantCount={participants.length}
        submittedCount={participants.filter((p) => p.hasSubmitted).length}
        resultDraft={draft}
        members={members}
      />
    </div>
  );
}
