"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Activity, HeartHandshake, Target } from "lucide-react";

import AthleteAuthForm from "@/components/athlete/AthleteAuthForm";
import { useAuth } from "@/lib/athlete/auth";

const BENEFITS = [
    { icon: Activity, label: "A daily check-in that begins with your real baseline" },
    { icon: Target, label: "A 90-day game plan built around your next season" },
    { icon: HeartHandshake, label: "A verified community that understands the transition" },
];

export default function AthleteLoginPage() {
    const router = useRouter();
    const { user, loading } = useAuth();
    const initialAuthResolved = useRef(false);

    useEffect(() => {
        if (loading || initialAuthResolved.current) return;
        initialAuthResolved.current = true;
        // Redirect only an account that was already signed in when this page
        // resolved. A new sign-in is routed by AthleteAuthForm after it checks
        // whether onboarding is complete; redirecting on every `user` change
        // races that decision and causes an unnecessary trip through `/`.
        if (user) router.replace("/");
    }, [loading, router, user]);

    return (
        <main className="safe-viewport relative overflow-x-hidden bg-[#080a0d] px-5 text-white sm:px-8 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)] lg:gap-12 lg:px-12">
            <div className="pointer-events-none absolute inset-0 opacity-75 [background:radial-gradient(circle_at_15%_20%,rgba(200,240,75,0.12),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(139,147,248,0.09),transparent_32%)]" />

            <section className="relative hidden min-h-[calc(100svh-3rem)] flex-col justify-between rounded-[32px] border border-white/8 bg-[linear-gradient(145deg,#171a20,#0e1014)] p-10 shadow-2xl lg:flex">
                <div>
                    <p className="font-serif text-2xl italic text-sand">Third &amp; Manageable</p>
                    <div className="yard-line mt-5 w-40" />
                </div>
                <div className="max-w-xl">
                    <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-volt">
                        The athlete transition platform
                    </p>
                    <h2 className="font-serif text-6xl italic leading-[0.98] text-sand">
                        The season changed. Your discipline didn’t.
                    </h2>
                    <p className="mt-6 max-w-lg text-base leading-7 text-white/55">
                        Translate what sport built in you into a steadier mind, a practical career path,
                        and a community for the days nobody keeps score.
                    </p>
                    <div className="mt-9 grid gap-3">
                        {BENEFITS.map(({ icon: BenefitIcon, label }) => (
                            <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt/10 text-volt">
                                    <BenefitIcon className="h-4 w-4" />
                                </span>
                                <span className="text-sm text-white/70">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/25">
                    No scoreboard · No comparison · Just your journey
                </p>
            </section>

            <section className="relative flex min-h-[calc(100svh-3rem)] items-center justify-center">
                <div className="w-full max-w-lg rounded-[32px] border border-white/9 bg-[#13161b]/90 p-6 shadow-2xl backdrop-blur sm:p-9">
                    <div className="mb-8 lg:hidden">
                        <p className="font-serif text-2xl italic text-sand">Third &amp; Manageable</p>
                        <div className="yard-line mt-4 w-32" />
                    </div>
                    <Suspense fallback={<p className="text-sm text-white/45">Loading sign in…</p>}>
                        <AthleteAuthForm />
                    </Suspense>
                </div>
            </section>
        </main>
    );
}
