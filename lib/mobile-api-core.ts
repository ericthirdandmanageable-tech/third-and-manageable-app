const REQUEST_TIMEOUT_MS = 20_000;

export interface MobileApiDependencies {
  account: { createJWT: () => Promise<{ jwt?: string }> };
  fetcher?: typeof fetch;
  getConfiguredUrl?: () => string | undefined;
}

export class MobileApiError extends Error {
  readonly status: number;

  constructor(
    status: number,
    message: string,
  ) {
    super(message);
    this.status = status;
  }
}

export function getProductApiBase(configuredValue?: string): string {
  const configured = configuredValue?.trim();
  if (!configured) {
    throw new Error("EXPO_PUBLIC_PRODUCT_API_URL is not configured.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("EXPO_PUBLIC_PRODUCT_API_URL is invalid.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "EXPO_PUBLIC_PRODUCT_API_URL must be a credential-free HTTPS URL.",
    );
  }
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function createMobileApi(dependencies: MobileApiDependencies) {
  const {
    account,
    fetcher = fetch,
    getConfiguredUrl = () => process.env.EXPO_PUBLIC_PRODUCT_API_URL,
  } = dependencies;

  return async function mobileApi<T>(
    path: `/${string}`,
    init: { body?: unknown; method?: "DELETE" | "GET" | "PATCH" | "POST" } = {},
  ): Promise<T> {
    const result = await account.createJWT();
    if (!result.jwt) throw new Error("Appwrite returned an empty JWT.");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const hasBody = init.body !== undefined;
      const response = await fetcher(
        `${getProductApiBase(getConfiguredUrl())}${path}`,
        {
          method: init.method ?? "GET",
          headers: {
            Authorization: `Bearer ${result.jwt}`,
            ...(hasBody ? { "Content-Type": "application/json" } : {}),
          },
          ...(hasBody ? { body: JSON.stringify(init.body) } : {}),
          signal: controller.signal,
        },
      );
      const responseText = await response.text();
      let payload: unknown = null;
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = null;
        }
      }
      if (!response.ok) {
        const detail =
          payload && typeof payload === "object" && "detail" in payload
            ? (payload as { detail?: unknown }).detail
            : undefined;
        throw new MobileApiError(
          response.status,
          typeof detail === "string" ? detail : "Product service unavailable.",
        );
      }
      return payload as T;
    } finally {
      clearTimeout(timeout);
    }
  };
}
