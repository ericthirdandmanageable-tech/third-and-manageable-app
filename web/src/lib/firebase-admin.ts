import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore as getFirebaseAdminFirestore } from "firebase-admin/firestore";
import { Firestore } from "@google-cloud/firestore";
import {
  createVercelGoogleCredential,
  createVercelGoogleExternalAccountConfig,
} from "@/lib/firebase-admin-credential";
import { assertIsolatedIntegrationBoundary } from "@/lib/integration-environment";

// Firebase is the isolated product-data backend for the web preview and the
// mobile staging build. Appwrite remains the identity provider; both clients
// use the Appwrite user ID as the Firestore profile/document owner ID.
let auth: Auth | undefined;
let firestore: Firestore | undefined;

export function getAdminApp(): App {
  assertIsolatedIntegrationBoundary();

  if (getApps().length) return getApp();

  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    GCP_PROJECT_NUMBER,
    GCP_SERVICE_ACCOUNT_EMAIL,
    GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  } = process.env;

  if (!FIREBASE_PROJECT_ID) {
    throw new Error(
      "Firebase Admin is not configured: set FIREBASE_PROJECT_ID (see env.example).",
    );
  }

  if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  const serviceAccountEmail =
    GCP_SERVICE_ACCOUNT_EMAIL || FIREBASE_CLIENT_EMAIL;
  if (
    serviceAccountEmail &&
    GCP_PROJECT_NUMBER &&
    GCP_WORKLOAD_IDENTITY_POOL_ID &&
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
  ) {
    return initializeApp({
      projectId: FIREBASE_PROJECT_ID,
      serviceAccountId: serviceAccountEmail,
      credential: createVercelGoogleCredential({
        projectNumber: GCP_PROJECT_NUMBER,
        serviceAccountEmail,
        workloadIdentityPoolId: GCP_WORKLOAD_IDENTITY_POOL_ID,
        workloadIdentityProviderId: GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
      }),
    });
  }

  throw new Error(
    "Firebase Admin is not configured: set either service-account key variables or the Google Workload Identity variables documented in env.example.",
  );
}

export function getAdminAuth(): Auth {
  if (auth) return auth;

  auth = getAuth(getAdminApp());
  return auth;
}

export function getAdminFirestore(): Firestore {
  if (firestore) return firestore;

  const app = getAdminApp();
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
    GCP_PROJECT_NUMBER,
    GCP_SERVICE_ACCOUNT_EMAIL,
    GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
  } = process.env;

  if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    firestore = getFirebaseAdminFirestore(app);
    return firestore;
  }

  const serviceAccountEmail = GCP_SERVICE_ACCOUNT_EMAIL || FIREBASE_CLIENT_EMAIL;
  if (
    FIREBASE_PROJECT_ID &&
    serviceAccountEmail &&
    GCP_PROJECT_NUMBER &&
    GCP_WORKLOAD_IDENTITY_POOL_ID &&
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
  ) {
    firestore = new Firestore({
      projectId: FIREBASE_PROJECT_ID,
      // The configuration is fully constructed in this application (never
      // accepted from a request). GoogleAuth consumes it as a standard
      // external-account credential and preserves the request-scoped supplier.
      credentials: createVercelGoogleExternalAccountConfig({
        projectNumber: GCP_PROJECT_NUMBER,
        projectId: FIREBASE_PROJECT_ID,
        serviceAccountEmail,
        workloadIdentityPoolId: GCP_WORKLOAD_IDENTITY_POOL_ID,
        workloadIdentityProviderId: GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
      }) as never,
    });
    return firestore;
  }

  // getAdminApp() provides the user-facing configuration error for unsupported
  // combinations, so this branch is defensive rather than an alternate path.
  throw new Error("Firestore Admin credentials are unavailable.");
}

/**
 * Resolve the short-lived Google credential before issuing a Firestore RPC.
 * This keeps the readiness probe diagnostic: a failed federation exchange is
 * distinguishable in server logs from a Firestore authorization/read failure,
 * while neither token nor provider response is exposed to the client.
 */
export async function probeAdminCredential(): Promise<void> {
  const credential = getAdminApp().options.credential;
  if (!credential) {
    throw new Error("Firebase Admin credential is unavailable");
  }
  await credential.getAccessToken();
}
