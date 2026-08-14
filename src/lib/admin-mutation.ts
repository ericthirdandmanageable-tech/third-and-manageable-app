import { randomUUID } from "node:crypto";

import { adminAuditLogs } from "@/lib/db/schema";
import {
  withNeonTransaction,
  type NeonTransaction,
} from "@/lib/db/transaction";

export class AdminMutationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
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
  mutate: (tx: NeonTransaction) => Promise<T>,
): Promise<T> {
  return withNeonTransaction(async (tx) => {
    const result = await mutate(tx);
    const targetWasFound = !Array.isArray(result) || result.length > 0;
    await tx.insert(adminAuditLogs).values({
      action: details.action,
      targetType: details.targetType,
      targetId: details.targetId,
      outcome: targetWasFound ? "succeeded" : "denied",
      requestId:
        request.headers.get("x-vercel-id") ||
        request.headers.get("x-request-id") ||
        randomUUID(),
      metadata: targetWasFound
        ? details.metadata
        : { ...details.metadata, reason: "target_not_found" },
    });
    return result;
  });
}
