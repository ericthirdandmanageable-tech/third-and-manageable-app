export const MAX_APPWRITE_JWT_LENGTH = 4096;

export const FIREBASE_BRIDGE_CLAIMS = Object.freeze({
    auth_source: "appwrite",
    bridge_version: 1,
});

const APPWRITE_JWT_PATTERN =
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const APPWRITE_USER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;
const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export class InvalidAppwriteIdentityError extends Error {
    constructor() {
        super("The Appwrite identity could not be verified");
        this.name = "InvalidAppwriteIdentityError";
    }
}

export interface MobileAuthBridgeDependencies {
    verifyAppwriteJwt(jwt: string): Promise<{ id: string }>;
    createFirebaseCustomToken(
        uid: string,
        claims: Readonly<typeof FIREBASE_BRIDGE_CLAIMS>,
    ): Promise<string>;
}

function unauthorized(): Response {
    return Response.json(
        { error: "Invalid credentials" },
        {
            status: 401,
            headers: {
                ...NO_STORE_HEADERS,
                "WWW-Authenticate": "Bearer",
            },
        },
    );
}

function extractAppwriteJwt(request: Request): string | null {
    const authorization = request.headers.get("authorization");
    if (!authorization) return null;

    const match = /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) return null;

    const jwt = match[1];
    if (
        jwt.length > MAX_APPWRITE_JWT_LENGTH ||
        !APPWRITE_JWT_PATTERN.test(jwt)
    ) {
        return null;
    }

    return jwt;
}

export function createFirebaseTokenHandler(
    dependencies: MobileAuthBridgeDependencies,
): (request: Request) => Promise<Response> {
    return async (request: Request) => {
        const jwt = extractAppwriteJwt(request);
        if (!jwt) return unauthorized();

        try {
            const user = await dependencies.verifyAppwriteJwt(jwt);
            if (!APPWRITE_USER_ID_PATTERN.test(user.id)) {
                throw new Error("Appwrite returned an invalid user ID");
            }

            const firebaseCustomToken =
                await dependencies.createFirebaseCustomToken(
                    user.id,
                    FIREBASE_BRIDGE_CLAIMS,
                );

            if (!firebaseCustomToken) {
                throw new Error("Firebase returned an empty custom token");
            }

            return Response.json(
                { firebaseCustomToken },
                { headers: NO_STORE_HEADERS },
            );
        } catch (error) {
            if (error instanceof InvalidAppwriteIdentityError) {
                return unauthorized();
            }

            // Do not log the exception: vendor errors can include request context.
            console.error("Mobile authentication bridge provider failure");
            return Response.json(
                { error: "Authentication bridge unavailable" },
                { status: 503, headers: NO_STORE_HEADERS },
            );
        }
    };
}
