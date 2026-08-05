import {
    cert,
    getApp,
    getApps,
    initializeApp,
    type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Initialised lazily: Next imports every route module at build time to collect page
// data, so initialising at module scope would make the service-account credentials a
// *build* requirement. Removed entirely at Phase 3 step 20, when Firestore retires.
let db: Firestore | undefined;
let auth: Auth | undefined;

function getAdminApp(): App {
    if (getApps().length) return getApp();

    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
        process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error(
            "Firebase Admin is not configured: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (see env.example).",
        );
    }

    return initializeApp({
        credential: cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
    });
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
