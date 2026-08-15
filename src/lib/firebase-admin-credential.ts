import { getVercelOidcToken } from "@vercel/oidc";
import type { Credential, GoogleOAuthAccessToken } from "firebase-admin/app";
import {
    ExternalAccountClient,
    GoogleAuth,
    type ExternalAccountClientOptions,
} from "google-auth-library";

export interface VercelGoogleWorkloadIdentityConfig {
    projectNumber: string;
    projectId?: string;
    serviceAccountEmail: string;
    workloadIdentityPoolId: string;
    workloadIdentityProviderId: string;
}

const GOOGLE_STS_TOKEN_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_CLOUD_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const FIREBASE_TOKEN_CACHE_SECONDS = 50 * 60;

export function createVercelGoogleExternalAccountConfig(
    config: VercelGoogleWorkloadIdentityConfig,
): ExternalAccountClientOptions {
    const providerAudience =
        `//iam.googleapis.com/projects/${config.projectNumber}` +
        `/locations/global/workloadIdentityPools/${config.workloadIdentityPoolId}` +
        `/providers/${config.workloadIdentityProviderId}`;

    return {
        type: "external_account",
        audience: providerAudience,
        subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
        token_url: GOOGLE_STS_TOKEN_URL,
        service_account_impersonation_url:
            "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/" +
            `${config.serviceAccountEmail}:generateAccessToken`,
        service_account_impersonation: {
            token_lifetime_seconds: 3600,
        },
        scopes: [GOOGLE_CLOUD_SCOPE],
        subject_token_supplier: {
            getSubjectToken: async () => {
                try {
                    // Firebase Admin's server bundle resolves Vercel's browser
                    // declaration, whose request-scoped token accessor accepts
                    // no options. The deployment-provided token is already
                    // refreshed by Vercel for each invocation.
                    return await getVercelOidcToken();
                } catch {
                    // Never log the OIDC token or vendor error: either can carry
                    // request context. The stage marker is sufficient for
                    // production diagnosis without exposing credentials.
                    console.error("Vercel OIDC subject token unavailable");
                    throw new Error("Vercel OIDC subject token unavailable");
                }
            },
        },
    };
}

function createExternalAccountClient(
    config: VercelGoogleWorkloadIdentityConfig,
) {
    const client = ExternalAccountClient.fromJSON(
        createVercelGoogleExternalAccountConfig(config),
    );

    if (!client) {
        throw new Error("Unable to initialize Google Workload Identity credentials.");
    }

    return client;
}

export function createVercelGoogleAuthClient(
    config: VercelGoogleWorkloadIdentityConfig,
) {
    return createExternalAccountClient(config);
}

/**
 * Adapts Vercel's request-scoped OIDC identity to the Credential interface used
 * by Firebase Admin. Google exchanges the short-lived Vercel assertion and then
 * impersonates the narrowly scoped staging service account; no private key is
 * downloaded or stored in Vercel.
 */
export function createVercelGoogleCredential(
    config: VercelGoogleWorkloadIdentityConfig,
): Credential {
    const client = createExternalAccountClient(config);

    return {
        async getAccessToken(): Promise<GoogleOAuthAccessToken> {
            let result;
            try {
                result = await client.getAccessToken();
            } catch {
                // Keep deployed logs token-free while still identifying the
                // failed provider stage.
                console.error("Google Workload Identity exchange unavailable");
                throw new Error("Google Workload Identity exchange unavailable");
            }

            if (!result.token) {
                throw new Error(
                    "Google Workload Identity exchange returned no access token.",
                );
            }

            return {
                access_token: result.token,
                // Firebase refreshes five minutes before this cache deadline. The
                // underlying Google client also independently refreshes its token.
                expires_in: FIREBASE_TOKEN_CACHE_SECONDS,
            };
        },
    };
}

/**
 * Firestore's Admin adapter only accepts certificate credentials or its own
 * Application Default Credential class. The native Google Cloud client does
 * accept a GoogleAuth instance, so expose the same federated client through
 * that supported path without introducing a service-account private key.
 */
export function createVercelGoogleAuth(
    config: VercelGoogleWorkloadIdentityConfig,
): GoogleAuth {
    return new GoogleAuth({
        authClient: createExternalAccountClient(config),
        projectId: config.projectId,
        scopes: [GOOGLE_CLOUD_SCOPE],
    });
}
