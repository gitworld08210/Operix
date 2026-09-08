import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import {
  ENV_ADMIN_SUBJECT,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "./session.ts";

const SECRET = "test-secret-do-not-use-in-production";

test("session token sign + verify round-trips and preserves sub and role", () => {
  const token = createSessionToken({ sub: "user-123", role: "user" }, SECRET);

  const payload = verifySessionToken(token, SECRET);
  assert.ok(payload, "expected a verified payload");
  assert.equal(payload.sub, "user-123");
  assert.equal(payload.role, "user");
});

test("session token round-trips an admin role", () => {
  const token = createSessionToken(
    { sub: ENV_ADMIN_SUBJECT, role: "admin" },
    SECRET,
  );

  const payload = verifySessionToken(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.role, "admin");
  assert.equal(payload.sub, ENV_ADMIN_SUBJECT);
});

test("issued token carries sane iat/exp derived from the TTL", () => {
  const before = Math.floor(Date.now() / 1000);
  const token = createSessionToken({ sub: "u1", role: "user" }, SECRET);
  const after = Math.floor(Date.now() / 1000);

  const payload = verifySessionToken(token, SECRET);
  assert.ok(payload);
  assert.ok(payload.iat >= before && payload.iat <= after, "iat within window");
  assert.equal(payload.exp, payload.iat + SESSION_TTL_SECONDS);
});

test("verifySessionToken rejects a tampered signature", () => {
  const token = createSessionToken({ sub: "user-123", role: "user" }, SECRET);
  const [payloadSegment, signature] = token.split(".");

  const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  const tampered = `${payloadSegment}.${flipped}`;

  assert.equal(verifySessionToken(tampered, SECRET), null);
});

test("verifySessionToken rejects a tampered payload (role escalation attempt)", () => {
  // Forge a payload claiming admin, but reuse the signature from a user token.
  const userToken = createSessionToken({ sub: "user-123", role: "user" }, SECRET);
  const signature = userToken.split(".")[1];

  const forgedPayload = Buffer.from(
    JSON.stringify({
      sub: "user-123",
      role: "admin",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
    "utf8",
  ).toString("base64url");

  assert.equal(verifySessionToken(`${forgedPayload}.${signature}`, SECRET), null);
});

test("verifySessionToken rejects a token signed with a different secret", () => {
  const token = createSessionToken({ sub: "user-123", role: "admin" }, SECRET);

  assert.equal(verifySessionToken(token, "some-other-secret"), null);
});

test("verifySessionToken rejects an expired token", () => {
  // Negative TTL puts exp in the past.
  const token = createSessionToken({ sub: "user-123", role: "user" }, SECRET, -1);

  assert.equal(verifySessionToken(token, SECRET), null);
});

test("verifySessionToken rejects a token expiring exactly now", () => {
  const token = createSessionToken({ sub: "user-123", role: "user" }, SECRET, 0);

  assert.equal(verifySessionToken(token, SECRET), null);
});

test("verifySessionToken accepts a token still inside its window", () => {
  const token = createSessionToken({ sub: "user-123", role: "user" }, SECRET, 60);

  const payload = verifySessionToken(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.sub, "user-123");
});

test("verifySessionToken fails closed when the secret is missing", () => {
  const token = createSessionToken({ sub: "user-123", role: "admin" }, SECRET);

  assert.equal(verifySessionToken(token, undefined), null);
  assert.equal(verifySessionToken(token, null), null);
  assert.equal(verifySessionToken(token, ""), null);
});

test("verifySessionToken returns null for missing or malformed tokens", () => {
  const cases: (string | undefined | null)[] = [
    undefined,
    null,
    "",
    "no-separator",
    ".onlysignature",
    "onlypayload.",
    "..",
  ];

  for (const token of cases) {
    assert.equal(
      verifySessionToken(token, SECRET),
      null,
      `expected null for token: ${String(token)}`,
    );
  }
});

test("verifySessionToken rejects a structurally invalid payload", () => {
  // Correctly signed, but the payload is missing required fields / has a bad role.
  const badPayloads = [
    { sub: "u1", iat: 1, exp: 9_999_999_999 }, // no role
    { sub: "u1", role: "superadmin", iat: 1, exp: 9_999_999_999 }, // unknown role
    { sub: "", role: "user", iat: 1, exp: 9_999_999_999 }, // empty subject
    { role: "user", iat: 1, exp: 9_999_999_999 }, // no subject
    "just-a-string",
  ];

  for (const bad of badPayloads) {
    const encoded = Buffer.from(JSON.stringify(bad), "utf8").toString("base64url");
    const signature = createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64url");

    assert.equal(
      verifySessionToken(`${encoded}.${signature}`, SECRET),
      null,
      `expected null for payload: ${JSON.stringify(bad)}`,
    );
  }
});

test("createSessionToken refuses to sign without a secret or subject", () => {
  assert.throws(
    () => createSessionToken({ sub: "u1", role: "user" }, ""),
    /without a secret/,
  );
  assert.throws(
    () => createSessionToken({ sub: "", role: "user" }, SECRET),
    /without a subject/,
  );
});
