import assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_PASSWORD_LENGTH,
  credentialsMatch,
  hashPassword,
  safeStringEqual,
  verifyPassword,
} from "./password.ts";
import * as policy from "./passwordPolicy.ts";

test("hashPassword produces an encoded scrypt string with salt and hash", async () => {
  const encoded = await hashPassword("correct horse battery staple");

  const segments = encoded.split("$");
  assert.equal(segments.length, 4, "expected algorithm$params$salt$hash");
  assert.equal(segments[0], "scrypt");
  assert.match(segments[1], /^N=\d+,r=\d+,p=\d+$/);
  assert.ok(segments[2].length > 0, "salt segment must not be empty");
  assert.ok(segments[3].length > 0, "hash segment must not be empty");
});

test("hashPassword never embeds the plaintext password", async () => {
  const password = "SuperSecret123!";
  const encoded = await hashPassword(password);

  assert.ok(
    !encoded.includes(password),
    "encoded hash must not contain the plaintext",
  );
});

test("password hash + verify round-trips for the correct password", async () => {
  const password = "aVeryGoodPassword1";
  const encoded = await hashPassword(password);

  assert.equal(await verifyPassword(password, encoded), true);
});

test("verifyPassword rejects a wrong password", async () => {
  const encoded = await hashPassword("theRightPassword1");

  assert.equal(await verifyPassword("theWrongPassword1", encoded), false);
});

test("verifyPassword rejects a near-miss (case and trailing space)", async () => {
  const encoded = await hashPassword("CaseSensitive1");

  assert.equal(await verifyPassword("casesensitive1", encoded), false);
  assert.equal(await verifyPassword("CaseSensitive1 ", encoded), false);
});

test("the same password hashed twice yields different hashes (random salt)", async () => {
  const password = "repeatedPassword1";
  const first = await hashPassword(password);
  const second = await hashPassword(password);

  assert.notEqual(first, second, "per-password salt must differ");
  // Both must still verify.
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password, second), true);
});

test("verifyPassword rejects a hash whose stored digest was tampered with", async () => {
  const password = "tamperTarget1";
  const encoded = await hashPassword(password);
  const segments = encoded.split("$");

  // Flip the first character of the stored digest.
  const digest = segments[3];
  const flipped = (digest[0] === "A" ? "B" : "A") + digest.slice(1);
  const tampered = [segments[0], segments[1], segments[2], flipped].join("$");

  assert.equal(await verifyPassword(password, tampered), false);
});

test("verifyPassword rejects a hash whose salt was swapped", async () => {
  const password = "saltSwap1";
  const encoded = await hashPassword(password);
  const other = await hashPassword(password);

  const mine = encoded.split("$");
  const theirs = other.split("$");
  // Keep my digest but use a different salt: verification must fail.
  const swapped = [mine[0], mine[1], theirs[2], mine[3]].join("$");

  assert.equal(await verifyPassword(password, swapped), false);
});

test("verifyPassword returns false (never throws) for malformed stored hashes", async () => {
  const cases: (string | undefined | null)[] = [
    "",
    undefined,
    null,
    "not-a-hash",
    "scrypt$onlythree$parts",
    "bcrypt$N=16384,r=8,p=1$c2FsdA$aGFzaA", // wrong algorithm
    "scrypt$N=0,r=8,p=1$c2FsdA$aGFzaA", // non-positive parameter
    "scrypt$N=16384,r=8,p=1$$aGFzaA", // empty salt
    "scrypt$N=16384,r=8,p=1$c2FsdA$", // empty hash
  ];

  for (const stored of cases) {
    assert.equal(
      await verifyPassword("anyPassword1", stored),
      false,
      `expected false for stored hash: ${String(stored)}`,
    );
  }
});

test("verifyPassword rejects an empty password and over-long input", async () => {
  const encoded = await hashPassword("realPassword1");

  assert.equal(await verifyPassword("", encoded), false);
  assert.equal(
    await verifyPassword("x".repeat(MAX_PASSWORD_LENGTH + 1), encoded),
    false,
  );
});

test("hashPassword refuses empty and over-long passwords", async () => {
  await assert.rejects(() => hashPassword(""), /must not be empty/);
  await assert.rejects(
    () => hashPassword("y".repeat(MAX_PASSWORD_LENGTH + 1)),
    /too long/,
  );
});

test("a password at the documented minimum length is hashable and verifiable", async () => {
  const password = "a".repeat(policy.MIN_PASSWORD_LENGTH);
  const encoded = await hashPassword(password);

  assert.equal(await verifyPassword(password, encoded), true);
});

test("the hashing module's max length mirrors lib/passwordPolicy (no drift)", () => {
  // password.ts deliberately duplicates this bound so it can import only Node
  // built-ins and stay offline-testable. This guards against the copies drifting.
  assert.equal(
    MAX_PASSWORD_LENGTH,
    policy.MAX_PASSWORD_LENGTH,
    "password.ts MAX_PASSWORD_LENGTH must equal passwordPolicy.MAX_PASSWORD_LENGTH",
  );
  assert.ok(
    policy.MIN_PASSWORD_LENGTH > 0 &&
      policy.MIN_PASSWORD_LENGTH < policy.MAX_PASSWORD_LENGTH,
    "policy bounds must be a sane range",
  );
});

test("credentialsMatch accepts an exact env-admin credential pair", () => {
  const expected = { email: "admin@example.com", password: "s3cret-Admin!" };

  assert.equal(
    credentialsMatch({ email: "admin@example.com", password: "s3cret-Admin!" }, expected),
    true,
  );
});

test("credentialsMatch compares email case-insensitively but password exactly", () => {
  const expected = { email: "Admin@Example.com", password: "s3cret-Admin!" };

  assert.equal(
    credentialsMatch({ email: "admin@example.com", password: "s3cret-Admin!" }, expected),
    true,
    "email casing must not matter",
  );
  assert.equal(
    credentialsMatch({ email: " admin@example.com ", password: "s3cret-Admin!" }, expected),
    true,
    "surrounding whitespace in the email must be tolerated",
  );
  assert.equal(
    credentialsMatch({ email: "admin@example.com", password: "S3CRET-ADMIN!" }, expected),
    false,
    "password casing must matter",
  );
});

test("credentialsMatch rejects a wrong email or a wrong password", () => {
  const expected = { email: "admin@example.com", password: "s3cret-Admin!" };

  assert.equal(
    credentialsMatch({ email: "someone@example.com", password: "s3cret-Admin!" }, expected),
    false,
  );
  assert.equal(
    credentialsMatch({ email: "admin@example.com", password: "wrong" }, expected),
    false,
  );
});

test("credentialsMatch FAILS CLOSED when the admin env vars are unset", () => {
  // This is the important security property: an unconfigured admin account must
  // be unusable, not open.
  const submissions = [
    { email: "admin@example.com", password: "anything" },
    { email: "", password: "" },
  ];
  const unconfigured = [
    { email: undefined, password: undefined },
    { email: "admin@example.com", password: undefined },
    { email: undefined, password: "s3cret" },
    { email: "", password: "" },
    { email: "admin@example.com", password: "" },
  ];

  for (const submitted of submissions) {
    for (const expected of unconfigured) {
      assert.equal(
        credentialsMatch(submitted, expected),
        false,
        `expected false for expected=${JSON.stringify(expected)}`,
      );
    }
  }
});

test("credentialsMatch rejects empty submitted credentials against a configured admin", () => {
  const expected = { email: "admin@example.com", password: "s3cret-Admin!" };

  assert.equal(credentialsMatch({ email: "", password: "s3cret-Admin!" }, expected), false);
  assert.equal(credentialsMatch({ email: "admin@example.com", password: "" }, expected), false);
});

test("safeStringEqual matches identical strings and rejects differences", () => {
  assert.equal(safeStringEqual("admin@example.com", "admin@example.com"), true);
  assert.equal(safeStringEqual("admin@example.com", "admin@example.co"), false);
  assert.equal(safeStringEqual("admin@example.com", "Admin@example.com"), false);
  assert.equal(safeStringEqual("", ""), true);
  assert.equal(safeStringEqual("a", ""), false);
});
