import { AppwriteException } from "node-appwrite";

import { createAppwriteRecovery } from "@/lib/appwrite-server";
import { ApiError, jsonError, readObject, stringField } from "@/lib/athlete-api/http";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function recoveryUrl(): string {
  const configuredUrl = process.env.APP_PUBLIC_URL?.trim();
  const vercelUrl = process.env.VERCEL_URL?.trim();
  const baseUrl = configuredUrl || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return new URL("/reset-password", baseUrl).toString();
}

export async function POST(request: Request) {
  try {
    const body = await readObject(request);
    const email = stringField(body, "email", { min: 3, max: 320 }).trim().toLowerCase();
    if (!EMAIL.test(email)) throw new ApiError(422, "email must be valid");

    try {
      await createAppwriteRecovery(email, recoveryUrl());
    } catch (error) {
      // Do not reveal whether an email belongs to an account.
      if (error instanceof AppwriteException && [400, 404].includes(error.code)) {
        return Response.json({ status: "ok" });
      }
      throw error;
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    return jsonError(error);
  }
}
