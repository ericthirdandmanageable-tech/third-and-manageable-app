"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function RecoveryCompleteForm() {
    const params = useSearchParams();
    const userId = params.get("userId") || "";
    const secret = params.get("secret") || "";
    const [password, setPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [complete, setComplete] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!userId || !secret) {
            setError("This reset link is incomplete or expired.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const response = await fetch("/api/auth/recovery/complete", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ user_id: userId, secret, password, password_confirmation: confirmation }),
            });
            const body = await response.json().catch(() => null);
            if (!response.ok) throw new Error(body?.detail || "Unable to reset password.");
            setComplete(true);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Unable to reset password.");
        } finally {
            setBusy(false);
        }
    };

    if (complete) {
        return (
            <div className="w-full max-w-lg rounded-[32px] border border-white/9 bg-[#13161b]/90 p-6 text-center shadow-2xl backdrop-blur sm:p-9">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-volt">Password updated</p>
                <h1 className="mt-2 font-serif text-4xl italic leading-tight text-sand">You’re back in control.</h1>
                <p className="mt-3 text-sm text-white/55">Your password has been changed. Sign in with the new password.</p>
                <Link href="/login" className="mt-7 inline-block rounded-full bg-volt px-6 py-4 font-semibold text-volt-ink">Return to sign in</Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-lg rounded-[32px] border border-white/9 bg-[#13161b]/90 p-6 shadow-2xl backdrop-blur sm:p-9">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-volt">Account access</p>
            <h1 className="font-serif text-4xl italic leading-tight text-sand">Choose a new password.</h1>
            <form onSubmit={submit} className="mt-7 space-y-3">
                <input required minLength={8} type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/7 px-4 py-3.5 text-[15px] text-white placeholder:text-white/48 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/15" />
                <input required minLength={8} type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-white/12 bg-white/7 px-4 py-3.5 text-[15px] text-white placeholder:text-white/48 outline-none focus:border-volt/70 focus:ring-2 focus:ring-volt/15" />
                {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-red-200">{error}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-full bg-volt px-6 py-4 font-semibold text-volt-ink disabled:cursor-wait disabled:opacity-55">{busy ? "Updating…" : "Set new password"}</button>
            </form>
        </div>
    );
}
