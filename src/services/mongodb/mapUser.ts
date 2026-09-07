import type { User as UserType, UserRole } from "@/types";

/**
 * A plain-object view of a persisted user, i.e. the result of calling
 * `.toObject()` on a Mongoose User document (or an equivalent lean object).
 * Kept dependency-free (no mongoose import) so the pure mapping below can be
 * unit-tested offline without the uninstallable driver.
 *
 * `passwordHash` is present here because it may exist on the raw document
 * (when explicitly selected) — the mapper's job is to drop it.
 */
export interface RawUserObject {
  _id: unknown;
  email: string;
  name: string;
  avatar?: string;
  role?: string;
  isPremium?: boolean;
  premiumExpiry?: Date | string;
  lastLogin?: Date | string;
  passwordHash?: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
}

/** Serialise a Date to ISO, pass strings through, map absent values to undefined. */
function toIsoString(value: Date | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Narrow an arbitrary stored role string to a known {@link UserRole}, falling
 * back to the least-privileged `"user"`. Unknown or missing values must never
 * be treated as `admin` — that fallback direction is a security property, not a
 * convenience.
 */
function toRole(value: string | undefined): UserRole {
  return value === "admin" ? "admin" : "user";
}

/**
 * Pure mapping from a persisted user object to the shared, client-safe `User`
 * type: converts `_id` to a string `id`, normalises the role, defaults
 * `isPremium`, serialises Date timestamps to ISO strings, and — critically —
 * **omits `passwordHash`** so credential material can never escape through an
 * API response or into client state.
 *
 * This is intentionally free of any mongoose dependency so it can be exercised
 * by offline unit tests (see mapUser.test.ts).
 */
export function mapUserObject(obj: RawUserObject): UserType {
  return {
    id: String(obj._id),
    email: obj.email,
    name: obj.name,
    avatar: obj.avatar,
    role: toRole(obj.role),
    isPremium: obj.isPremium ?? false,
    premiumExpiry: toIsoString(obj.premiumExpiry),
    createdAt: toIsoString(obj.createdAt) as string,
    lastLogin: toIsoString(obj.lastLogin),
  };
}
