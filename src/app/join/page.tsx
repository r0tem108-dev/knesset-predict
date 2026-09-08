import JoinGroupForm from "./JoinGroupForm";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl">הצטרפות לקבוצה</h1>
      <p className="mt-1 text-sm text-muted">
        קיבלתם קוד קבוצה או קישור הזמנה מחבר/ה. הזינו את הקוד ואת השם שיוצג בטבלה.
      </p>
      <div className="card mt-5 p-6">
        <JoinGroupForm initialCode={code ?? ""} />
      </div>
    </div>
  );
}
