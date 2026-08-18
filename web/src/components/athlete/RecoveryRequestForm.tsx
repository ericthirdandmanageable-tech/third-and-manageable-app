"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecoveryRequestForm() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch("/api/auth/recovery", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) throw new Error(body?.detail || "Unable to send reset email.");
            setMessage("If an account exists for that email, a reset link is on its way.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to send reset email.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="w-full max-w-lg rounded-[32px] border border-white/9 bg-[#13161b]/90 p-6 shadow-2xl backdrop-blur sm:p-9">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-volt">Account access</p>
            <h1 className="font-serif text-4xl italic leading-tight text-sand">Reset your password.</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">Enter your email and we’ll send a secure reset link.</p>
            <form onSubmit={submit} className="mt-7 space-y-3">
                <label>
                    <span className="sr-only">Email</span>
                    <input
                        required
                        type="email"
                        autoComplete="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-2xl border border-white/12 bg-white/7 px-4 py-3.5 text-[15px] text-white placeholder:text-white/48 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/15"
                    />
                </label>
                {message && <p className="rounded-xl border border-volt/25 bg-volt/10 px-4 py-3 text-sm text-volt">{message}</p>}
                {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-full bg-volt px-6 py-4 font-semibold text-volt-ink disabled:cursor-wait disabled:opacity-55">
                    {busy ? "Sending…" : "Email me a reset link"}
                </button>
            </form>
            <Link href="/login" className="mt-5 block text-center text-sm text-white/55 underline decoration-white/20 underline-offset-4 hover:text-white">Back to sign in</Link>
        </div>
    );
}
