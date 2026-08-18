// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NotificationsPage from "../src/app/(athlete)/(shell)/notifications/page";
import { api, type ApiNotification } from "@/lib/athlete/api";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push, back: vi.fn() }),
}));

const rows: ApiNotification[] = [
    {
        id: "notification-1",
        user_id: "athlete-1",
        type: "gameplan",
        title: "Game Plan Completed",
        body: "You completed today's action.",
        icon: "clipboard",
        timestamp: "2026-08-17T12:00:00.000Z",
        read: false,
    },
];

describe("web notification center", () => {
    beforeEach(() => {
        push.mockReset();
        vi.spyOn(api, "notifications").mockResolvedValue(rows);
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("loads canonical notifications, marks one read, and follows its production destination", async () => {
        const markRead = vi.spyOn(api, "markNotificationRead").mockResolvedValue({ updated: 1 });
        render(<NotificationsPage />);

        const notification = await screen.findByRole("button", { name: /Game Plan Completed/ });
        expect(screen.getByLabelText("Unread")).toBeTruthy();
        fireEvent.click(notification);

        await waitFor(() => expect(markRead).toHaveBeenCalledWith("notification-1"));
        expect(push).toHaveBeenCalledWith("/game-plan");
    });

    it("marks every visible notification read", async () => {
        const markAll = vi.spyOn(api, "markAllNotificationsRead").mockResolvedValue({ updated: 1 });
        render(<NotificationsPage />);
        fireEvent.click(await screen.findByRole("button", { name: /Mark all read/ }));
        await waitFor(() => expect(markAll).toHaveBeenCalledOnce());
        expect(screen.queryByLabelText("Unread")).toBeNull();
    });
});
