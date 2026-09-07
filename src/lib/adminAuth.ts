import { hasAdminSession } from "@/lib/authSession";
import { getAdminApiToken } from "@/lib/env";
import { safeStringEqual } from "@/lib/password";

/** Header carrying the admin shared secret for movie write endpoints. */
export const ADMIN_TOKEN_HEADER = "x-admin-token";

/**
 * Fail-closed admin gate for the catalog write verbs (POST/PUT/DELETE) and the
 * upload routes.
 *
 * Two credentials are accepted, and either alone is sufficient:
 *
 *  1. A session cookie carrying `role: "admin"` — how a signed-in administrator
 *     is recognised. Interactive admins no longer need to paste a token.
 *  2. The `x-admin-token` header matching ADMIN_API_TOKEN — retained for
 *     scripts, CI and any caller that cannot hold a cookie, and so existing
 *     integrations keep working unchanged.
 *
 * Returns `false` whenever neither is present and valid, including when the
 * relevant env var is unset — with nothing configured, no request is authorised.
 *
 * Stays synchronous (session verification is an in-process HMAC check, and the
 * cookie is read straight off the request headers) so existing call sites need
 * no changes.
 */
export function isAuthorizedAdmin(request: Request): boolean {
  // Path 1: an admin session cookie.
  if (hasAdminSession(request)) {
    return true;
  }

  // Path 2: the shared header token.
  const expected = getAdminApiToken();
  // Fail closed: with no configured token, this path cannot authorise anything.
  if (!expected) {
    return false;
  }

  const provided = request.headers.get(ADMIN_TOKEN_HEADER);
  if (!provided) {
    return false;
  }

  // Constant-time compare so the token cannot be recovered byte-by-byte by
  // timing repeated requests.
  return safeStringEqual(provided, expected);
}
