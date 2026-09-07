import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";

/**
 * Password hashing built exclusively on Node's built-in `node:crypto`.
 *
 * The deployment sandbox has no package registry, so bcrypt/argon2 cannot be
 * installed. `scrypt` is a memory-hard KDF shipped with Node and is a sound
 * choice for password storage, so this module implements the standard
 * salt-per-user + constant-time-compare pattern on top of it.
 *
 * Stored format (a single self-describing string, so parameters can be tuned
 * later without invalidating existing hashes):
 *
 *   scrypt$N=16384,r=8,p=1$<salt-base64url>$<hash-base64url>
 *
 * Never log, return, or otherwise expose the values handled here.
 */

/** Algorithm identifier written into (and required by) the encoded hash. */
const ALGORITHM = "scrypt";

/** CPU/memory cost. 16384 (2^14) with r=8 => ~16 MiB per hash. */
const SCRYPT_N = 16384;
/** Block size. */
const SCRYPT_R = 8;
/** Parallelisation factor. */
const SCRYPT_P = 1;
/** Derived key length in bytes. */
const KEY_LENGTH = 64;
/** Per-password random salt length in bytes. */
const SALT_LENGTH = 16;

/**
 * `maxmem` must be raised above Node's 32 MiB default because the default is
 * too small for N=16384, r=8, p=1 (roughly 128 * N * r = 16 MiB, plus
 * overhead). Computed rather than hardcoded so tuning the cost stays safe.
 */
const MAX_MEM = 256 * SCRYPT_N * SCRYPT_R;

/**
 * Upper bound on accepted plaintext length, mirroring `MAX_PASSWORD_LENGTH` in
 * `lib/passwordPolicy.ts`.
 *
 * It is duplicated rather than imported on purpose: this module must import
 * *only* Node built-ins so it stays runnable under
 * `node --experimental-strip-types --test` (the `@/` path alias does not resolve
 * outside the bundler). `password.test.ts` asserts the two constants agree, so
 * the duplication cannot silently drift.
 */
export const MAX_PASSWORD_LENGTH = 200;

/** Promise wrapper around the callback-style `crypto.scrypt`. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: params.N, r: params.r, p: params.p, maxmem: MAX_MEM },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
}

/** Encode bytes as unpadded base64url so the hash is cookie/JSON safe. */
function toBase64Url(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/** Decode an unpadded base64url string back to bytes. */
function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

/**
 * Hash a plaintext password with a freshly generated random salt.
 *
 * @param password - The plaintext password.
 * @returns The encoded `scrypt$params$salt$hash` string to persist.
 * @throws When the password is empty or longer than {@link MAX_PASSWORD_LENGTH}.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error("Password must not be empty");
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("Password is too long");
  }

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  const params = `N=${SCRYPT_N},r=${SCRYPT_R},p=${SCRYPT_P}`;
  return `${ALGORITHM}$${params}$${toBase64Url(salt)}$${toBase64Url(derivedKey)}`;
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

/**
 * Parse an encoded hash string. Returns `null` for anything malformed so
 * callers treat corrupt/legacy values as a failed verification rather than
 * throwing (and rather than accidentally authenticating).
 */
function parseEncodedHash(encoded: string): ParsedHash | null {
  if (typeof encoded !== "string") return null;

  const segments = encoded.split("$");
  if (segments.length !== 4) return null;

  const [algorithm, paramString, saltPart, hashPart] = segments;
  if (algorithm !== ALGORITHM) return null;

  const params: Record<string, number> = {};
  for (const pair of paramString.split(",")) {
    const [key, rawValue] = pair.split("=");
    const value = Number(rawValue);
    if (!key || !Number.isInteger(value) || value <= 0) return null;
    params[key] = value;
  }
  if (!params.N || !params.r || !params.p) return null;

  const salt = fromBase64Url(saltPart);
  const hash = fromBase64Url(hashPart);
  if (salt.length === 0 || hash.length === 0) return null;

  return { N: params.N, r: params.r, p: params.p, salt, hash };
}

/**
 * Verify a plaintext password against an encoded hash produced by
 * {@link hashPassword}.
 *
 * Uses `timingSafeEqual` so a mismatch does not leak information through
 * comparison timing. Returns `false` (never throws) for malformed stored
 * hashes, empty passwords, or over-long input, so every failure path is a
 * plain authentication failure.
 */
export async function verifyPassword(
  password: string,
  encodedHash: string | undefined | null,
): Promise<boolean> {
  if (!password || !encodedHash) return false;
  if (password.length > MAX_PASSWORD_LENGTH) return false;

  const parsed = parseEncodedHash(encodedHash);
  if (!parsed) return false;

  let derivedKey: Buffer;
  try {
    derivedKey = await scryptAsync(password, parsed.salt, parsed.hash.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
    });
  } catch {
    return false;
  }

  // Lengths are equal by construction (we derived exactly hash.length bytes),
  // but timingSafeEqual throws on a mismatch, so guard defensively.
  if (derivedKey.length !== parsed.hash.length) return false;
  return timingSafeEqual(derivedKey, parsed.hash);
}

/**
 * Constant-time comparison of two UTF-8 strings, for credential checks that
 * are not hash-based (e.g. the env-configured admin email/password).
 *
 * Note: like any fixed-length-agnostic comparison this still reveals whether
 * the two inputs have the same byte length; it does not leak *where* they
 * differ, which is what matters for guessing attacks.
 */
export function safeStringEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
