import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCookieHeader, readCookie } from "./cookies.ts";

test("parses a single cookie pair", () => {
  assert.deepEqual(parseCookieHeader("ott_session=abc123"), {
    ott_session: "abc123",
  });
});

test("parses multiple cookies and trims surrounding whitespace", () => {
  assert.deepEqual(parseCookieHeader("a=1; b=2;   c=3"), {
    a: "1",
    b: "2",
    c: "3",
  });
});

test("returns an empty map for absent or empty headers", () => {
  assert.deepEqual(parseCookieHeader(null), {});
  assert.deepEqual(parseCookieHeader(undefined), {});
  assert.deepEqual(parseCookieHeader(""), {});
});

test("URI-decodes values", () => {
  assert.equal(parseCookieHeader("k=a%20b%3Dc").k, "a b=c");
});

test("keeps a malformed escape sequence verbatim instead of throwing", () => {
  assert.equal(parseCookieHeader("k=%E0%A4%A").k, "%E0%A4%A");
});

test("strips RFC 6265 quoted-value quotes", () => {
  assert.equal(parseCookieHeader('k="quoted"').k, "quoted");
});

test("preserves '=' inside a value (base64url tokens are safe, JWT-ish are too)", () => {
  assert.equal(parseCookieHeader("t=payload.sig==").t, "payload.sig==");
});

test("skips segments without a name/value separator", () => {
  assert.deepEqual(parseCookieHeader("novalue; a=1; =noname"), { a: "1" });
});

test("first occurrence of a duplicated cookie wins", () => {
  // A duplicated cookie is a session-fixation trick; the first must be kept.
  assert.equal(parseCookieHeader("s=first; s=second").s, "first");
});

test("readCookie returns the named value or undefined", () => {
  const header = "ott_session=tok; other=x";

  assert.equal(readCookie(header, "ott_session"), "tok");
  assert.equal(readCookie(header, "missing"), undefined);
  assert.equal(readCookie(null, "ott_session"), undefined);
  assert.equal(readCookie(header, ""), undefined);
});
