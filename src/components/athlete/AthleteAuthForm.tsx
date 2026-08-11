"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import clsx from "clsx";

import { api } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import UniversityFinder from "./UniversityFinder";

export default function AthleteAuthForm({
    initialMode = "login",
    compact = false,
    onSuccess,
}: {
    initialMode?: "login" | "register";
    compact?: boolean;
    onSuccess?: () => void;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { signIn, register } = useAuth();
    const [mode, setMode] = useState<"login" | "register">(initialMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [school, setSchool] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");

        const ok =
            mode === "login"
                ? await signIn(email, password)
                : await register(email, password, name, school || undefined);

        if (!ok) {
            setError(
                mode === "login"
                    ? "We couldn’t sign you in with those details."
                    : "We couldn’t create that account. The email may already be in use.",
            );
            setBusy(false);
            return;
        }

        onSuccess?.();
        if (mode === "register") {
            router.replace("/onboarding");
            return;
        }

        const gamePlan = await api.getGamePlan();
        const requested = searchParams.get("next");
        const safeNext = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/";
        // The authenticated shell has a closed, retryable plan gate. If this
        // lookup alone fails, send the athlete there instead of incorrectly
        // treating an established account as a first-run account.
        router.replace(!gamePlan ? "/" : gamePlan.intake_done ? safeNext : "/onboarding");
    };

    const fieldClass =
        "w-full rounded-2xl border border-white/12 bg-white/7 px-4 py-3.5 text-[15px] text-white placeholder:text-white/38 outline-none transition focus:border-volt/70 focus:bg-white/10 focus:ring-2 focus:ring-volt/15";

    return (
        <div className={clsx("w-full", compact ? "max-w-md" : "max-w-lg")}>
            <div
                role="tablist"
                aria-label="Account access"
                className="mb-7 flex rounded-full border border-white/10 bg-white/5 p-1"
            >
                {(["login", "register"] as const).map((option) => (
                    <button
                        key={option}
                        id={`athlete-auth-${option}-tab`}
                        type="button"
                        role="tab"
                        aria-selected={mode === option}
                        aria-controls="athlete-auth-panel"
                        onClick={() => {
                            setMode(option);
                            setError("");
                        }}
                        className={clsx(
                            "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                            mode === option
                                ? "bg-volt text-volt-ink shadow-[0_8px_24px_rgba(200,240,75,0.16)]"
                                : "text-white/55 hover:text-white",
                        )}
                    >
                        {option === "login" ? "Sign in" : "Create account"}
                    </button>
                ))}
            </div>

            <div
                id="athlete-auth-panel"
                role="tabpanel"
                aria-labelledby={`athlete-auth-${mode}-tab`}
            >
                <div className="mb-7">
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-volt">
                        {mode === "login" ? "Welcome back" : "Your next season starts here"}
                    </p>
                    <h1 className="font-serif text-4xl italic leading-tight text-sand md:text-5xl">
                        {mode === "login" ? "Pick up where you left off." : "Build a plan that starts at zero."}
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
                        {mode === "login"
                            ? "Your check-ins, game plan, and athlete community are waiting."
                            : "Create your private account first. Then we’ll tailor the experience through a short, guided onboarding."}
                    </p>
                </div>

                <form onSubmit={submit} className="space-y-3">
                {mode === "register" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                            <span className="sr-only">Display name</span>
                            <input
                                required
                                autoComplete="name"
                                placeholder="Display name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className={fieldClass}
                            />
                        </label>
                        <div>
                            <UniversityFinder
                                value={school}
                                onChange={setSchool}
                                inputClassName={fieldClass}
                            />
                            <p className="mt-1.5 px-1 text-[11px] text-white/38">
                                Start typing to search. No verification required yet.
                            </p>
                        </div>
                    </div>
                )}

                <label>
                    <span className="sr-only">Email</span>
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={fieldClass}
                    />
                </label>

                <label className="relative block">
                    <span className="sr-only">Password</span>
                    <input
                        required
                        type={showPassword ? "text" : "password"}
                        minLength={8}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        placeholder="Password (8+ characters)"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${fieldClass} pr-12`}
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((visible) => !visible)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/38 transition hover:text-white"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </label>

                {error && (
                    <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={busy}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-volt px-6 py-4 font-semibold text-volt-ink transition hover:bg-[#d8fa6d] disabled:cursor-wait disabled:opacity-55"
                >
                    {busy ? "Getting things ready…" : mode === "login" ? "Sign in" : "Create my account"}
                    {!busy && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
                </form>
            </div>

            <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-white/38">
                <ShieldCheck className="h-3.5 w-3.5 text-volt/70" />
                Private by default. Community posting requires verification.
            </p>
        </div>
    );
}
