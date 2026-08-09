import {
    cert,
    getApp,
    getApps,
    initializeApp,
    type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { createVercelGoogleCredential } from "@/lib/firebase-admin-credential";

// Initialised lazily: Next imports every route module at build time to collect page
// data, so initialising at module scope would make the service-account credentials a
// *build* requirement. Removed entirely at Phase 3 step 20, when Firestore retires.
let db: Firestore | undefined;
let auth: Auth | undefined;

function getAdminApp(): App {
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
                workloadIdentityProviderId:
                    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
            }),
        });
    }

    throw new Error(
        "Firebase Admin is not configured: set either service-account key variables or the Google Workload Identity variables documented in env.example.",
    );
}

export function getAdminDb(): Firestore {
    if (db) return db;

    db = getFirestore(getAdminApp());
    return db;
}

export function getAdminAuth(): Auth {
    if (auth) return auth;

    auth = getAuth(getAdminApp());
    return auth;
}
