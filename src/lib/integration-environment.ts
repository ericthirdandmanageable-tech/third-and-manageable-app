const STAGING_APPWRITE_PROJECT_ID = "69906dfc003364b9847e";
const STAGING_FIREBASE_PROJECT_ID = "third-and-manageable-staging";

export type IntegrationEnvironment = "staging" | "production" | "disabled";

export function integrationEnvironment(): IntegrationEnvironment {
  const value = (process.env.INTEGRATION_ENVIRONMENT ?? "disabled")
    .trim()
    .toLowerCase();

  if (value === "staging" || value === "production" || value === "disabled") {
    return value;
  }

  throw new Error("INTEGRATION_ENVIRONMENT must be staging, production, or disabled");
}

/**
 * The redesign is intentionally a staging client. A Preview deployment must
 * never silently inherit production mobile credentials, and a Production
 * deployment must not publish against staging by accident.
 */
export function assertIsolatedIntegrationBoundary(): void {
  const environment = integrationEnvironment();
  const vercelEnvironment = (process.env.VERCEL_ENV ?? "").trim().toLowerCase();

  if (vercelEnvironment === "preview" && environment !== "staging") {
    throw new Error("Vercel Preview requires INTEGRATION_ENVIRONMENT=staging");
  }

  if (vercelEnvironment === "production" && environment === "staging") {
    throw new Error("Vercel Production cannot use staging integrations");
  }

  if (environment === "disabled") {
    throw new Error("Appwrite/Firebase integrations are disabled");
  }

  if (environment === "staging") {
    if (process.env.APPWRITE_PROJECT_ID !== STAGING_APPWRITE_PROJECT_ID) {
      throw new Error("Staging must use the isolated Appwrite project");
    }
    if (process.env.FIREBASE_PROJECT_ID !== STAGING_FIREBASE_PROJECT_ID) {
      throw new Error("Staging must use the isolated Firebase project");
    }
  }
}

export const isolatedStagingProjects = Object.freeze({
  appwrite: STAGING_APPWRITE_PROJECT_ID,
  firebase: STAGING_FIREBASE_PROJECT_ID,
});
