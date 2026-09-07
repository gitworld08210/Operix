import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME } from "@/lib/authSession";
import { getAuthSecret } from "@/lib/env";
import { verifySessionToken, type SessionPayload } from "@/lib/session";

/**
 * Session reader for React Server Components and layouts, which have no
 * `Request` object and must go through `next/headers`.
 *
 * Kept separate from `lib/authSession.ts` so that `next/headers` — which is
 * only valid inside the server component / route handler render context — is
 * not pulled in by modules imported from other runtimes.
 *
 * Any route or page calling this becomes request-scoped, so callers should also
 * declare `export const dynamic = "force-dynamic"`.
 */

/**
 * Read and verify the session from the incoming request's cookies.
 *
 * @returns The verified payload, or `null` when absent, invalid, expired, or
 *   when NEXTAUTH_SECRET is unset (fail closed).
 */
export function getServerSession(): SessionPayload | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, getAuthSecret());
}

/** Whether the current request carries a valid `admin` session. */
export function hasAdminServerSession(): boolean {
  return getServerSession()?.role === "admin";
}
