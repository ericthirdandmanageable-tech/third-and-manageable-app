const MAX_APPWRITE_JWT_LENGTH = 8192;

export function appwriteJwtFromRequest(
  request?: Request,
): string | null | undefined {
  const authorization = request?.headers.get("authorization");
  if (authorization === null || authorization === undefined) return undefined;
  const match = authorization.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match || match[1].length > MAX_APPWRITE_JWT_LENGTH) return null;
  return match[1];
}
