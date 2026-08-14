export class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export function jsonError(error: unknown): Response {
    if (error instanceof ApiError) {
        return Response.json({ detail: error.message }, { status: error.status });
    }
    console.error("Athlete API request failed");
    return Response.json({ detail: "Service unavailable" }, { status: 503 });
}

export async function readObject(request: Request): Promise<Record<string, unknown>> {
    try {
        const body: unknown = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
        return body as Record<string, unknown>;
    } catch {
        throw new ApiError(422, "Invalid request body");
    }
}

type StringOptions = { min?: number; max?: number; optional?: boolean; nullable?: boolean };

export function stringField(
    body: Record<string, unknown>,
    name: string,
    options: StringOptions & { nullable: true },
): string | null;
export function stringField(
    body: Record<string, unknown>,
    name: string,
    options: StringOptions & { optional: true },
): string | undefined;
export function stringField(
    body: Record<string, unknown>,
    name: string,
    options?: StringOptions,
): string;
export function stringField(
    body: Record<string, unknown>,
    name: string,
    options: StringOptions = {},
): string | null | undefined {
    const value = body[name];
    if (value === undefined && options.optional) return undefined;
    if (value === null && options.nullable) return null;
    if (typeof value !== "string") throw new ApiError(422, `${name} must be a string`);
    if (options.min !== undefined && value.length < options.min) {
        throw new ApiError(422, `${name} is too short`);
    }
    if (options.max !== undefined && value.length > options.max) {
        throw new ApiError(422, `${name} is too long`);
    }
    return value;
}

export function uuidField(value: unknown, name: string): string {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new ApiError(422, `${name} must be a UUID`);
    }
    return value;
}
