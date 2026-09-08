import CreateGroupForm from "./CreateGroupForm";
import { getDefaultElection } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const { election } = await getDefaultElection();
  const defaultDeadline = new Date(
    new Date(election.electionDay).getTime() - 12 * 60 * 60 * 1000,
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl">יצירת קבוצה חדשה</h1>
      <p className="mt-1 text-sm text-muted">
        אתם המנהלים של הקבוצה: תוכלו לערוך שאלות בונוס, לנעול תחזיות ולהזין את התוצאות
        הרשמיות בסוף.
      </p>
      <div className="card mt-5 p-6">
        <CreateGroupForm
          electionName={election.nameHe}
          defaultDeadlineISO={defaultDeadline.toISOString()}
        />
      </div>
    </div>
  );
}
