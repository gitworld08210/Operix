import { randomBytes } from "node:crypto";

import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { issueSessionToken, setSessionCookie } from "@/lib/authSession";
import { hashPassword, verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation";
import {
  findUserCredentialsByEmail,
  touchLastLogin,
} from "@/services/mongodb/userRepository";

export const dynamic = "force-dynamic";

/**
 * One generic message for every credential failure. Distinguishing "no such
 * email" from "wrong password" would turn this endpoint into an account
 * enumeration oracle, so both paths return exactly this, with the same status.
 */
const INVALID_CREDENTIALS = "Invalid email or password";

/**
 * A throwaway hash used to equalise response time when no user matches the
 * submitted email.
 *
 * Without it, a miss would return long before a hit (which pays for a full
 * scrypt derivation), and that timing gap alone reveals which emails have
 * accounts. Generated once per process from random bytes, so it can never
 * correspond to a real password.
 */
let decoyHashPromise: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  if (!decoyHashPromise) {
    decoyHashPromise = hashPassword(randomBytes(32).toString("hex"));
  }
  return decoyHashPromise;
}

/**
 * POST /api/auth/login
 *
 * Verify an email/password pair against a stored scrypt hash and, on success,
 * set the session cookie and return the client-safe `User`.
 *
 * A user whose stored `role` is "admin" receives an admin session here, so a
 * database-stored administrator can sign in through the normal door. The
 * env-configured administrator uses POST /api/auth/admin/login instead.
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
    // Deliberately generic: a malformed submission must look like a failed one.
    return fail(INVALID_CREDENTIALS, 401);
  }

  const { email, password } = parsed.data;

  try {
    const record = await findUserCredentialsByEmail(email);

    if (!record?.passwordHash) {
      // No such user, or a user with no password set (e.g. seeded without one).
      // Burn a comparable amount of work so the timing matches a real miss.
      await verifyPassword(password, await getDecoyHash());
      return fail(INVALID_CREDENTIALS, 401);
    }

    const passwordOk = await verifyPassword(password, record.passwordHash);
    if (!passwordOk) {
      return fail(INVALID_CREDENTIALS, 401);
    }

    // The role comes from the stored document, never from the request.
    const token = issueSessionToken(record.user.id, record.user.role);
    if (!token) {
      return fail("Authentication is not configured", 500);
    }

    // Best-effort audit stamp; a failure here must not fail the login.
    const refreshed = await touchLastLogin(record.user.id);

    return setSessionCookie(ok(refreshed ?? record.user), token);
  } catch {
    return fail("Failed to sign in", 500);
  }
}
