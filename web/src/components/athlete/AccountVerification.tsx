"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, GraduationCap, Mail, ShieldCheck, Users } from "lucide-react";

import { api, type ApiMutationResult } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";

const MANUAL_ROUTES = [
    ["no_school_email", "I no longer have access to my school email"],
    ["non_collegiate_athlete", "I competed outside a college or university"],
    ["school_without_edu", "My school does not use a .edu domain"],
    ["coach_or_support_staff", "I’m a coach, staff member, or athlete-support professional"],
    ["other", "Another situation"],
] as const;

const CONFIRMATION_MESSAGES: Record<string, string> = {
    confirmed: "University email confirmed — your account is now verified.",
    "already-confirmed": "That university email was already confirmed.",
    expired: "That confirmation link expired. Send yourself a new one below.",
    invalid: "That confirmation link is invalid or has already been replaced.",
    "email-in-use": "That university email is already connected to another account.",
    unavailable: "Verification is temporarily unavailable. Please try again.",
};

export default function AccountVerification() {
    const { user, refreshUser } = useAuth();
    const [universityEmail, setUniversityEmail] = useState("");
    const [manualRoute, setManualRoute] = useState<string>(MANUAL_ROUTES[0][0]);
    const [manualNote, setManualNote] = useState("");
    const [busy, setBusy] = useState<"email" | "manual" | null>(null);
    const [result, setResult] = useState<ApiMutationResult | null>(null);

    useEffect(() => {
        const url = new URL(window.location.href);
        const confirmation = url.searchParams.get("verification");
        if (!confirmation) return;
        const frame = window.requestAnimationFrame(() =>
            setResult({
                ok: confirmation === "confirmed" || confirmation === "already-confirmed",
                message: CONFIRMATION_MESSAGES[confirmation] || "Verification status updated.",
            }),
        );
        void refreshUser();
        url.searchParams.delete("verification");
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        return () => window.cancelAnimationFrame(frame);
    }, [refreshUser]);

    if (!user) return null;

    if (user.verified) {
        return (
            <section className="mb-6 overflow-hidden rounded-[20px] border border-volt/30 bg-volt/8 p-6 md:p-8">
                <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-volt/15 text-volt">
                        <BadgeCheck className="h-6 w-6" />
                    </span>
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-volt">
                            Account confirmed
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-text-primary">
                            Verified community access
                        </h2>
                        <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                            You can join forums, post, and use your verified school colors.
                        </p>
                    </div>
                </div>
                {result?.message && (
                    <p className="mt-4 rounded-xl border border-volt/20 bg-bg-surface/60 px-4 py-3 text-[13px] text-text-secondary">
                        {result.message}
                    </p>
                )}
            </section>
        );
    }

    const submitUniversityEmail = async (event: FormEvent) => {
        event.preventDefault();
        setBusy("email");
        const response = await api.requestUniversityVerification(universityEmail);
        setResult(response);
        if (response.ok) await refreshUser();
        setBusy(null);
    };

    const submitManualRequest = async (event: FormEvent) => {
        event.preventDefault();
        setBusy("manual");
        const response = await api.requestManualVerification(manualRoute, manualNote.trim());
        setResult(response);
        if (response.ok) await refreshUser();
        setBusy(null);
    };

    return (
        <section className="mb-6 overflow-hidden rounded-[20px] border border-border-subtle bg-bg-surface p-6 md:p-8">
            <div className="mb-6 flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-volt/10 text-volt">
                    <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
                        Confirm account
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-text-primary">
                        Unlock community participation
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                        Reading stays open. Confirm your background before joining or posting.
                    </p>
                </div>
            </div>

            {user.verification_requested && (
                <div className="mb-5 flex items-start gap-3 rounded-2xl border border-volt/25 bg-volt/8 p-4">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
                    <p className="text-[13px] leading-relaxed text-text-secondary">
                        A verification request is pending. You can still send a new university link or
                        update the route to manual review.
                    </p>
                </div>
            )}

            {result && (
                <p
                    role="status"
                    className={`mb-5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
                        result.ok
                            ? "border-volt/25 bg-volt/8 text-text-secondary"
                            : "border-danger/30 bg-danger/8 text-danger"
                    }`}
                >
                    {result.message}
                </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
                <form
                    onSubmit={submitUniversityEmail}
                    className="rounded-2xl border border-border-subtle bg-bg-elevated p-5"
                >
                    <GraduationCap className="h-5 w-5 text-volt" />
                    <h3 className="mt-3 text-[15px] font-semibold text-text-primary">
                        Verify with a .edu email
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-tertiary">
                        Fastest route. It can be different from your sign-in email.
                    </p>
                    <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                        University email
                        <input
                            type="email"
                            required
                            inputMode="email"
                            autoComplete="email"
                            placeholder="you@university.edu"
                            value={universityEmail}
                            onChange={(event) => setUniversityEmail(event.target.value)}
                            pattern="[^@\s]+@[^@\s]+\.edu"
                            className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 font-sans text-[13px] normal-case tracking-normal text-text-primary placeholder:text-text-tertiary focus:border-volt focus:outline-none focus:ring-1 focus:ring-volt"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={busy !== null}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-volt px-4 py-2.5 text-[13px] font-semibold text-volt-ink transition-opacity disabled:opacity-40"
                    >
                        {busy === "email" ? "Sending…" : "Email my confirmation link"}
                    </button>
                </form>

                <form
                    onSubmit={submitManualRequest}
                    className="rounded-2xl border border-border-subtle bg-bg-elevated p-5"
                >
                    <Users className="h-5 w-5 text-volt" />
                    <h3 className="mt-3 text-[15px] font-semibold text-text-primary">
                        Ask the team to review
                    </h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-tertiary">
                        For former athletes, non-collegiate paths, and anyone without active .edu access.
                    </p>
                    <label className="mt-4 block font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                        Best match
                        <select
                            value={manualRoute}
                            onChange={(event) => setManualRoute(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 font-sans text-[13px] normal-case tracking-normal text-text-primary focus:border-volt focus:outline-none focus:ring-1 focus:ring-volt"
                        >
                            {MANUAL_ROUTES.map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                        Helpful context <span className="normal-case text-text-tertiary">(optional)</span>
                        <textarea
                            value={manualNote}
                            onChange={(event) => setManualNote(event.target.value)}
                            maxLength={1_000}
                            rows={2}
                            placeholder="Team, years, league, role, or anything that helps us review."
                            className="mt-2 w-full resize-none rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 font-sans text-[13px] normal-case tracking-normal text-text-primary placeholder:text-text-tertiary focus:border-volt focus:outline-none focus:ring-1 focus:ring-volt"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={busy !== null}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-volt/50 bg-volt/10 px-4 py-2.5 text-[13px] font-semibold text-volt transition-colors hover:bg-volt/15 disabled:opacity-40"
                    >
                        {busy === "manual" ? "Sending…" : "Please verify my account"}
                    </button>
                </form>
            </div>
        </section>
    );
}
