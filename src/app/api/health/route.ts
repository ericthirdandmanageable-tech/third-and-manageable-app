import { Query, Users } from "node-appwrite";

import { createAppwriteAdminClient } from "@/lib/appwrite-server";
import {
  getAdminFirestore,
  probeAdminCredential,
} from "@/lib/firebase-admin";
import { integrationEnvironment } from "@/lib/integration-environment";

export async function GET() {
  let environment: ReturnType<typeof integrationEnvironment> | "unknown" = "unknown";
  let stage = "environment";
  try {
    environment = integrationEnvironment();
    stage = "appwrite";
    await new Users(createAppwriteAdminClient()).list({ queries: [Query.limit(1)] });
    stage = "google_workload_identity";
    await probeAdminCredential();
    stage = "firestore";
    await getAdminFirestore().collection("profiles").limit(1).get();

    return Response.json({
      status: "ok",
      backend: "appwrite-firestore",
      integration_environment: environment,
    });
  } catch (error) {
    const diagnostic = error as {
      code?: string | number;
      details?: string;
      message?: string;
      name?: string;
    };
    console.error("Backend readiness check failed", {
      stage,
      name: diagnostic?.name ?? "Error",
      code: diagnostic?.code ?? "unknown",
      // Firestore's permission errors contain the denied permission/resource,
      // which is needed to distinguish an IAM role from an API/database issue.
      // Never include upstream messages for identity-exchange stages because
      // those can carry request or token context.
      ...(stage.startsWith("firestore")
        ? {
            details: String(
              diagnostic?.details || diagnostic?.message || "unknown",
            )
              .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
              .slice(0, 500),
          }
        : {}),
    });
    return Response.json(
      {
        status: "degraded",
        backend: "appwrite-firestore",
        integration_environment: environment,
        reason: "backend_unavailable",
      },
      { status: 503 },
    );
  }
}
