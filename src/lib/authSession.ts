import type { NextResponse } from "next/server";

import { readCookie } from "@/lib/cookies";
import { getAuthSecret, isProduction } from "@/lib/env";
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
  type SessionRole,
} from "@/lib/session";

/**
 * Session cookie plumbing: turns the pure token primitives in `lib/session.ts`
 * into an httpOnly cookie on the way out, and reads/verifies it on the way in.
 *
 * Cookie attributes:
 *   - `httpOnly`  — JavaScript cannot read it, so XSS cannot exfiltrate the session.
 *   - `sameSite=lax` — blocks cross-site POST CSRF while keeping normal
 *     top-level navigation to the app working.
 *   - `secure`    — set in production only, so local HTTP development still works.
 *   - `path=/`    — the whole app, including /admin and /api.
 */

/** Name of the session cookie. */
export const SESSION_COOKIE_NAME = "ott_session";

/** Cookie attributes shared by the set and clear paths. */
function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };
}

/**
 * Mint a session token for the given subject/role.
 *
 * @returns The signed token, or `null` when NEXTAUTH_SECRET is unset — callers
 *   must treat `null` as a hard failure and must not authenticate the request.
 *   The secret is never defaulted, because a predictable signing key would let
 *   anyone forge an `admin` session.
 */
export function issueSessionToken(
  sub: string,
  role: SessionRole,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string | null {
  const secret = getAuthSecret();
  if (!secret) return null;

  return createSessionToken({ sub, role }, secret, ttlSeconds);
}

/**
 * Attach a session cookie carrying `token` to an outgoing response.
 *
 * `maxAge` is kept in step with the token's own TTL so the browser discards the
 * cookie at roughly the moment the signature stops being accepted.
 */
export function setSessionCookie<T>(
  response: NextResponse<T>,
  token: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): NextResponse<T> {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    ...baseCookieOptions(),
    maxAge: ttlSeconds,
  });
  return response;
}

/**
 * Expire the session cookie on an outgoing response.
 *
 * Sets an empty value with `maxAge: 0` (rather than only deleting) so the
 * browser is instructed to drop it immediately, using the same attributes it
 * was set with — a mismatch would leave the original cookie in place.
 */
export function clearSessionCookie<T>(
  response: NextResponse<T>,
): NextResponse<T> {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    ...baseCookieOptions(),
    maxAge: 0,
  });
  return response;
}

/**
 * Read and verify the session from an incoming request's `Cookie` header.
 *
 * Synchronous and free of `next/headers`, so it works in route handlers and in
 * `lib/adminAuth.ts` (which must keep its existing sync signature).
 *
 * @returns The verified payload, or `null` when there is no valid, unexpired
 *   session — including when the signing secret is unset (fail closed).
 */
export function getSessionFromRequest(
  request: Request,
): SessionPayload | null {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  return verifySessionToken(token, getAuthSecret());
}

/** Whether the request carries a valid session with the `admin` role. */
export function hasAdminSession(request: Request): boolean {
  return getSessionFromRequest(request)?.role === "admin";
}
