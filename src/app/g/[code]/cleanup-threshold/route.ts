import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { ensureSeeded } from "@/lib/seedData";
import { Group } from "@/models/Group";
import { Participant } from "@/models/Participant";
import { Prediction } from "@/models/Prediction";
import { Party } from "@/models/Party";
import { Election } from "@/models/Election";
import { mapToObj } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const apply = req.nextUrl.searchParams.get("apply") === "1";

  await connectDB();
  await ensureSeeded();

  const group = await Group.findOne({ code: code.toUpperCase().trim() });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const election = await Election.findById(group.electionId).lean();
  const threshold = election?.thresholdSeats ?? 4;
  const totalSeats = election?.totalSeats ?? 120;

  const allParties = await Party.find({ electionId: group.electionId }).lean();
  const partyNameByKey = new Map(allParties.map((p) => [p.key as string, p.nameHe as string]));

  const participants = await Participant.find({ groupId: group._id }).lean();
  const nameById = new Map(participants.map((p) => [String(p._id), p.displayName as string]));

  const preds = await Prediction.find({ groupId: group._id });
  const affected: {
    participantId: string;
    displayName: string;
    wasSubmitted: boolean;
    clearedParties: { key: string; nameHe: string; oldSeats: number }[];
    newTotalSeats: number;
  }[] = [];

  for (const pred of preds) {
    const seatsObj = mapToObj<number>(pred.seats);
    const cleared: { key: string; nameHe: string; oldSeats: number }[] = [];
    let newTotal = 0;

    for (const [k, v] of Object.entries(seatsObj)) {
      const num = Number(v || 0);
      if (num > 0 && num < threshold) {
        cleared.push({
          key: k,
          nameHe: partyNameByKey.get(k) ?? k,
          oldSeats: num,
        });
        seatsObj[k] = 0;
      } else {
        newTotal += num;
      }
    }

    if (cleared.length > 0) {
      const wasSubmitted = Boolean(pred.submitted);
      if (apply) {
        pred.set("seats", seatsObj);
        if (newTotal !== totalSeats) {
          pred.submitted = false;
        }
        const cpKey = pred.confidencePick?.partyKey;
        if (cpKey && seatsObj[cpKey] === 0) {
          pred.set("confidencePick", { partyKey: "", seats: 0 });
        }
        await pred.save();
      }
      affected.push({
        participantId: String(pred.participantId),
        displayName: nameById.get(String(pred.participantId)) ?? "לא ידוע",
        wasSubmitted,
        clearedParties: cleared,
        newTotalSeats: newTotal,
      });
    }
  }

  return NextResponse.json({
    code: group.code,
    applied: apply,
    affectedCount: affected.length,
    affected,
  });
}
