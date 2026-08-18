import { AppwriteException } from "node-appwrite";

import {
  createAppwriteEmailSession,
  createAppwriteSessionAccount,
  setAppwriteSessionCookie,
} from "@/lib/appwrite-server";
import { athleteUserFromIdentity, normalizeEmail, userJson } from "@/lib/athlete-api/auth";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";
import { ensureProductProfile } from "@/lib/firestore-product";

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const email = normalizeEmail(stringField(body, "email", { min: 3, max: 320 }));
    const password = stringField(body, "password", { min: 1, max: 256 });
    let session;
    try {
      session = await createAppwriteEmailSession(email, password);
    } catch (error) {
      if (error instanceof AppwriteException && [400, 401].includes(error.code)) {
        throw new ApiError(401, "Invalid email or password");
      }
      throw error;
    }

    const identity = await createAppwriteSessionAccount(session.secret).get();
    const profile = await ensureProductProfile({
      userId: identity.$id,
      email: identity.email,
      displayName: identity.name,
    });
    const user = athleteUserFromIdentity(identity, profile);
    if (user.banned) throw new ApiError(403, "Account banned");
    if (user.suspended) throw new ApiError(403, "Account suspended");
    await setAppwriteSessionCookie(session);

    return Response.json({
      access_token: "appwrite-session-cookie",
      token_type: "cookie",
      user: userJson(user),
    });
  } catch (error) {
    return jsonError(error);
  }
}
