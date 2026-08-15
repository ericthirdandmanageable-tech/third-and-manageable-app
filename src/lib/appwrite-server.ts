import { Account, AppwriteException, Client, ID, Storage, Users, type Models } from "node-appwrite";
import { cookies } from "next/headers";

import { appwriteJwtFromRequest } from "@/lib/appwrite-auth-token";
import { assertIsolatedIntegrationBoundary } from "@/lib/integration-environment";

const COOKIE_PREFIX = "a_session_";

export { appwriteJwtFromRequest } from "@/lib/appwrite-auth-token";

interface AppwriteServerConfiguration {
  endpoint: string;
  projectId: string;
  apiKey?: string;
}

export function appwriteServerConfiguration(
  options: { requireApiKey?: boolean } = {},
): AppwriteServerConfiguration {
  assertIsolatedIntegrationBoundary();

  const endpoint = process.env.APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  const apiKey = process.env.APPWRITE_API_KEY?.trim();

  if (!endpoint || !projectId) {
    throw new Error("Appwrite is not configured");
  }
  if (options.requireApiKey && !apiKey) {
    throw new Error("Appwrite SSR is not configured: APPWRITE_API_KEY is missing");
  }

  return { endpoint, projectId, apiKey };
}

export function appwriteSessionCookieName(): string {
  const projectId = process.env.APPWRITE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("Appwrite is not configured");
  return `${COOKIE_PREFIX}${projectId}`;
}

function client(configuration: AppwriteServerConfiguration): Client {
  const value = new Client()
    .setEndpoint(configuration.endpoint)
    .setProject(configuration.projectId);
  if (configuration.apiKey) value.setKey(configuration.apiKey);
  return value;
}

export function createAppwriteAdminClient(): Client {
  return client(appwriteServerConfiguration({ requireApiKey: true }));
}

export function createAppwriteAdminAccount(): Account {
  return new Account(createAppwriteAdminClient());
}

export function createAppwriteAdminStorage(): Storage {
  return new Storage(createAppwriteAdminClient());
}

export async function setAppwriteUserStatus(userId: string, status: boolean): Promise<void> {
  await new Users(createAppwriteAdminClient()).updateStatus({ userId, status });
}

export async function deleteAppwriteUser(userId: string): Promise<void> {
  await new Users(createAppwriteAdminClient()).delete({ userId });
}

export function createAppwriteSessionAccount(sessionSecret: string): Account {
  const configuration = appwriteServerConfiguration();
  // A session-scoped Account client must not also send the project API key.
  // Appwrite otherwise evaluates the request as a key-scoped server call and
  // rejects Account.get() with general_unauthorized_scope.
  return new Account(
    client({ ...configuration, apiKey: undefined }).setSession(sessionSecret),
  );
}

export function createAppwriteJwtAccount(jwt: string): Account {
  const configuration = appwriteServerConfiguration();
  return new Account(
    client({ ...configuration, apiKey: undefined }).setJWT(jwt),
  );
}

export async function currentAppwriteAccount(
  request?: Request,
): Promise<Models.User | null> {
  const jwt = appwriteJwtFromRequest(request);
  if (jwt === null) return null;
  if (jwt !== undefined) {
    try {
      return await createAppwriteJwtAccount(jwt).get();
    } catch (error) {
      if (error instanceof AppwriteException && [401, 403].includes(error.code)) {
        return null;
      }
      throw error;
    }
  }

  const cookieStore = await cookies();
  const secret = cookieStore.get(appwriteSessionCookieName())?.value;
  if (!secret) return null;

  try {
    return await createAppwriteSessionAccount(secret).get();
  } catch (error) {
    if (error instanceof AppwriteException && [401, 403].includes(error.code)) {
      return null;
    }
    throw error;
  }
}

export async function createAppwriteEmailSession(
  email: string,
  password: string,
): Promise<Models.Session> {
  return createAppwriteAdminAccount().createEmailPasswordSession({ email, password });
}

export async function createAppwriteAccount(input: {
  email: string;
  password: string;
  name: string;
}): Promise<Models.User> {
  return createAppwriteAdminAccount().create({
    userId: ID.unique(),
    email: input.email,
    password: input.password,
    name: input.name,
  });
}

export async function createAppwriteRecovery(email: string, url: string): Promise<void> {
  await createAppwriteAdminAccount().createRecovery({ email, url });
}

export async function updateAppwriteRecovery(
  userId: string,
  secret: string,
  password: string,
): Promise<void> {
  await createAppwriteAdminAccount().updateRecovery({ userId, secret, password });
}

export async function setAppwriteSessionCookie(session: Models.Session): Promise<void> {
  if (!session.secret) {
    throw new Error("Appwrite did not return an SSR session secret");
  }

  const cookieStore = await cookies();
  cookieStore.set(appwriteSessionCookieName(), session.secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(session.expire),
    path: "/",
    priority: "high",
  });
}

export async function clearAppwriteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(appwriteSessionCookieName());
}

export async function deleteCurrentAppwriteSession(): Promise<void> {
  const cookieStore = await cookies();
  const secret = cookieStore.get(appwriteSessionCookieName())?.value;
  if (!secret) return;

  try {
    await createAppwriteSessionAccount(secret).deleteSession({ sessionId: "current" });
  } catch (error) {
    if (!(error instanceof AppwriteException) || ![401, 404].includes(error.code)) {
      throw error;
    }
  } finally {
    cookieStore.delete(appwriteSessionCookieName());
  }
}
