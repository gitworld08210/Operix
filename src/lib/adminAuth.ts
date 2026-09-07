import { getAdminApiToken } from "@/lib/env";

/** Header carrying the admin shared secret for movie write endpoints. */
export const ADMIN_TOKEN_HEADER = "x-admin-token";

/**
 * Lazy, fail-closed admin gate for the movie write verbs (POST/PUT/DELETE).
 *
 * Returns `true` only when ADMIN_API_TOKEN is configured AND the incoming
 * `x-admin-token` header exactly matches it. When the env var is unset, or the
 * header is missing/mismatched, this returns `false` so callers respond 401.
 *
 * This is a deliberately minimal stopgap while full auth (NextAuth / Azure AD
 * B2C) remains a deferred scope item; it prevents anonymous catalog mutation.
 */
export function isAuthorizedAdmin(request: Request): boolean {
  const expected = getAdminApiToken();
  // Fail closed: with no configured token, no request is authorized.
  if (!expected) {
    return false;
  }
  const provided = request.headers.get(ADMIN_TOKEN_HEADER);
  return provided === expected;
}
