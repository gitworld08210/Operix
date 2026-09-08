import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { issueSessionToken, setSessionCookie } from "@/lib/authSession";
import { buildEnvAdminUser, isEnvAdminCredentials } from "@/lib/envAdmin";
import { verifyPassword } from "@/lib/password";
import { ENV_ADMIN_SUBJECT } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import {
  findUserCredentialsByEmail,
  touchLastLogin,
} from "@/services/mongodb/userRepository";

export const dynamic = "force-dynamic";

/** Generic failure message — never reveals which half of the pair was wrong. */
const INVALID_CREDENTIALS = "Invalid administrator credentials";

/**
 * POST /api/auth/admin/login
 *
 * The administrator's own sign-in door, separate from the normal user login.
 * Two kinds of administrator are accepted:
 *
 *  1. The env-configured admin — ADMIN_EMAIL / ADMIN_PASSWORD compared in
 *     constant time. This gives a fresh deployment a working admin account
 *     before any database record exists.
 *  2. A database admin — a User document whose `role` is "admin", verified
 *     against its stored scrypt hash. (Such a user can equally sign in via
 *     /api/auth/login; accepting them here too means the admin page has one
 *     door regardless of how the admin was provisioned.)
 *
 * Fails closed: a non-admin user submitting correct credentials is rejected
 * here, and when neither admin path is available the request is refused.
 * Success issues a session cookie carrying `role: "admin"`.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail(INVALID_CREDENTIALS, 401);
  }

  const { email, password } = parsed.data;

  // ---- Path 1: the env-configured administrator -------------------------
  // `isEnvAdminCredentials` itself fails closed when either env var is unset,
  // so an unconfigured admin can never be matched.
  if (isEnvAdminCredentials(email, password)) {
    const token = issueSessionToken(ENV_ADMIN_SUBJECT, "admin");
    if (!token) {
      return fail("Authentication is not configured", 500);
    }
    return setSessionCookie(ok(buildEnvAdminUser()), token);
  }

  // ---- Path 2: a database administrator ---------------------------------
  try {
    const record = await findUserCredentialsByEmail(email);

    // Only an actual admin may authenticate here. Checking the role before
    // verifying the password means a normal user's correct credentials cannot
    // be used to probe this endpoint.
    if (
      record?.passwordHash &&
      record.user.role === "admin" &&
      (await verifyPassword(password, record.passwordHash))
    ) {
      const token = issueSessionToken(record.user.id, "admin");
      if (!token) {
        return fail("Authentication is not configured", 500);
      }

      const refreshed = await touchLastLogin(record.user.id);
      return setSessionCookie(ok(refreshed ?? record.user), token);
    }

    // Neither path matched: wrong credentials, a non-admin user, or a
    // deployment with no admin configured at all. All are the same 401 — never a
    // 500 — so an unconfigured deployment is closed rather than merely broken.
    return fail(INVALID_CREDENTIALS, 401);
  } catch {
    // A database outage must not open the admin door.
    return fail(INVALID_CREDENTIALS, 401);
  }
}
