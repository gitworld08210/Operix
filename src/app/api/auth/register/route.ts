import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { issueSessionToken, setSessionCookie } from "@/lib/authSession";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation";
import {
  createUser,
  emailExists,
  isDuplicateKeyError,
} from "@/services/mongodb/userRepository";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/register
 *
 * Create a self-service account: validate the payload (email format, password
 * length, confirmPassword match), reject a duplicate email, hash the password
 * with scrypt, persist the user with role "user", and sign the new account in by
 * setting the session cookie.
 *
 * The response body is the client-safe `User` (no password hash).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    // Surface the first field message — these are user-facing form errors
    // (e.g. "Passwords do not match"), not internal details.
    const message =
      parsed.error.issues[0]?.message ?? "Invalid registration details";
    return fail(message, 400);
  }

  const { name, email, password } = parsed.data;

  try {
    if (await emailExists(email)) {
      return fail("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    // `role` is pinned to "user": a self-service signup must never be able to
    // create an administrator, even if the request body says otherwise (the
    // schema also strips unknown keys).
    const user = await createUser({ email, name, passwordHash, role: "user" });

    const token = issueSessionToken(user.id, user.role);
    if (!token) {
      // NEXTAUTH_SECRET is unset. The account exists, but we cannot issue a
      // session, so report a configuration failure rather than pretending to
      // sign the user in.
      return fail("Authentication is not configured", 500);
    }

    return setSessionCookie(ok(user, undefined, 201), token);
  } catch (error) {
    // Lost race against a concurrent signup with the same email.
    if (isDuplicateKeyError(error)) {
      return fail("An account with this email already exists", 409);
    }
    return fail("Failed to create account", 500);
  }
}
