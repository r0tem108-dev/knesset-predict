import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Group } from "@/models/Group";
import { Participant } from "@/models/Participant";
import { ptCookie, COOKIE_OPTS } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Personal re-entry link: /g/<code>/enter?t=<token>
 *
 * Re-installs the participant's identity cookie in whatever browser opens it,
 * then drops them on the group page. This is how a friend gets back in after
 * their cookie is gone (new phone, cleared data, WhatsApp's in-app browser…).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = req.nextUrl.searchParams.get("t")?.trim();
  const upper = code.toUpperCase();

  await connectDB();
  const group = await Group.findOne({ code: upper });
  if (!group) {
    return NextResponse.redirect(new URL(`/join?code=${upper}`, req.url));
  }

  const participant = token
    ? await Participant.findOne({ groupId: group._id, token })
    : null;

  const dest = participant ? `/g/${upper}` : `/join?code=${upper}`;
  const res = NextResponse.redirect(new URL(dest, req.url));
  if (participant && token) {
    res.cookies.set(ptCookie(upper), token, COOKIE_OPTS);
  }
  return res;
}
