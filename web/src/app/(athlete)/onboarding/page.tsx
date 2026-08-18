"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell, LoaderCircle, Medal, Users, UserRound } from "lucide-react";
import clsx from "clsx";

import UniversityFinder from "@/components/athlete/UniversityFinder";
import { api } from "@/lib/athlete/api";
import { AppThemeProvider, useAppTheme } from "@/lib/athlete/app-theme";
import { useAuth } from "@/lib/athlete/auth";
import { getSchoolAppThemeSignal } from "@/lib/core/app-theme";
import { getCommunityTheme } from "@/lib/core/community-theme";

type Step = "status" | "sport" | "profile" | "group";
type AthleteStatus = "current" | "former";
const STEPS: Step[] = ["status", "sport", "profile", "group"];
const SPORTS = [
    ["basketball", "Basketball", "🏀"], ["football", "Football", "🏈"],
    ["soccer", "Soccer", "⚽"], ["hockey", "Hockey", "🏒"],
    ["baseball", "Baseball", "⚾"], ["tennis", "Tennis", "🎾"],
    ["swimming", "Swimming", "🏊"], ["track_field", "Track & Field", "🏃"],
    ["volleyball", "Volleyball", "🏐"], ["softball", "Softball", "🥎"],
    ["wrestling", "Wrestling", "🤼"], ["lacrosse", "Lacrosse", "🥍"],
    ["golf", "Golf", "⛳"], ["gymnastics", "Gymnastics", "🤸"],
    ["other", "Other Sport", "🏅"],
] as const;

const COPY: Record<Step, { title: string; subtitle: string }> = {
    status: {
        title: "Are you a Current or Former Athlete?",
        subtitle: "This is a verified, athlete-only community built to help with transition and identity beyond the game.",
    },
    sport: {
        title: "What's your sport?",
        subtitle: "We'll tailor your experience using language from your game.",
    },
    profile: {
        title: "Tell us about yourself",
        subtitle: "Your display name and school help us connect you with the right athlete community.",
    },
    group: {
        title: "Interested in peer support?",
        subtitle: "Private Circles are small, moderated groups where athletes support each other. This feature is coming soon - let us know if you're interested.",
    },
};

function Card({ step, children }: { step: Step; children: ReactNode }) {
    const index = STEPS.indexOf(step);
    return (
        <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pb-6 pt-5 sm:px-6 sm:pb-8 sm:pt-8">
            <section className="liquid-glass grain rounded-[28px] border border-border-subtle bg-bg-surface p-5 sm:p-7">
                <div role="progressbar" aria-label="Onboarding progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={index + 1} className="mb-5 flex gap-2">
                    {STEPS.map((item, itemIndex) => (
                        <span key={item} aria-hidden="true" className={clsx("h-1 flex-1 rounded-full", itemIndex <= index ? "bg-volt" : "bg-border-subtle")} />
                    ))}
                </div>
                <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-volt">Step {index + 1} of 4</p>
                <h1 className="font-serif text-3xl italic leading-tight text-sand sm:text-4xl">{COPY[step].title}</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-6 text-text-secondary">{COPY[step].subtitle}</p>
            </section>
            <div key={step} className="mt-4 flex flex-1 flex-col animate-rise">{children}</div>
        </main>
    );
}

function Navigation({ back, next, nextLabel, disabled, busy = false }: {
    back?: () => void; next: () => void; nextLabel: string; disabled: boolean; busy?: boolean;
}) {
    return (
        <div className="mt-auto flex gap-3 pt-5">
            {back && <button type="button" onClick={back} disabled={busy} className="liquid-glass flex min-h-13 flex-1 items-center justify-center gap-1 rounded-2xl border border-border-subtle bg-bg-surface px-4 font-semibold text-text-secondary transition hover:text-text-primary disabled:opacity-45"><ChevronLeft aria-hidden="true" className="h-4 w-4" /> Back</button>}
            <button type="button" onClick={next} disabled={disabled || busy} aria-busy={busy} className={clsx("flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-volt px-6 font-semibold text-volt-ink shadow-lg shadow-volt/15 transition hover:brightness-95 disabled:opacity-45", back ? "flex-[2]" : "w-full")}>
                {nextLabel}{busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ChevronRight aria-hidden="true" className="h-4 w-4" />}
            </button>
        </div>
    );
}

function ChoiceCard({ selected, onClick, icon, title, description }: {
    selected: boolean; onClick: () => void; icon: ReactNode; title: string; description: string;
}) {
    return (
        <button type="button" onClick={onClick} aria-pressed={selected} className={clsx("liquid-glass min-h-40 rounded-3xl border p-5 text-left transition", selected ? "border-volt bg-volt/10 shadow-lg shadow-volt/10" : "border-border-subtle bg-bg-surface hover:border-volt/45")}>
            {icon}<span className="block text-[17px] font-bold text-text-primary">{title}</span>
            <span className="mt-1 block text-sm leading-5 text-text-secondary">{description}</span>
        </button>
    );
}

function OnboardingFlow() {
    const router = useRouter();
    const { user, loading, refreshUser } = useAuth();
    const { theme } = useAppTheme();
    const [step, setStep] = useState<Step>("status");
    const [athleteStatus, setAthleteStatus] = useState<AthleteStatus | null>(null);
    const [sport, setSport] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState(() => user?.display_name ?? "");
    const [school, setSchool] = useState(() => user?.school ?? "");
    const [groupInterest, setGroupInterest] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const stepRef = useRef(step);
    const schoolTheme = getCommunityTheme(user?.school);
    const themeStyle = theme === "school" ? ({ "--color-volt": getSchoolAppThemeSignal(schoolTheme.primary), "--color-volt-ink": "#ffffff", "--color-sand": schoolTheme.accent } as CSSProperties) : undefined;

    useEffect(() => { stepRef.current = step; }, [step]);
    useEffect(() => { if (!loading && !user) router.replace("/login?next=%2Fonboarding"); }, [loading, router, user]);
    useEffect(() => {
        if (loading || !user) return;
        api.getGamePlan().then((plan) => { if (plan?.intake_done && stepRef.current === "status") router.replace("/"); });
    }, [loading, router, user]);

    const finish = async () => {
        if (!athleteStatus || !sport || !displayName.trim() || !school.trim() || groupInterest === null) return;
        setBusy(true); setError("");
        const saved = await api.submitOnboarding({ athlete_status: athleteStatus, sport, display_name: displayName.trim(), school: school.trim(), group_interest: groupInterest });
        if (!saved) {
            setBusy(false);
            setError("We couldn't save your profile. Check the connection and try again—your answers are still here.");
            return;
        }
        await refreshUser();
        router.replace("/");
    };

    if (loading || !user) return <div className="flex min-h-[100svh] items-center justify-center bg-bg-base"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-tertiary">{loading ? "Loading your onboarding…" : "Taking you to sign in…"}</p></div>;

    return (
        <div className="app-shell safe-viewport min-h-[100svh] overflow-y-auto bg-bg-base" style={themeStyle}>
            {step === "status" && <Card step={step}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard selected={athleteStatus === "current"} onClick={() => setAthleteStatus("current")} icon={<span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated text-volt"><Dumbbell aria-hidden="true" className="h-7 w-7" /></span>} title="Current Athlete" description="I'm currently competing or training in my sport." />
                    <ChoiceCard selected={athleteStatus === "former"} onClick={() => setAthleteStatus("former")} icon={<span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-elevated text-volt"><Medal aria-hidden="true" className="h-7 w-7" /></span>} title="Former Athlete" description="I've transitioned or am transitioning out of competitive sport." />
                </div>
                <Navigation next={() => setStep("sport")} nextLabel="Continue" disabled={!athleteStatus} />
            </Card>}

            {step === "sport" && <Card step={step}>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {SPORTS.map(([value, label, icon]) => <button key={value} type="button" onClick={() => setSport(value)} aria-pressed={sport === value} className={clsx("liquid-glass flex min-h-25 flex-col items-center justify-center rounded-2xl border bg-bg-surface px-2 py-3 text-center transition sm:min-h-28", sport === value ? "border-volt bg-volt/10 shadow-md shadow-volt/10" : "border-border-subtle hover:border-volt/45")}><span aria-hidden="true" className="text-2xl sm:text-3xl">{icon}</span><span className="mt-1.5 text-[11px] font-semibold leading-tight text-text-primary sm:text-xs">{label}</span></button>)}
                </div>
                <Navigation back={() => setStep("status")} next={() => setStep("profile")} nextLabel="Next" disabled={!sport} />
            </Card>}

            {step === "profile" && <Card step={step}>
                <div className="space-y-3">
                    <section className="liquid-glass rounded-3xl border border-border-subtle bg-bg-surface p-5">
                        <label htmlFor="onboarding-display-name" className="text-xs font-bold uppercase tracking-[0.08em] text-text-primary">Display Name</label>
                        <p className="mb-3 mt-1 text-[13px] text-text-secondary">This appears on your dashboard and in the community.</p>
                        <div className="relative"><input id="onboarding-display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={30} autoComplete="name" autoCapitalize="words" placeholder="Your name" className="min-h-14 w-full rounded-2xl border border-border-subtle bg-bg-elevated px-4 pr-11 text-[17px] font-semibold text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-volt focus:ring-1 focus:ring-volt" /><UserRound aria-hidden="true" className="pointer-events-none absolute right-4 top-5 h-4 w-4 text-text-tertiary" /></div>
                    </section>
                    <section className="liquid-glass rounded-3xl border border-border-subtle bg-bg-surface p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-text-primary">School / University</p>
                        <p className="mb-3 mt-1 text-[13px] text-text-secondary">Select your school to join your private athlete room.</p>
                        <UniversityFinder value={school} onChange={setSchool} label="School / University" placeholder="Find your university" required inputClassName="min-h-14 w-full rounded-2xl border border-border-subtle bg-bg-elevated px-4 text-[16px] font-semibold text-text-primary outline-none transition placeholder:text-text-tertiary focus:border-volt focus:ring-1 focus:ring-volt" />
                    </section>
                </div>
                <Navigation back={() => setStep("sport")} next={() => setStep("group")} nextLabel="Next" disabled={!displayName.trim() || !school.trim()} />
            </Card>}

            {step === "group" && <Card step={step}>
                {error && <p role="alert" className="mb-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceCard selected={groupInterest === true} onClick={() => setGroupInterest(true)} icon={<Users aria-hidden="true" className="mb-3 h-8 w-8 text-volt" />} title="Yes, I'm interested" description="Notify me when Private Circles launch." />
                    <ChoiceCard selected={groupInterest === false} onClick={() => setGroupInterest(false)} icon={<UserRound aria-hidden="true" className="mb-3 h-8 w-8 text-volt" />} title="Not right now" description="I prefer to go through the program on my own for now." />
                </div>
                <Navigation back={() => setStep("profile")} next={finish} nextLabel="Get Started" disabled={groupInterest === null} busy={busy} />
            </Card>}
        </div>
    );
}

export default function OnboardingPage() {
    const { user } = useAuth();
    return <AppThemeProvider><OnboardingFlow key={user?.id ?? "loading"} /></AppThemeProvider>;
}
