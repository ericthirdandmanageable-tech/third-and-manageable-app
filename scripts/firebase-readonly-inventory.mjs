import { applicationDefault, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
    DocumentReference,
    GeoPoint,
    Timestamp,
    getFirestore,
} from "firebase-admin/firestore";

const EXPECTED_PROJECT_ID = "third-and-manageable-app";
const SAMPLE_SIZE = 5;

const usage = `Read-only Firebase production inventory

Required environment:
  FIREBASE_PROJECT_ID=${EXPECTED_PROJECT_ID}
  GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/read-only-service-account.json

The service account should have only:
  roles/datastore.viewer
  roles/firebaseauth.viewer

This command prints aggregate counts, auth provider IDs, collection names, and
sampled field shapes. It never prints document values, emails, Firebase UIDs,
provider subjects, message text, or journal content.
`;

if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage);
    process.exit(0);
}

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

if (projectId !== EXPECTED_PROJECT_ID) {
    throw new Error(
        `Refusing inventory: FIREBASE_PROJECT_ID must be exactly ${EXPECTED_PROJECT_ID}.`,
    );
}

if (!credentialPath) {
    throw new Error(
        "Refusing inventory: GOOGLE_APPLICATION_CREDENTIALS must point to a read-only service-account JSON file stored outside this repository.",
    );
}

if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
    throw new Error(
        "Refusing inventory while a Firebase emulator environment variable is set.",
    );
}

const valueType = (value) => {
    if (value === null) return "null";
    if (value instanceof Timestamp) return "timestamp";
    if (value instanceof DocumentReference) return "reference";
    if (value instanceof GeoPoint) return "geopoint";
    if (Array.isArray(value)) return "array";
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) return "bytes";
    if (value instanceof Date) return "date";
    if (typeof value === "object") return "map";
    return typeof value;
};

const increment = (counts, key) => {
    counts[key] = (counts[key] ?? 0) + 1;
};

const app = initializeApp({
    credential: applicationDefault(),
    projectId,
});

try {
    const auth = getAuth(app);
    const providerCounts = {};
    let authUsers = 0;
    let disabledUsers = 0;
    let emailVerifiedUsers = 0;
    let usersWithoutProviderData = 0;
    let pageToken;

    do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) {
            authUsers += 1;
            if (user.disabled) disabledUsers += 1;
            if (user.emailVerified) emailVerifiedUsers += 1;
            if (user.providerData.length === 0) {
                usersWithoutProviderData += 1;
            }
            for (const provider of user.providerData) {
                increment(providerCounts, provider.providerId);
            }
        }
        pageToken = page.pageToken;
    } while (pageToken);

    const db = getFirestore(app);
    const collections = await db.listCollections();
    const collectionInventory = [];

    for (const collection of collections.sort((a, b) =>
        a.id.localeCompare(b.id),
    )) {
        const [countSnapshot, sampleSnapshot] = await Promise.all([
            collection.count().get(),
            collection.limit(SAMPLE_SIZE).get(),
        ]);
        const fieldTypes = {};

        for (const document of sampleSnapshot.docs) {
            for (const [field, value] of Object.entries(document.data())) {
                fieldTypes[field] ??= new Set();
                fieldTypes[field].add(valueType(value));
            }
        }

        collectionInventory.push({
            collection: collection.id,
            documents: countSnapshot.data().count,
            sampledDocuments: sampleSnapshot.size,
            sampledShape: Object.fromEntries(
                Object.entries(fieldTypes)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([field, types]) => [field, [...types].sort()]),
            ),
        });
    }

    console.log(
        JSON.stringify(
            {
                generatedAt: new Date().toISOString(),
                mode: "read-only aggregate inventory",
                projectId,
                authentication: {
                    users: authUsers,
                    disabledUsers,
                    emailVerifiedUsers,
                    usersWithoutProviderData,
                    providerCounts: Object.fromEntries(
                        Object.entries(providerCounts).sort(([a], [b]) =>
                            a.localeCompare(b),
                        ),
                    ),
                },
                firestore: {
                    collections: collectionInventory,
                },
                privacy:
                    "No document values, emails, UIDs, provider subjects, message text, or journal content are included.",
            },
            null,
            2,
        ),
    );
} finally {
    await deleteApp(app);
}
