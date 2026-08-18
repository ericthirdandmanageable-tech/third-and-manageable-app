"use client";

import { useState } from "react";
import { CheckCircle2, Phone, Users, Wrench } from "lucide-react";

import { api } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";

/*
 * Support (REDESIGN_BRIEF §13) — crisis surfaces are non-negotiable and
 * permanently reachable. Verified copy preserved from the shipped app.
 * Both request buttons hit real endpoints — a success message here means
 * something actually happened.
 */
export default function SupportPage() {
    const { user } = useAuth();
    const [peerNotified, setPeerNotified] = useState(false);
    const [peerBusy, setPeerBusy] = useState(false);
    const [techMessage, setTechMessage] = useState("");
    const [techSent, setTechSent] = useState(false);
    const [techBusy, setTechBusy] = useState(false);

    const requestPeer = async () => {
        setPeerBusy(true);
        const res = await api.peerSupport();
        setPeerBusy(false);
        if (res) setPeerNotified(true);
    };

    const sendTech = async () => {
        if (techMessage.trim().length < 3) return;
        setTechBusy(true);
        const res = await api.techSupport(techMessage.trim());
        setTechBusy(false);
        if (res) setTechSent(true);
    };

    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto animate-rise">
            <header className="mb-8">
                <h1 className="font-serif text-4xl text-sand italic mb-2">Support</h1>
                <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                    We&apos;re here to help
                </p>
                <div className="yard-line mt-4" />
            </header>

            {/* Crisis — always first, always visible */}
            <section className="bg-danger/10 border border-danger/40 rounded-[20px] p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-danger/20 flex items-center justify-center shrink-0">
                        <Phone className="w-5 h-5 text-danger" />
                    </div>
                    <div>
                        <h2 className="text-[17px] font-semibold text-text-primary mb-1">
                            In crisis right now?
                        </h2>
                        <p className="text-[15px] text-text-secondary leading-relaxed">
                            If you or someone you know is in immediate danger, call{" "}
                            <span className="font-mono text-text-primary">911</span> or call/text{" "}
                            <span className="font-mono text-text-primary">988</span> for the Suicide
                            &amp; Crisis Lifeline.
                        </p>
                    </div>
                </div>
            </section>

            {/* Peer support */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-volt/10 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-volt" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-semibold text-text-primary mb-1">
                            Peer support
                        </h2>
                        <p className="text-[15px] text-text-secondary mb-4">
                            A verified athlete who has been through it will reach out.
                        </p>
                        {!user ? (
                            <p className="text-[13px] text-text-tertiary">
                                Sign in first — a peer can&apos;t reach you without an account.
                            </p>
                        ) : !peerNotified ? (
                            <button
                                onClick={requestPeer}
                                disabled={peerBusy}
                                className="bg-volt text-volt-ink font-semibold px-5 py-2.5 rounded-full text-[15px] hover:bg-volt/90 disabled:opacity-50 transition-all"
                            >
                                {peerBusy ? "Notifying…" : "I need peer support right now."}
                            </button>
                        ) : (
                            <p className="flex items-center gap-2 text-[15px] text-volt animate-disclosure">
                                <CheckCircle2 className="w-5 h-5" /> We&apos;ve notified the
                                community. A peer will reach out soon.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Technical support */}
            <section className="bg-bg-surface rounded-[20px] border border-border-subtle p-6">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5 text-text-secondary" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[17px] font-semibold text-text-primary mb-1">
                            Technical support
                        </h2>
                        <p className="text-[15px] text-text-secondary mb-4">
                            Something broken or not working as expected?
                        </p>
                        {!user ? (
                            <p className="text-[13px] text-text-tertiary">
                                Sign in first — we&apos;ll need a way to follow up with you.
                            </p>
                        ) : !techSent ? (
                            <div className="space-y-3">
                                <textarea
                                    value={techMessage}
                                    aria-label="Describe the problem"
                                    onChange={(e) => setTechMessage(e.target.value)}
                                    placeholder="What happened? Screens, buttons, error text — anything helps."
                                    className="w-full h-24 bg-bg-elevated border border-border-subtle rounded-2xl p-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt resize-none transition-all"
                                />
                                <button
                                    onClick={sendTech}
                                    disabled={techBusy || techMessage.trim().length < 3}
                                    className="bg-bg-elevated border border-border-subtle text-text-primary font-medium px-5 py-2.5 rounded-full text-[15px] hover:border-text-tertiary disabled:opacity-40 transition-all"
                                >
                                    {techBusy ? "Sending…" : "Send it our way"}
                                </button>
                            </div>
                        ) : (
                            <p className="flex items-center gap-2 text-[15px] text-volt animate-disclosure">
                                <CheckCircle2 className="w-5 h-5" /> Request sent. We&apos;ll be in
                                touch.
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
