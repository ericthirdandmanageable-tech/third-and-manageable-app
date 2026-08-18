import { randomUUID } from "node:crypto";

import { appendAuditEvent } from "@/lib/firestore-product";

export class AdminMutationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Accepts Appwrite IDs, Firestore auto IDs, and existing UUIDs; never paths. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._-]+$/.test(value)
  );
}

export async function auditedAdminMutation<T>(
  request: Request,
  details: {
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  },
  mutate: () => Promise<T>,
): Promise<T> {
  const requestId =
    request.headers.get("x-vercel-id") ||
    request.headers.get("x-request-id") ||
    randomUUID();
  try {
    const result = await mutate();
    const targetWasFound = !Array.isArray(result) || result.length > 0;
    await appendAuditEvent({
      action: details.action,
      targetType: details.targetType,
      targetId: details.targetId,
      requestId,
      outcome: targetWasFound ? "succeeded" : "denied",
      metadata: targetWasFound
        ? details.metadata
        : { ...details.metadata, reason: "target_not_found" },
    });
    return result;
  } catch (error) {
    await appendAuditEvent({
      action: details.action,
      targetType: details.targetType,
      targetId: details.targetId,
      requestId,
      outcome: "failed",
      metadata: details.metadata,
    }).catch(() => undefined);
    throw error;
  }
}
