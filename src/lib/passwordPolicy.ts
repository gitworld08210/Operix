/**
 * Password policy constants.
 *
 * These live in their own dependency-free module (no imports at all) so that
 * BOTH the server-side hashing layer (`lib/password.ts`, which imports
 * `node:crypto`) and client components (the signup form's inline hint) can
 * share one source of truth. Importing the policy must never drag `node:crypto`
 * into a browser bundle.
 */

/** Minimum accepted plaintext password length. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum accepted plaintext password length. scrypt's cost is independent of
 * input size, but capping the input avoids wasting work on absurd payloads.
 */
export const MAX_PASSWORD_LENGTH = 200;
