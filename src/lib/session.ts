import { cookies } from "next/headers";

/**
 * There are no accounts. A visitor's identity in a group is a random token kept
 * in a cookie, one per group code, so the same browser can belong to several
 * groups. The group creator additionally holds an admin token cookie.
 */

export const ptCookie = (code: string) => `kp_pt_${code.toUpperCase()}`;
export const atCookie = (code: string) => `kp_at_${code.toUpperCase()}`;

export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  secure: process.env.NODE_ENV === "production",
};

export async function getParticipantToken(code: string): Promise<string | null> {
  const store = await cookies();
  return store.get(ptCookie(code))?.value ?? null;
}

export async function setParticipantToken(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(ptCookie(code), token, COOKIE_OPTS);
}

export async function getAdminToken(code: string): Promise<string | null> {
  const store = await cookies();
  return store.get(atCookie(code))?.value ?? null;
}

export async function setAdminToken(code: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(atCookie(code), token, COOKIE_OPTS);
}
