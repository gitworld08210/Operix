import User, { UserDocument } from "@/models/User";
import type { User as UserType, UserRole } from "@/types";

import { mapUserObject, type RawUserObject } from "./mapUser";
import { connectToDatabase } from "./mongodbService";

/** Fields accepted when creating a user. */
export interface CreateUserInput {
  email: string;
  name: string;
  /** Encoded scrypt hash from `lib/password.hashPassword` — never plaintext. */
  passwordHash: string;
  role?: UserRole;
}

/**
 * Map a Mongoose User document to the shared, client-safe `User` type. The
 * mapper drops `passwordHash`, so anything returned from this module is safe to
 * serialise into an API response.
 */
function mapUser(doc: UserDocument): UserType {
  const obj = doc.toObject ? doc.toObject() : (doc as any);
  return mapUserObject(obj as RawUserObject);
}

/** Normalise an email for storage and lookup (the schema also lowercases). */
function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Find a user by email, returning the safe `User` shape or `null`.
 * The password hash is not selected.
 */
export async function findUserByEmail(
  email: string,
): Promise<UserType | null> {
  await connectToDatabase();

  const doc = await User.findOne({ email: normaliseEmail(email) });
  return doc ? mapUser(doc) : null;
}

/** Find a user by id, returning the safe `User` shape or `null`. */
export async function findUserById(id: string): Promise<UserType | null> {
  await connectToDatabase();

  // An invalid ObjectId makes findById throw a CastError; treat it as "absent"
  // so a stale/forged session id yields 401 rather than a 500.
  try {
    const doc = await User.findById(id);
    return doc ? mapUser(doc) : null;
  } catch {
    return null;
  }
}

/** Result of a credential lookup: the safe user plus its stored hash. */
export interface UserWithSecret {
  user: UserType;
  /** Encoded scrypt hash, or `undefined` for a user with no password set. */
  passwordHash?: string;
}

/**
 * Look up a user by email *including* the normally-excluded `passwordHash`,
 * for the login path only.
 *
 * The hash is returned separately from the safe `user` object so callers cannot
 * accidentally serialise it: `user` is already stripped, and `passwordHash` has
 * to be reached for deliberately.
 */
export async function findUserCredentialsByEmail(
  email: string,
): Promise<UserWithSecret | null> {
  await connectToDatabase();

  const doc = await User.findOne({ email: normaliseEmail(email) }).select(
    "+passwordHash",
  );
  if (!doc) return null;

  return { user: mapUser(doc), passwordHash: doc.passwordHash };
}

/**
 * Create a user. Returns the safe `User` shape.
 *
 * `role` defaults to `"user"` (enforced again by the schema default) so a
 * self-service signup can never create an administrator.
 */
export async function createUser(
  input: CreateUserInput,
): Promise<UserType> {
  await connectToDatabase();

  const doc = await User.create({
    email: normaliseEmail(input.email),
    name: input.name.trim(),
    passwordHash: input.passwordHash,
    role: input.role ?? "user",
    isPremium: false,
  });

  return mapUser(doc);
}

/**
 * Record a successful sign-in by stamping `lastLogin`. Best-effort: returns the
 * updated user when possible, otherwise `null`. A failure here must not block
 * an otherwise valid login, so callers ignore the result.
 */
export async function touchLastLogin(id: string): Promise<UserType | null> {
  await connectToDatabase();

  try {
    const doc = await User.findByIdAndUpdate(
      id,
      { lastLogin: new Date() },
      { new: true },
    );
    return doc ? mapUser(doc) : null;
  } catch {
    return null;
  }
}

/** Whether a user already exists with the given email. */
export async function emailExists(email: string): Promise<boolean> {
  await connectToDatabase();

  const count = await User.countDocuments({ email: normaliseEmail(email) });
  return count > 0;
}
