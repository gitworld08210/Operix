import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/authSession";
import { buildEnvAdminUser } from "@/lib/envAdmin";
import { ENV_ADMIN_SUBJECT } from "@/lib/session";
import { findUserById } from "@/services/mongodb/userRepository";

export const dynamic = "force-dynamic";

/** Returned for every unauthenticated case, so none of them is distinguishable. */
const NOT_AUTHENTICATED = "Not authenticated";

/**
 * GET /api/auth/me
 *
 * Resolve the caller's session cookie to the client-safe `User`. This is the
 * endpoint `UserContext` calls on mount to rehydrate client state, which is why
 * the session cookie — not localStorage — is the source of truth for identity.
 *
 * Returns 401 when the cookie is absent, unsigned, tampered with, or expired.
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail(NOT_AUTHENTICATED, 401);
  }

  // The env-configured administrator has no MongoDB document, so synthesise its
  // identity from the verified session instead of doing a lookup.
  if (session.sub === ENV_ADMIN_SUBJECT) {
    return ok(buildEnvAdminUser(session.iat));
  }

  try {
    const user = await findUserById(session.sub);
    if (!user) {
      // Correctly signed session for a user that no longer exists (deleted
      // account, or a database swap). Clear the stale cookie so the client stops
      // re-sending it on every mount.
      return clearSessionCookie(fail(NOT_AUTHENTICATED, 401));
    }

    return ok(user);
  } catch {
    return fail("Failed to load the current user", 500);
  }
}
