import { cookies } from "next/headers";

/**
 * There are no accounts. A visitor's identity in a group is a random token kept
 * in a cookie, one per group code, so the same browser can belong to several
 * groups. The group creator additionally holds an admin token cookie.
 */

export const PT_PREFIX = "kp_pt_";
export const AT_PREFIX = "kp_at_";
export const ptCookie = (code: string) => `${PT_PREFIX}${code.toUpperCase()}`;
export const atCookie = (code: string) => `${AT_PREFIX}${code.toUpperCase()}`;

/** Sign-in cookies last 60 days, then name + personal code is needed again. */
export const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 60,
  secure: process.env.NODE_ENV === "production",
};

/** All groups this browser holds an identity cookie for: [{ code, token }]. */
export async function getAllParticipantCookies(): Promise<{ code: string; token: string }[]> {
  const store = await cookies();
  return store
    .getAll()
    .filter((c) => c.name.startsWith(PT_PREFIX) && c.value)
    .map((c) => ({ code: c.name.slice(PT_PREFIX.length).toUpperCase(), token: c.value }));
}

/** Group codes this browser holds an admin cookie for, mapped to the admin token. */
export async function getAllAdminCookies(): Promise<Record<string, string>> {
  const store = await cookies();
  const out: Record<string, string> = {};
  for (const c of store.getAll()) {
    if (c.name.startsWith(AT_PREFIX) && c.value) {
      out[c.name.slice(AT_PREFIX.length).toUpperCase()] = c.value;
    }
  }
  return out;
}

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
