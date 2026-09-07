/**
 * Minimal, dependency-free `Cookie:` header parsing.
 *
 * Kept in its own module with zero imports so it can be unit-tested offline
 * (see cookies.test.ts) and reused from any runtime — including
 * `lib/adminAuth.ts`, which must read a session cookie from a plain `Request`
 * synchronously, without pulling in `next/headers`.
 */

/**
 * Parse a `Cookie:` request header into a name -> value map.
 *
 * Values are URI-decoded when possible (a malformed escape sequence is kept
 * verbatim rather than throwing). Later duplicates do not overwrite earlier
 * ones, matching how servers conventionally treat the first occurrence as
 * authoritative — this matters because a duplicate cookie is a known
 * session-fixation trick.
 *
 * @param header - Raw header value, or `null`/`undefined` when absent.
 * @returns A map of cookie names to values (empty when the header is absent).
 */
export function parseCookieHeader(
  header: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const segment of header.split(";")) {
    const separator = segment.indexOf("=");
    // A segment with no "=" is not a name/value pair; skip it.
    if (separator < 1) continue;

    const name = segment.slice(0, separator).trim();
    if (!name) continue;
    // First occurrence wins.
    if (Object.prototype.hasOwnProperty.call(out, name)) continue;

    let value = segment.slice(separator + 1).trim();
    // Strip optional surrounding double quotes (RFC 6265 quoted values).
    if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }

  return out;
}

/**
 * Read a single cookie value from a `Cookie:` header.
 *
 * @returns The value, or `undefined` when the cookie is not present.
 */
export function readCookie(
  header: string | null | undefined,
  name: string,
): string | undefined {
  if (!header || !name) return undefined;
  return parseCookieHeader(header)[name];
}
