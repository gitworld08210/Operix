import { getAdminEmail, getAdminPassword } from "@/lib/env";
import { credentialsMatch } from "@/lib/password";
import { ENV_ADMIN_SUBJECT } from "@/lib/session";
import type { User } from "@/types";

/**
 * The "built-in" administrator, configured entirely through environment
 * variables (ADMIN_EMAIL / ADMIN_PASSWORD) rather than stored in MongoDB.
 *
 * This exists so a fresh deployment has a usable admin door before any database
 * record exists. It is intentionally a thin wrapper: the actual comparison logic
 * lives in `lib/password.credentialsMatch`, which is constant-time, fails closed
 * on unset env vars, and is covered by offline tests.
 *
 * A database-stored administrator (a User document with `role: "admin"`) is the
 * other supported path and is handled by the normal user lookup.
 */

/** Display name shown for the env-configured administrator. */
const ENV_ADMIN_NAME = "Administrator";

/**
 * Check submitted credentials against ADMIN_EMAIL / ADMIN_PASSWORD.
 *
 * @returns `true` only when both env vars are configured AND both values match.
 *   Returns `false` when either variable is unset, so an unconfigured admin
 *   account cannot be used to sign in.
 */
export function isEnvAdminCredentials(
  email: string,
  password: string,
): boolean {
  return credentialsMatch(
    { email, password },
    { email: getAdminEmail(), password: getAdminPassword() },
  );
}

/**
 * Build the client-safe `User` object representing the env-configured admin.
 *
 * The env admin has no MongoDB document, so `GET /api/auth/me` synthesises this
 * shape instead of doing a database lookup. `id` is the reserved
 * {@link ENV_ADMIN_SUBJECT} sentinel, which can never collide with a real
 * ObjectId.
 *
 * `isPremium` is `true` so the admin is never shown an upsell or an ad while
 * reviewing uploaded content.
 *
 * @param issuedAtSeconds - The session's `iat`, used as a stand-in for
 *   `createdAt` so the shape has a plausible timestamp.
 */
export function buildEnvAdminUser(issuedAtSeconds?: number): User {
  const timestamp = issuedAtSeconds
    ? new Date(issuedAtSeconds * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: ENV_ADMIN_SUBJECT,
    // Falls back to the sentinel rather than throwing: this is only ever called
    // for an already-verified admin session.
    email: getAdminEmail() ?? ENV_ADMIN_SUBJECT,
    name: ENV_ADMIN_NAME,
    role: "admin",
    isPremium: true,
    createdAt: timestamp,
    lastLogin: timestamp,
  };
}
