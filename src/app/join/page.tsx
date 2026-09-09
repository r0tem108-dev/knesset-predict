import { redirect } from "next/navigation";
import JoinGroupForm from "./JoinGroupForm";
import { getViewer, AppError } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  // Already a member in this browser? Skip straight to the group.
  if (code) {
    try {
      const viewer = await getViewer(code);
      if (viewer.participant) redirect(`/g/${code.toUpperCase()}`);
    } catch (err) {
      if (!(err instanceof AppError)) throw err; // unknown code — fall through to the form
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl">הצטרפות לקבוצה</h1>
      <p className="mt-1 text-sm text-muted">
        קיבלתם קוד קבוצה או קישור הזמנה מחבר/ה. הזינו את הקוד ואת השם שיוצג בטבלה.
      </p>
      <div className="card mt-5 p-6">
        <JoinGroupForm initialCode={code ?? ""} />
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        כבר הצטרפת בעבר ואי אפשר להיכנס? בקש/י מהמנהל את הקישור האישי שלך.
      </p>
    </div>
  );
}
