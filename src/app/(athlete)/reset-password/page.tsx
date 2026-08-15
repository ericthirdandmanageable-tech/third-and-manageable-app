"use client";

import { Suspense } from "react";
import RecoveryCompleteForm from "@/components/athlete/RecoveryCompleteForm";

export default function ResetPasswordPage() {
    return (
        <main className="safe-viewport relative flex items-center justify-center overflow-x-hidden bg-[#080a0d] px-5 text-white sm:px-8">
            <div className="pointer-events-none absolute inset-0 opacity-75 [background:radial-gradient(circle_at_15%_20%,rgba(200,240,75,0.12),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(139,147,248,0.09),transparent 32%)]" />
            <Suspense fallback={<p className="text-sm text-white/45">Loading reset link…</p>}>
                <RecoveryCompleteForm />
            </Suspense>
        </main>
    );
}
