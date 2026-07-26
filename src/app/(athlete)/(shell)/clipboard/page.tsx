"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, RotateCcw, Send, User } from "lucide-react";
import clsx from "clsx";

import { Icon } from "@/components/athlete/icons";
import { api, authStorage } from "@/lib/athlete/api";
import { useAuth } from "@/lib/athlete/auth";
import { DEFAULT_PERSONA_ID, PERSONAS, getPersona } from "@/lib/core/personas";

interface ChatMessage {
    id: string;
    sender: "user" | "ai";
    text: string;
    options?: string[];
}

/* The seed message used when there's no history yet. Neutral by default —
 * replaced with a nod to today's actual check-in when there is one. */
const NEUTRAL_SEED: ChatMessage = {
    id: "seed",
    sender: "ai",
    text: "Hey! Good to see you. How are you arriving today — still in the jersey, or figuring out what's next?",
};

export default function ClipboardChatPage() {
    const { user } = useAuth();
    const [persona, setPersona] = useState<string>(DEFAULT_PERSONA_ID);
    const [messages, setMessages] = useState<ChatMessage[]>([NEUTRAL_SEED]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    /* Local ids for messages the backend has not assigned one to yet. A
     * counter, not `Date.now()`: these only need to be unique React keys, and
     * two messages in the same millisecond would collide. */
    const localId = useRef(0);
    const nextLocalId = useCallback(() => `local-${(localId.current += 1)}`, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Hydrate history from the backend when authenticated; otherwise ground
    // the seed message in today's real check-in, if there is one.
    useEffect(() => {
        (async () => {
            if (!authStorage.getToken()) return;
            const h = await api.clipboardHistory();
            if (h && h.messages.length) {
                setMessages(
                    h.messages.map((m, i) => ({
                        id: m.id || `history-${i}`,
                        sender: m.role as "user" | "ai",
                        text: m.text,
                    })),
                );
                return;
            }
            const today = await api.todaysCheckIn();
            if (today?.option) {
                setMessages([
                    {
                        id: "seed",
                        sender: "ai",
                        text: `Hey! Saw your check-in today — "${today.option}". Want to unpack that, or talk game plan?`,
                    },
                ]);
            }
        })();
    }, [user]);

    const clearChat = async () => {
        if (authStorage.getToken()) {
            await api.clipboardClear();
        }
        setMessages([NEUTRAL_SEED]);
        setInput("");
    };

    const sendUserMessage = async (text: string) => {
        if (!text.trim() || isTyping) return;

        const newUserMsg: ChatMessage = { id: nextLocalId(), sender: "user", text };
        setMessages((prev) => [...prev, newUserMsg]);
        setInput("");
        setIsTyping(true);

        let aiResponse: ChatMessage;
        if (authStorage.getToken()) {
            const res = await api.clipboardChat(text, persona);
            if (res) {
                aiResponse = {
                    id: res.id || nextLocalId(),
                    sender: "ai",
                    text: res.text,
                    options: res.options,
                };
                setMessages((prev) => [...prev, aiResponse]);
                setIsTyping(false);
                return;
            }
        }

        // Offline / unauthed fallback — local invisible-adaptation mock
        await new Promise((r) => setTimeout(r, 1500));
        if (messages.length === 1) {
            if (text.length < 20) {
                aiResponse = {
                    id: nextLocalId(),
                    sender: "ai",
                    text: "I hear you. Rest days can be tough. Which of these sounds most like what you're feeling right now?",
                    options: [
                        "I feel guilty for not working out.",
                        "My body hurts, so I know I need it.",
                        "I'm just bored without practice.",
                    ],
                };
            } else {
                aiResponse = {
                    id: nextLocalId(),
                    sender: "ai",
                    text: "That makes a lot of sense. It sounds like you're navigating the tension between your old schedule and your new reality. What's one thing you miss, and one thing you enjoy about free time today?",
                };
            }
        } else {
            aiResponse = {
                id: nextLocalId(),
                sender: "ai",
                text: "Thanks for sharing that. I'm taking note of how you're feeling. (This is a prototype mockup.)",
            };
        }
        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);
    };

    return (
        <div className="flex h-full relative">
            <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full">
                <header className="px-6 py-4 border-b border-border-subtle bg-bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-volt flex items-center justify-center shrink-0">
                                <ClipboardList className="w-5 h-5 text-volt-ink" />
                            </div>
                            <div>
                                <h1 className="font-semibold text-text-primary">The Clipboard</h1>
                                <p className="font-mono text-[11px] uppercase tracking-widest text-text-tertiary">
                                    {getPersona(persona).label}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 bg-bg-elevated border border-border-subtle rounded-full p-1">
                                {PERSONAS.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPersona(p.id)}
                                            title={p.label}
                                            aria-label={p.label}
                                            aria-pressed={persona === p.id}
                                            className={clsx(
                                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                persona === p.id
                                                    ? "bg-volt text-volt-ink"
                                                    : "text-text-tertiary hover:text-text-primary",
                                            )}
                                        >
                                            <Icon name={p.icon} className="w-4 h-4" />
                                        </button>
                                    ))}
                            </div>
                            <button
                                onClick={clearChat}
                                title="Start a fresh conversation"
                                aria-label="Start a fresh conversation"
                                className="w-9 h-9 rounded-full bg-bg-elevated border border-border-subtle text-text-tertiary hover:text-volt hover:border-volt flex items-center justify-center transition-all"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex gap-3 max-w-[85%]",
                                msg.sender === "user" ? "ml-auto flex-row-reverse" : "",
                            )}
                        >
                            <div
                                className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                    msg.sender === "ai"
                                        ? "bg-volt"
                                        : "bg-bg-elevated border border-border-subtle",
                                )}
                            >
                                {msg.sender === "ai" ? (
                                    <ClipboardList className="w-4 h-4 text-volt-ink" />
                                ) : (
                                    <User className="w-4 h-4 text-text-secondary" />
                                )}
                            </div>
                            <div
                                className={clsx(
                                    "flex flex-col gap-2",
                                    msg.sender === "user" ? "items-end" : "items-start",
                                )}
                            >
                                <div
                                    className={clsx(
                                        "p-4 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap",
                                        msg.sender === "user"
                                            ? "bg-volt text-volt-ink rounded-tr-sm"
                                            : "bg-bg-elevated border border-border-subtle text-text-primary rounded-tl-sm",
                                    )}
                                >
                                    {msg.text}
                                </div>
                                {msg.options && (
                                    <div className="flex flex-col gap-2 w-full animate-disclosure">
                                        {msg.options.map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => sendUserMessage(opt)}
                                                className="text-left px-4 py-3 rounded-full border border-border-subtle bg-bg-surface text-[13px] text-text-secondary hover:border-volt hover:text-volt transition-all"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-volt flex items-center justify-center shrink-0">
                                <ClipboardList className="w-4 h-4 text-volt-ink" />
                            </div>
                            <div className="bg-bg-elevated border border-border-subtle p-4 rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                                <div
                                    className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"
                                    style={{ animationDelay: "0ms" }}
                                />
                                <div
                                    className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"
                                    style={{ animationDelay: "150ms" }}
                                />
                                <div
                                    className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"
                                    style={{ animationDelay: "300ms" }}
                                />
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <div className="p-4 bg-bg-surface border-t border-border-subtle">
                    <div className="relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            aria-label="Message The Clipboard"
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendUserMessage(input)}
                            placeholder="Message The Clipboard..."
                            disabled={isTyping}
                            className="w-full bg-bg-elevated border border-border-subtle text-text-primary text-[15px] rounded-full py-3 pl-5 pr-14 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-all disabled:opacity-50 placeholder:text-text-tertiary"
                        />
                        <button
                            onClick={() => sendUserMessage(input)}
                            disabled={!input.trim() || isTyping}
                            aria-label="Send"
                            className="absolute right-2 w-10 h-10 rounded-full bg-volt text-volt-ink flex items-center justify-center hover:bg-volt/90 transition-all disabled:opacity-40"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
