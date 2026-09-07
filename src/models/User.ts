import mongoose, { Schema, Document } from "mongoose";

/**
 * Mongoose document shape for a user. Mirrors the `User` interface in
 * src/types/index.ts, minus `id` (mapped from `_id`) and
 * `createdAt` (managed by timestamps:true), plus the server-only
 * `passwordHash`.
 *
 * `passwordHash` holds the encoded scrypt string produced by
 * `src/lib/password.ts` (`scrypt$params$salt$hash`) — never a plaintext
 * password. It is declared `select: false` so ordinary queries do not load it;
 * the login path opts in explicitly via `.select("+passwordHash")`. It must
 * never reach an API response (see `mapUserObject`, which drops it).
 */
export interface UserDocument extends Document {
  email: string;
  name: string;
  avatar?: string;
  role: "user" | "admin";
  isPremium: boolean;
  premiumExpiry?: Date;
  lastLogin?: Date;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    avatar: { type: String },
    // Authorisation role. Defaults to the least-privileged value so a new
    // signup can never accidentally be created as an administrator.
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    isPremium: { type: Boolean, default: false },
    premiumExpiry: { type: Date },
    lastLogin: { type: Date },
    // Encoded scrypt hash (never plaintext). Excluded from query results by
    // default; the login path selects it explicitly.
    passwordHash: { type: String, select: false },
  },
  { timestamps: true },
);

const User =
  (mongoose.models.User as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default User;
