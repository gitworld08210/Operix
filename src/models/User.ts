import mongoose, { Schema, Document } from "mongoose";

/**
 * Mongoose document shape for a user. Mirrors the `User` interface in
 * src/types/index.ts, minus `id` (mapped from `_id`) and
 * `createdAt` (managed by timestamps:true).
 *
 * `passwordHash` is included as an optional field for FUTURE auth work. No
 * authentication or password-hashing flow is implemented in this task.
 */
export interface UserDocument extends Document {
  email: string;
  name: string;
  avatar?: string;
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
    isPremium: { type: Boolean, default: false },
    premiumExpiry: { type: Date },
    lastLogin: { type: Date },
    // Optional, reserved for future authentication support. Not used yet.
    passwordHash: { type: String, select: false },
  },
  { timestamps: true },
);

const User =
  (mongoose.models.User as mongoose.Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", UserSchema);

export default User;
