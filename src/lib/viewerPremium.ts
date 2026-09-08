import { ENV_ADMIN_SUBJECT } from "@/lib/session";
import type { SessionPayload } from "@/lib/session";
import { findUserById } from "@/services/mongodb/userRepository";

/**
 * The premium facts a playback/unlock route needs about the signed-in viewer,
 * resolved from their verified session. Kept separate from the full `User` so
 * the authorisation helpers only receive what they act on.
 */
export interface ViewerPremium {
  isPremium: boolean;
  premiumExpiry?: string;
}

/**
 * Resolve whether the session's subject currently has premium.
 *
 * The env-configured administrator (`ENV_ADMIN_SUBJECT`) has no MongoDB
 * document and is always treated as premium, mirroring `buildEnvAdminUser`, so
 * an admin reviewing content is never blocked by the unlock gate. Every other
 * subject is looked up in the user repository.
 *
 * Returns `null` when the subject cannot be resolved to a real account (deleted
 * user, forged-but-signed id), so callers can fail closed with 401.
 */
export async function resolveViewerPremium(
  session: SessionPayload,
): Promise<ViewerPremium | null> {
  if (session.sub === ENV_ADMIN_SUBJECT) {
    return { isPremium: true };
  }

  const user = await findUserById(session.sub);
  if (!user) return null;

  return { isPremium: user.isPremium, premiumExpiry: user.premiumExpiry };
}
