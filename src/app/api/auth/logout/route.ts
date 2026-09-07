import { ok } from "@/lib/apiResponse";
import { clearSessionCookie } from "@/lib/authSession";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 *
 * Expire the session cookie. Always succeeds — signing out when already signed
 * out is not an error, and the client's desired end state (no session) is
 * reached either way.
 *
 * Sessions are stateless signed tokens, so "logout" means instructing the
 * browser to drop the cookie. A token already copied elsewhere stays valid until
 * its `exp`; shortening that window is a matter of the session TTL, and true
 * server-side revocation would require a token store (see the deferral noted in
 * the PR).
 */
export async function POST() {
  return clearSessionCookie(ok({ signedOut: true }));
}
