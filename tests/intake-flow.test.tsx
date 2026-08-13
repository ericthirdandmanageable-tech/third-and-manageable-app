// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import IntakeFlow from "../src/components/athlete/IntakeFlow";

const completedAnswers = {
    sport: "Football",
    role: "Captain / leader",
    years: "5–9 years",
    relied_on: "I kept the team calm when the pressure was highest.",
    favorite: "The team",
};

describe("IntakeFlow", () => {
    afterEach(cleanup);

    it("starts a fresh intake at the first question with accessible progress", () => {
        render(<IntakeFlow onComplete={vi.fn()} />);

        expect(screen.getByRole("heading", { name: "What's your sport?" })).toBeTruthy();
        expect(
            screen.getByRole("progressbar", { name: "Skill intake progress" }).getAttribute(
                "aria-valuenow",
            ),
        ).toBe("1");
    });

    it("restores completed answers at the final question when returning from community", () => {
        const onComplete = vi.fn();
        render(
            <IntakeFlow
                initialAnswers={completedAnswers}
                startAtEnd
                onComplete={onComplete}
            />,
        );

        expect(
            screen.getByRole("heading", {
                name: "What was your favorite part of competing?",
            }),
        ).toBeTruthy();
        expect(screen.getByRole("button", { name: "The team" }).getAttribute("aria-pressed")).toBe(
            "true",
        );

        fireEvent.click(screen.getByRole("button", { name: "Build my Skill Map" }));
        expect(onComplete).toHaveBeenCalledWith(completedAnswers);
    });
});
