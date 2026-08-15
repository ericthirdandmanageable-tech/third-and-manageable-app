import type { Models } from "node-appwrite";

import { currentAppwriteAccount } from "@/lib/appwrite-server";
import {
  ensureProductProfile,
  getProductProfile,
  type ProductProfile,
} from "@/lib/firestore-product";

import { ApiError } from "./http";
import { normalizeEmail } from "./identity";

export interface AthleteUser {
  id: string;
  email: string | null;
  displayName: string;
  school: string | null;
  status: "competing" | "transitioning" | "transitioned";
  headline: string | null;
  verified: boolean;
  verificationRequested: boolean;
  verificationRequestedAt: Date | null;
  suspended: boolean;
  banned: boolean;
  chatBanned: boolean;
  createdAt: Date;
  deletedAt: Date | null;
}

export { normalizeEmail };

function transitionStatus(profile: ProductProfile): AthleteUser["status"] {
  if (
    profile.transition_status === "competing" ||
    profile.transition_status === "transitioning" ||
    profile.transition_status === "transitioned"
  ) {
    return profile.transition_status;
  }
  return profile.athlete_status === "current" ? "competing" : "transitioning";
}

function dateValue(value: unknown, fallback?: string): Date {
  const parsed = new Date(typeof value === "string" ? value : fallback || 0);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function athleteUserFromIdentity(
  identity: Models.User,
  profile: ProductProfile,
): AthleteUser {
  return {
    id: identity.$id,
    email: identity.email || profile.email || null,
    displayName: profile.display_name || identity.name || "Athlete",
    school: profile.school || null,
    status: transitionStatus(profile),
    headline: profile.headline || null,
    verified: profile.verified === true,
    verificationRequested: profile.verification_requested === true,
    verificationRequestedAt: profile.verification_requested_at
      ? dateValue(profile.verification_requested_at)
      : null,
    suspended: profile.suspended === true,
    banned: profile.banned === true || identity.status === false,
    chatBanned: profile.chat_banned === true,
    createdAt: dateValue(profile.joined_at, identity.$createdAt),
    deletedAt: profile.deleted_at ? dateValue(profile.deleted_at) : null,
  };
}

async function currentUser(request?: Request): Promise<AthleteUser | null> {
  const identity = await currentAppwriteAccount(request);
  if (!identity) return null;

  const profile =
    (await getProductProfile(identity.$id)) ??
    (await ensureProductProfile({
      userId: identity.$id,
      email: identity.email,
      displayName: identity.name,
    }));
  return athleteUserFromIdentity(identity, profile);
}

export async function optionalUser(request?: Request): Promise<AthleteUser | null> {
  const user = await currentUser(request);
  if (!user || user.deletedAt || user.banned || user.suspended) return null;
  return user;
}

export async function requireUser(request?: Request): Promise<AthleteUser> {
  const user = await currentUser(request);
  if (!user || user.deletedAt) throw new ApiError(401, "Not authenticated");
  if (user.banned) throw new ApiError(403, "Account banned");
  if (user.suspended) throw new ApiError(403, "Account suspended");
  return user;
}

export async function requireVerifiedUser(request?: Request): Promise<AthleteUser> {
  const user = await requireUser(request);
  if (!user.verified) throw new ApiError(403, "Athlete verification pending");
  if (user.chatBanned) throw new ApiError(403, "Community access revoked");
  return user;
}

export function userJson(user: AthleteUser) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    school: user.school,
    status: user.status,
    headline: user.headline,
    verified: user.verified,
    verification_requested: user.verificationRequested,
    verification_requested_at: user.verificationRequestedAt?.toISOString() ?? null,
  };
}
