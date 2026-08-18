/**
 * Compatibility facade for Clipboard UI callers.
 * Gemini runs only behind the authenticated Next.js API; no provider key or
 * model SDK is shipped in the Expo bundle.
 */
import { mobileApi } from "@/lib/mobile-api";
import type { AIPersonality } from "@/types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const PERSONA: Partial<Record<AIPersonality, string>> = {
  analyst: "analyst",
  chill: "friend",
  huddle: "hype",
  mentor: "mentor",
  motivator: "hype",
};

export async function getChatResponse(
  history: ChatMessage[],
  userMessage: string,
  context?: { mood?: number; sport?: string; personality?: AIPersonality },
): Promise<string> {
  void history;
  void context?.mood;
  void context?.sport;
  const response = await mobileApi<{ text: string }>("/clipboard/chat", {
    method: "POST",
    body: {
      message: userMessage,
      persona: PERSONA[context?.personality ?? "chill"] ?? "friend",
    },
  });
  return response.text;
}
