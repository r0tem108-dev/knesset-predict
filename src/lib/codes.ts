import { customAlphabet, nanoid } from "nanoid";

/** Group codes: 6 chars, no ambiguous glyphs, upper-case. e.g. "K7P2QX". */
const groupCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeGroupCode = customAlphabet(groupCodeAlphabet, 6);

export function newGroupCode(): string {
  return makeGroupCode();
}

/** Opaque secret tokens for admin / participant identification. */
export function newToken(): string {
  return nanoid(32);
}

export function inviteLink(code: string, baseUrl?: string): string {
  const base = (baseUrl || process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  return `${base}/join?code=${code}`;
}
