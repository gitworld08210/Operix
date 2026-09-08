import assert from "node:assert/strict";
import { test } from "node:test";

import { mapUserObject, type RawUserObject } from "./mapUser.ts";

/**
 * Offline unit tests for the pure `_id -> id` user mapping. These use only Node
 * built-ins and import `mapUserObject`, which has no runtime dependency on
 * mongoose/next (its only import is a type-only `@/types`, erased at runtime).
 *
 * The most important assertion here is negative: the mapper must never carry
 * `passwordHash` into the client-safe shape.
 */

function baseRaw(overrides: Partial<RawUserObject> = {}): RawUserObject {
  return {
    _id: "507f1f77bcf86cd799439011",
    email: "viewer@example.com",
    name: "Viewer",
    role: "user",
    isPremium: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

test("maps _id to a string id", () => {
  const mapped = mapUserObject(baseRaw({ _id: { toString: () => "abc123" } }));

  assert.equal(mapped.id, "abc123");
});

test("NEVER exposes passwordHash in the mapped user", () => {
  const mapped = mapUserObject(
    baseRaw({ passwordHash: "scrypt$N=16384,r=8,p=1$c2FsdA$aGFzaA" }),
  );

  assert.equal(
    "passwordHash" in mapped,
    false,
    "mapped user must not carry passwordHash",
  );
  assert.equal(
    JSON.stringify(mapped).includes("scrypt"),
    false,
    "serialised user must not contain any hash material",
  );
});

test("preserves an explicit admin role", () => {
  const mapped = mapUserObject(baseRaw({ role: "admin" }));

  assert.equal(mapped.role, "admin");
});

test("defaults an unknown, empty or missing role to 'user' (never admin)", () => {
  assert.equal(mapUserObject(baseRaw({ role: "superuser" })).role, "user");
  assert.equal(mapUserObject(baseRaw({ role: "" })).role, "user");
  assert.equal(mapUserObject(baseRaw({ role: undefined })).role, "user");
  assert.equal(mapUserObject(baseRaw({ role: "ADMIN" })).role, "user");
});

test("defaults a missing isPremium to false", () => {
  assert.equal(mapUserObject(baseRaw({ isPremium: undefined })).isPremium, false);
  assert.equal(mapUserObject(baseRaw({ isPremium: true })).isPremium, true);
});

test("serialises Date timestamps to ISO strings", () => {
  const mapped = mapUserObject(
    baseRaw({
      createdAt: new Date("2026-03-04T05:06:07.000Z"),
      lastLogin: new Date("2026-03-05T00:00:00.000Z"),
      premiumExpiry: new Date("2026-04-01T00:00:00.000Z"),
    }),
  );

  assert.equal(mapped.createdAt, "2026-03-04T05:06:07.000Z");
  assert.equal(mapped.lastLogin, "2026-03-05T00:00:00.000Z");
  assert.equal(mapped.premiumExpiry, "2026-04-01T00:00:00.000Z");
});

test("passes through timestamps that are already strings", () => {
  const mapped = mapUserObject(
    baseRaw({ createdAt: "2026-01-01T00:00:00.000Z", lastLogin: "later" }),
  );

  assert.equal(mapped.createdAt, "2026-01-01T00:00:00.000Z");
  assert.equal(mapped.lastLogin, "later");
});

test("leaves optional fields undefined when absent", () => {
  const mapped = mapUserObject(baseRaw());

  assert.equal(mapped.avatar, undefined);
  assert.equal(mapped.lastLogin, undefined);
  assert.equal(mapped.premiumExpiry, undefined);
});

test("carries email, name and avatar through unchanged", () => {
  const mapped = mapUserObject(
    baseRaw({
      email: "someone@example.com",
      name: "Some One",
      avatar: "https://cdn.example.com/a.png",
    }),
  );

  assert.equal(mapped.email, "someone@example.com");
  assert.equal(mapped.name, "Some One");
  assert.equal(mapped.avatar, "https://cdn.example.com/a.png");
});
