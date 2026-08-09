import { beforeEach, describe, expect, it, vi } from "vitest";

const credentialMocks = vi.hoisted(() => ({
    fromJSON: vi.fn(),
    getAccessToken: vi.fn(),
    getVercelOidcToken: vi.fn(),
}));

vi.mock("@vercel/oidc", () => ({
    getVercelOidcToken: credentialMocks.getVercelOidcToken,
}));

vi.mock("google-auth-library", () => ({
    ExternalAccountClient: {
        fromJSON: credentialMocks.fromJSON,
    },
}));

import { createVercelGoogleCredential } from "@/lib/firebase-admin-credential";

describe("Vercel OIDC Firebase Admin credential", () => {
    beforeEach(() => {
        credentialMocks.fromJSON.mockReset();
        credentialMocks.getAccessToken.mockReset();
        credentialMocks.getVercelOidcToken.mockReset();
        credentialMocks.fromJSON.mockReturnValue({
            getAccessToken: credentialMocks.getAccessToken,
        });
    });

    it("scopes the Google exchange to the configured pool and service account", async () => {
        credentialMocks.getVercelOidcToken.mockResolvedValue("vercel-oidc-token");
        credentialMocks.getAccessToken.mockResolvedValue({ token: "google-token" });

        const credential = createVercelGoogleCredential({
            projectNumber: "123456789",
            serviceAccountEmail:
                "vercel-preview@staging-project.iam.gserviceaccount.com",
            workloadIdentityPoolId: "vercel",
            workloadIdentityProviderId: "vercel",
        });

        const externalConfig = credentialMocks.fromJSON.mock.calls[0][0];
        expect(externalConfig).toMatchObject({
            audience:
                "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel/providers/vercel",
            service_account_impersonation_url:
                "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/vercel-preview@staging-project.iam.gserviceaccount.com:generateAccessToken",
            subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
            token_url: "https://sts.googleapis.com/v1/token",
            type: "external_account",
        });

        await expect(
            externalConfig.subject_token_supplier.getSubjectToken(),
        ).resolves.toBe("vercel-oidc-token");
        expect(credentialMocks.getVercelOidcToken).toHaveBeenCalledWith();

        await expect(credential.getAccessToken()).resolves.toEqual({
            access_token: "google-token",
            expires_in: 50 * 60,
        });
    });

    it("fails closed when Google does not return a usable client or token", async () => {
        credentialMocks.fromJSON.mockReturnValueOnce(null);
        expect(() =>
            createVercelGoogleCredential({
                projectNumber: "123456789",
                serviceAccountEmail:
                    "vercel-preview@staging-project.iam.gserviceaccount.com",
                workloadIdentityPoolId: "vercel",
                workloadIdentityProviderId: "vercel",
            }),
        ).toThrow("Unable to initialize Google Workload Identity credentials");

        credentialMocks.fromJSON.mockReturnValueOnce({
            getAccessToken: credentialMocks.getAccessToken,
        });
        credentialMocks.getAccessToken.mockResolvedValueOnce({ token: null });
        const credential = createVercelGoogleCredential({
            projectNumber: "123456789",
            serviceAccountEmail:
                "vercel-preview@staging-project.iam.gserviceaccount.com",
            workloadIdentityPoolId: "vercel",
            workloadIdentityProviderId: "vercel",
        });

        await expect(credential.getAccessToken()).rejects.toThrow(
            "Google Workload Identity exchange returned no access token",
        );
    });
});
