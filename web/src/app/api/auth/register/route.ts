import { AppwriteException } from "node-appwrite";

import {
  createAppwriteAccount,
  createAppwriteEmailSession,
  createAppwriteSessionAccount,
  deleteAppwriteUser,
  setAppwriteSessionCookie,
} from "@/lib/appwrite-server";
import { athleteUserFromIdentity, normalizeEmail, userJson } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { ensureProductProfile } from "@/lib/firestore-product";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = new Set(["competing", "transitioning", "transitioned"]);

export async function POST(request: Request) {
  let createdUserId: string | undefined;
  let stage = "validation";
  try {
    const body = await readObject(request);
    const email = normalizeEmail(stringField(body, "email", { min: 3, max: 320 }));
    const password = stringField(body, "password", { min: 8, max: 256 });
    const displayName = stringField(body, "display_name", { min: 1, max: 40 });
    const school = stringField(body, "school", { optional: true, max: 160 });
    const status = stringField(body, "status", { optional: true }) ?? "transitioning";
    if (!EMAIL.test(email)) throw new ApiError(422, "email must be valid");
    if (!STATUSES.has(status)) throw new ApiError(422, "status is invalid");

    try {
      stage = "appwrite_account";
      const createdIdentity = await createAppwriteAccount({
        email,
        password,
        name: displayName,
      });
      createdUserId = createdIdentity.$id;
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 409) {
        throw new ApiError(400, "Email already registered");
      }
      throw error;
    }

    stage = "appwrite_session";
    const session = await createAppwriteEmailSession(email, password);
    stage = "appwrite_identity";
    const identity = await createAppwriteSessionAccount(session.secret).get();
    stage = "firestore_profile";
    const profile = await ensureProductProfile({
      userId: identity.$id,
      email,
      displayName,
      school: school || null,
      transitionStatus: status,
    });
    const user = athleteUserFromIdentity(identity, profile);
    stage = "session_cookie";
    await setAppwriteSessionCookie(session);
    return Response.json({
      access_token: "appwrite-session-cookie",
      token_type: "cookie",
      user: userJson(user),
    });
  } catch (error) {
    if (createdUserId) {
      await deleteAppwriteUser(createdUserId).catch(() => {
        console.error("Registration rollback failed", { stage });
      });
    }
    if (!(error instanceof ApiError)) {
      const diagnostic = error as {
        code?: string | number;
        details?: unknown;
        message?: unknown;
        name?: string;
        type?: string;
      };
      console.error("Registration failed", {
        stage,
        name: diagnostic?.name ?? "Error",
        code: diagnostic?.code ?? "unknown",
        type: diagnostic?.type ?? "unknown",
        details: String(
          diagnostic?.details || diagnostic?.message || "unknown",
        ).slice(0, 300),
      });
    }
    return jsonError(error);
  }
}
