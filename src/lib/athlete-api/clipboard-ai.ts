import { createHash } from "node:crypto";

import { generateText } from "ai";

export const CLIPBOARD_MODEL = "google/gemini-3.6-flash";

export const PERSONAS: Record<string, string> = {
    friend: "Tone: Calm, relaxed, conversational. Talk like a laid-back friend who genuinely cares. Use casual language. No pressure, just presence.",
    analyst: "Tone: Thoughtful, reflective, structured. Help the user break things down logically. Offer clear frameworks and observations. Be insightful but warm.",
    hype: "Tone: Upbeat, energetic, hype-coach energy. Use encouraging phrases like 'Let's go!', 'You've got this!', 'Keep pushing forward!'. Be enthusiastic but genuine.",
    mentor: "Tone: Wise, experienced, steady. Speak like a trusted older advisor who has seen it all. Share perspective with patience and care.",
};

export const SAFETY_TEMPLATE =
    "You are The Clipboard, a helpful coach for athletes transitioning out of sport. " +
    "If the user expresses intent to harm themselves or others, do not coach; respond " +
    "briefly and gently direct them to call 911 or call/text 988 (US Suicide & Crisis Lifeline).\n" +
    "{persona}\n" +
    "{adaptation}";

export interface ClipboardTurn {
    role: "user" | "ai";
    text: string;
}

export function summarizeAdaptation(history: ClipboardTurn[]): string {
    const recentUser = history.filter((message) => message.role === "user").slice(-4);
    if (!recentUser.length) return "";
    const averageLength = recentUser.reduce((sum, message) => sum + message.text.length, 0) / recentUser.length;
    if (averageLength < 20) {
        return "User Profile Update: The user gives very short answers. They may be experiencing journaling fatigue.\n" +
            "Tone Directive: Pivot to closed-ended, multiple-choice style questions. Offer options.";
    }
    if (averageLength >= 120) {
        return "User Profile Update: The user is reflective and willing to journal.\n" +
            "Tone Directive: Act as 'The Analyst'. Be thoughtful, reflective, and structured. Help them break things down logically.";
    }
    return "";
}

export function fallbackReply(history: ClipboardTurn[]) {
    const lastUser = [...history].reverse().find((message) => message.role === "user");
    const text = lastUser?.text ?? "";
    if (history.length <= 2) {
        if (text.length < 20) {
            return {
                text: "I hear you. Rest days can be tough. Which of these sounds most like what you're feeling right now?",
                options: [
                    "I feel guilty for not working out.",
                    "My body hurts, so I know I need it.",
                    "I'm just bored without practice.",
                ],
            };
        }
        return {
            text: "That makes a lot of sense. It sounds like you're navigating the tension between your old schedule and your new reality. Let's break that down. What's one thing you miss about the old routine, and one thing you enjoy about having free time today?",
            options: [] as string[],
        };
    }
    return { text: "Thanks for sharing that. I'm taking note of how you're feeling.", options: [] as string[] };
}

type Generate = typeof generateText;

export async function clipboardReply(
    history: ClipboardTurn[],
    personaId: string,
    userId: string,
    generate: Generate = generateText,
): Promise<{ text: string; options: string[] }> {
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
        return fallbackReply(history);
    }
    const adaptation = summarizeAdaptation(history);
    const system = SAFETY_TEMPLATE
        .replace("{persona}", PERSONAS[personaId] ?? PERSONAS.friend)
        .replace("{adaptation}", adaptation);
    try {
        const result = await generate({
            model: CLIPBOARD_MODEL,
            system,
            messages: history.map((message) => ({
                role: message.role === "ai" ? "assistant" as const : "user" as const,
                content: message.text,
            })),
            maxOutputTokens: 500,
            providerOptions: {
                gateway: {
                    user: createHash("sha256").update(userId).digest("hex"),
                    tags: ["feature:clipboard", `env:${process.env.VERCEL_ENV ?? "development"}`],
                },
            },
        });
        const text = result.text.trim();
        return text ? { text, options: [] } : fallbackReply(history);
    } catch {
        return fallbackReply(history);
    }
}
