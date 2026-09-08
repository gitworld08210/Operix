import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless session tokens built exclusively on Node's built-in `node:crypto`.
 *
 * A token is a compact, tamper-evident envelope:
 *
 *   <base64url(JSON payload)>.<base64url(HMAC-SHA256(payload, secret))>
 *
 * This is deliberately a *signed* token, not an encrypted one: the payload is
 * readable by anyone holding the cookie, so it carries only non-sensitive
 * identifiers (user id, role, timestamps) — never a password, hash, or email.
 * Integrity is what matters here, and the HMAC provides it: without the secret
 * a client cannot forge a payload (e.g. escalate `role` to `"admin"`).
 *
 * Signature comparison uses `timingSafeEqual`. Expiry is enforced on every
 * read, and every failure mode returns `null` rather than throwing, so callers
 * have a single unambiguous "not authenticated" path.
 */

/** Roles a session may carry. Mirrors the `role` field on the User type. */
export type SessionRole = "user" | "admin";

/** Decoded, verified session payload. */
export interface SessionPayload {
  /** Subject: the user id, or `"env-admin"` for the env-configured admin. */
  sub: string;
  /** Authorisation role for this session. */
  role: SessionRole;
  /** Issued-at, in seconds since the epoch. */
  iat: number;
  /** Expiry, in seconds since the epoch. */
  exp: number;
}

/** Default session lifetime: 7 days, in seconds. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Subject used for a session issued from the env-configured admin credentials
 * (ADMIN_EMAIL / ADMIN_PASSWORD), which has no corresponding Mongo document.
 */
export const ENV_ADMIN_SUBJECT = "env-admin";

/** Encode a UTF-8 string as unpadded base64url. */
function encodeSegment(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

/** Compute the base64url HMAC-SHA256 of `data` under `secret`. */
function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** Current time in whole seconds since the epoch. */
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Create a signed session token.
 *
 * @param input - The subject and role to embed.
 * @param secret - The signing secret (see `getAuthSecret()` in lib/env).
 * @param ttlSeconds - Lifetime in seconds (defaults to {@link SESSION_TTL_SECONDS}).
 * @throws When the secret is empty — signing with an empty key would produce a
 *   trivially forgeable token, so this fails loudly instead.
 */
export function createSessionToken(
  input: { sub: string; role: SessionRole },
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  if (!secret) {
    throw new Error("Cannot sign a session token without a secret");
  }
  if (!input.sub) {
    throw new Error("Cannot sign a session token without a subject");
  }

  const issuedAt = nowSeconds();
  const payload: SessionPayload = {
    sub: input.sub,
    role: input.role,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  const encodedPayload = encodeSegment(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

/** Type guard for a structurally valid decoded payload. */
function isValidPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sub === "string" &&
    candidate.sub.length > 0 &&
    (candidate.role === "user" || candidate.role === "admin") &&
    typeof candidate.iat === "number" &&
    Number.isFinite(candidate.iat) &&
    typeof candidate.exp === "number" &&
    Number.isFinite(candidate.exp)
  );
}

/**
 * Verify a session token's signature and expiry.
 *
 * @returns The decoded payload, or `null` when the token is missing,
 *   malformed, wrongly signed, structurally invalid, or expired.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string | undefined | null,
): SessionPayload | null {
  // Fail closed: no token or no configured secret means no session.
  if (!token || !secret) return null;

  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;

  const encodedPayload = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);

  const expectedSignature = sign(encodedPayload, secret);

  const providedBytes = Buffer.from(providedSignature, "base64url");
  const expectedBytes = Buffer.from(expectedSignature, "base64url");
  // A length mismatch cannot be a valid signature; bail before timingSafeEqual
  // (which throws on unequal lengths).
  if (
    providedBytes.length === 0 ||
    providedBytes.length !== expectedBytes.length
  ) {
    return null;
  }
  if (!timingSafeEqual(providedBytes, expectedBytes)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!isValidPayload(decoded)) return null;
  // Enforce expiry on every read.
  if (decoded.exp <= nowSeconds()) return null;

  return decoded;
}
