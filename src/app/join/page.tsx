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

  // Already identified in this browser? Skip straight to the group.
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
      <h1 className="text-2xl">כניסה לקבוצה</h1>
      <p className="mt-1 text-sm text-muted">
        חדשים? הזינו שם וקוד אישי. חוזרים ממכשיר אחר? אותו שם ואותו קוד אישי.
      </p>
      <div className="card mt-5 p-6">
        <JoinGroupForm initialCode={code ?? ""} />
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        שכחתם את הקוד האישי? בקשו מהמנהל של הקבוצה לאפס אותו.
      </p>
    </div>
  );
}
