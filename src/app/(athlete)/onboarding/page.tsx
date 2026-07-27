"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

import IntakeFlow from "@/components/athlete/IntakeFlow";
import { api } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";

/*
 * Onboarding — first-run flow (REDESIGN_BRIEF §9.1: intake runs on first run).
 * Mirrors the original shipped app's 4-step structure with verified copy
 * recovered from its bundle: welcome manifesto → status → skill intake
 * (IntakeFlow, already built) → community choice → completion. The old
 * display-name/school/account step moved ahead of this flow to `/login`, so
 * intake progress is never lost to a late credential or network failure.
 *
 * It sits outside the `(shell)` group on purpose: no tabs, no sidebar, one
 * job — the same reason the prototype kept it out of `MainLayout`.
 */

type Step = "welcome" | "status" | "intake" | "community" | "complete";
type Status = "competing" | "transitioning";
type Community = "join" | "solo";

// Original-app copy, verbatim (bundle_strings.txt / REDESIGN_BRIEF §2.2)
const STATUS_OPTIONS: { value: Status; label: string }[] = [
    { value: "competing", label: "I'm currently competing or training in my sport." },
    {
        value: "transitioning",
        label: "I've transitioned or am transitioning out of competitive sport.",
    },
];

export default function OnboardingPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    const [step, setStep] = useState<Step>("welcome");
    const [status, setStatus] = useState<Status | null>(null);
    const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string> | null>(null);
    const [community, setCommunity] = useState<Community | null>(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    // Already-onboarded users landing here directly get bounced home — but only
    // if they haven't started the flow (the check races the first
    // interactions), so the effect reads the live step through a ref rather
    // than depending on it and re-running on every advance.
    const stepRef = useRef(step);
    useEffect(() => {
        stepRef.current = step;
    }, [step]);
    useEffect(() => {
        if (!loading && !user) router.replace("/login?next=%2Fonboarding");
    }, [loading, router, user]);
    useEffect(() => {
        if (loading || !user) return;
        api.getGamePlan().then((gp) => {
            if (gp?.intake_done && stepRef.current === "welcome") router.replace("/");
        });
    }, [user, loading, router]);

    // Account creation is deliberately outside this route: login/register
    // happens first, then this stable three-step intake can be resumed safely.
    const coreSteps: Step[] = ["status", "intake", "community"];
    const coreIndex = coreSteps.indexOf(step);
    const stepAfter = (s: Step) => coreSteps[coreSteps.indexOf(s) + 1];
    const stepBefore = (s: Step) => coreSteps[coreSteps.indexOf(s) - 1];

    const finalize = async (choice: Community) => {
        setBusy(true);
        setError("");
        if (!intakeAnswers) {
            setBusy(false);
            setError("Your intake answers are missing. Go back and complete the intake.");
            return;
        }

        // Registration starts with the backend's neutral status default. Save
        // the athlete's explicit answer before marking intake complete so the
        // completion screen never celebrates a partially persisted profile.
        if (user && status) {
            const updated = await api.updateProfile({ status });
            if (!updated) {
                setBusy(false);
                setError(
                    "We couldn’t save where you are in your journey yet. Check the connection and try again—your answers are still here.",
                );
                return;
            }
        }

        const saved = await api.submitIntake({ ...intakeAnswers, community: choice });
        if (!saved) {
            setBusy(false);
            setError(
                "We couldn’t save your onboarding yet. Check the connection and try again—your answers are still here.",
            );
            return;
        }

        setBusy(false);
        setStep("complete");
    };

    const stepShell = (children: React.ReactNode) => (
        <div className="w-full max-w-xl animate-rise">
            <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary text-center mb-6">
                Third &amp; Manageable · Step {coreIndex + 1} of {coreSteps.length}
            </p>
            <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 md:p-8 grain">
                {children}
            </div>
        </div>
    );

    const backNextRow = (
        onBack: () => void,
        onNext: () => void,
        canNext: boolean,
        nextLabel = "Next",
    ) => (
        <div className="flex items-center justify-between mt-6">
            <button
                onClick={onBack}
                className="flex items-center gap-1 text-[13px] text-text-tertiary hover:text-text-secondary transition-all"
            >
                <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
                onClick={onNext}
                disabled={!canNext || busy}
                className="bg-volt text-volt-ink font-semibold px-6 py-3 rounded-full flex items-center gap-2 hover:bg-volt/90 transition-all disabled:opacity-40"
            >
                {nextLabel} <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );

    if (loading || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-bg-base">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                    {loading ? "Loading your onboarding…" : "Taking you to sign in…"}
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-base flex items-center justify-center p-6">
            {/* ——— Welcome ——— */}
            {step === "welcome" && (
                <div className="w-full max-w-xl text-center animate-rise">
                    <p className="font-mono text-[11px] uppercase tracking-widest text-volt mb-6">
                        Third &amp; Manageable
                    </p>
                    <h1 className="font-serif text-4xl md:text-5xl text-sand italic leading-tight mb-6">
                        No scoreboard. No comparison. Just your journey.
                    </h1>
                    <div className="yard-line w-40 mx-auto mb-6" />
                    <p className="text-[15px] text-text-secondary leading-relaxed max-w-md mx-auto mb-10">
                        A daily game plan, progress tracking, wellness resources, and a community
                        that has your back.
                    </p>
                    <button
                        onClick={() => {
                            setStep("status");
                        }}
                        disabled={loading}
                        className="bg-volt text-volt-ink font-semibold px-8 py-4 rounded-full inline-flex items-center gap-2 hover:bg-volt/90 transition-all disabled:opacity-40"
                    >
                        Get Started <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* ——— Step: status (original step 1) ——— */}
            {step === "status" &&
                stepShell(
                    <>
                        <h2 className="font-serif text-2xl text-sand italic mb-6">
                            Where are you in your journey?
                        </h2>
                        <div className="space-y-3">
                            {STATUS_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setStatus(option.value)}
                                    aria-pressed={status === option.value}
                                    className={clsx(
                                        "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                        status === option.value
                                            ? "bg-volt/10 border-volt text-text-primary"
                                            : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary",
                                    )}
                                >
                                    <div
                                        className={clsx(
                                            "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                            status === option.value
                                                ? "border-volt"
                                                : "border-text-tertiary",
                                        )}
                                    >
                                        {status === option.value && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-volt" />
                                        )}
                                    </div>
                                    <span className="text-[15px]">{option.label}</span>
                                </button>
                            ))}
                        </div>
                        {backNextRow(
                            () => setStep("welcome"),
                            () => setStep("intake"),
                            status !== null,
                        )}
                    </>,
                )}

            {/* ——— Step: skill intake (original step 2, expanded per §16.1) ——— */}
            {step === "intake" &&
                stepShell(
                    <IntakeFlow
                        onBackAtStart={() => setStep("status")}
                        onComplete={(answers) => {
                            setIntakeAnswers(answers);
                            setStep(stepAfter("intake"));
                        }}
                    />,
                )}

            {/* ——— Step: community choice (original step 4) ——— */}
            {step === "community" &&
                stepShell(
                    <>
                        <h2 className="font-serif text-2xl text-sand italic mb-2">
                            You don&apos;t have to do this alone
                        </h2>
                        <p className="text-[13px] text-text-secondary mb-6">
                            Connect with current and former athletes who understand your journey.
                            Verified, moderated, and safe.
                        </p>
                        {error && (
                            <p role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
                                {error}
                            </p>
                        )}
                        <div className="space-y-3">
                            <button
                                onClick={() => setCommunity("join")}
                                aria-pressed={community === "join"}
                                className={clsx(
                                    "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                    community === "join"
                                        ? "bg-volt/10 border-volt text-text-primary"
                                        : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                        community === "join" ? "border-volt" : "border-text-tertiary",
                                    )}
                                >
                                    {community === "join" && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-volt" />
                                    )}
                                </div>
                                <span className="flex-1">
                                    <span className="text-[15px] block">Count me in</span>
                                    <span className="text-[13px] text-text-tertiary block mt-0.5">
                                        You may be asked to verify your athlete status before
                                        posting.
                                    </span>
                                </span>
                            </button>
                            <button
                                onClick={() => setCommunity("solo")}
                                aria-pressed={community === "solo"}
                                className={clsx(
                                    "w-full text-left px-5 py-4 rounded-2xl border transition-all duration-200 flex items-center gap-4",
                                    community === "solo"
                                        ? "bg-volt/10 border-volt text-text-primary"
                                        : "bg-bg-elevated border-border-subtle text-text-secondary hover:border-text-tertiary hover:text-text-primary",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                        community === "solo" ? "border-volt" : "border-text-tertiary",
                                    )}
                                >
                                    {community === "solo" && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-volt" />
                                    )}
                                </div>
                                <span className="text-[15px]">
                                    I prefer to go through the program on my own for now.
                                </span>
                            </button>
                        </div>
                        {backNextRow(
                            () => setStep(stepBefore("community")),
                            () => community && finalize(community),
                            community !== null,
                            busy ? "…" : "Finish",
                        )}
                    </>,
                )}

            {/* ——— Complete (original CompleteWelcomeScreen) ——— */}
            {step === "complete" && (
                <div className="w-full max-w-xl animate-rise">
                    <div className="bg-bg-surface rounded-[20px] border border-border-subtle p-8 md:p-10 grain text-center">
                        <p className="font-mono text-[11px] uppercase tracking-widest text-volt mb-4">
                            Day 1 / 90 · Foundation
                        </p>
                        <h1 className="font-serif text-4xl md:text-5xl text-sand italic mb-6">
                            You&apos;re in the game.
                        </h1>
                        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
                            {intakeAnswers?.sport && (
                                <span className="font-mono text-[13px] text-volt bg-volt/10 px-3 py-1.5 rounded-full">
                                    {intakeAnswers.sport}
                                </span>
                            )}
                            {status && (
                                <span className="font-mono text-[13px] text-text-secondary bg-bg-elevated px-3 py-1.5 rounded-full">
                                    {status === "competing" ? "Currently competing" : "Transitioning"}
                                </span>
                            )}
                            {community && (
                                <span className="font-mono text-[13px] text-text-secondary bg-bg-elevated px-3 py-1.5 rounded-full">
                                    {community === "join" ? "Community" : "Solo for now"}
                                </span>
                            )}
                        </div>
                        <p className="text-[13px] text-text-tertiary italic mb-8">
                            &ldquo;I&apos;ve failed over and over again in my life. And that is why I
                            succeed.&rdquo; — Michael Jordan
                        </p>
                        <button
                            onClick={() => router.push("/")}
                            className="bg-volt text-volt-ink font-semibold px-8 py-4 rounded-full inline-flex items-center gap-2 hover:bg-volt/90 transition-all"
                        >
                            Start Day 1 <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
