/**
 * Temporary same-origin path shared by the browser client and Next's local
 * development proxy. Production adds the equivalent platform route in Phase 2
 * step 11; Route Handlers replace the prefix and this module at step 16.
 */
export const BRIDGE_PREFIX = "/bridge";

export interface BridgeRewrite {
    source: string;
    destination: string;
}

export const athleteApiBase = (configuredBase: string | undefined): string =>
    configuredBase?.trim().replace(/\/+$/, "") || BRIDGE_PREFIX;

export const bridgeRewrite = (
    nodeEnv: string | undefined,
    configuredOrigin: string | undefined,
): BridgeRewrite | null => {
    const origin =
        configuredOrigin?.trim().replace(/\/+$/, "") ||
        (nodeEnv === "development" ? "http://127.0.0.1:8001" : null);
    if (!origin) return null;

    return {
        source: `${BRIDGE_PREFIX}/:path*`,
        destination: `${origin}/:path*`,
    };
};
