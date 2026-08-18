import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => {
    const profileReference = { kind: "profile" };
    const pendingQuery = { kind: "pending-query" };
    const transaction = {
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
    };
    const queryBuilder = {
        where: vi.fn(),
        limit: vi.fn(() => pendingQuery),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    const database = {
        collection: vi.fn((name: string) =>
            name === "profiles"
                ? { doc: vi.fn(() => profileReference) }
                : queryBuilder,
        ),
        runTransaction: vi.fn(async (callback: (value: typeof transaction) => unknown) =>
            callback(transaction),
        ),
    };
    return { database, pendingQuery, profileReference, queryBuilder, transaction };
});

vi.mock("@/lib/firebase-admin", () => ({
    getAdminFirestore: () => firestore.database,
}));

import {
    updateProductProfileFromAthlete,
} from "@/lib/firestore-product";
import { universitySelectionChanged } from "@/lib/core/university-search";

describe("profile school verification reset", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        firestore.queryBuilder.where.mockReturnValue(firestore.queryBuilder);
        firestore.queryBuilder.limit.mockReturnValue(firestore.pendingQuery);
    });

    it("does not treat whitespace or capitalization as a new school", () => {
        expect(universitySelectionChanged("Example University", " example   UNIVERSITY ")).toBe(false);
        expect(universitySelectionChanged("Example University", "Another University")).toBe(true);
    });

    it("revokes verification and cancels pending requests when school changes", async () => {
        const requestReference = { kind: "request" };
        firestore.transaction.get.mockImplementation(async (reference) => {
            if (reference === firestore.profileReference) {
                return {
                    exists: true,
                    data: () => ({
                        user_id: "athlete-1",
                        school: "Example University",
                        verified: true,
                        verification_requested: true,
                    }),
                };
            }
            return { docs: [{ ref: requestReference, data: () => ({ status: "pending" }) }] };
        });

        const result = await updateProductProfileFromAthlete("athlete-1", {
            school: "Another University",
            headline: "Next chapter",
        });

        expect(firestore.transaction.update).toHaveBeenCalledWith(
            requestReference,
            expect.objectContaining({ status: "cancelled" }),
        );
        expect(firestore.transaction.set).toHaveBeenCalledWith(
            firestore.profileReference,
            expect.objectContaining({
                school: "Another University",
                verified: false,
                verification_requested: false,
                verification_requested_at: null,
                university_email: null,
                university_email_normalized: null,
            }),
            { merge: true },
        );
        expect(result).toMatchObject({ school: "Another University", verified: false });
    });
});
