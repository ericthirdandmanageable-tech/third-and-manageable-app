/**
 * Clipboard history compatibility adapter — authenticated web API.
 *
 * The server persists the canonical message stream. These session-shaped
 * functions keep the existing UI stable while daily-session grouping is
 * retired from new clients.
 */
import { mobileApi } from "@/lib/mobile-api";

export interface AIChatSession {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

type HistoryResponse = {
  messages: {
    id: string;
    role: "ai" | "user";
    text: string;
    created_at: string;
  }[];
};

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function history(): Promise<AIChatMessage[]> {
  const response = await mobileApi<HistoryResponse>("/clipboard/history");
  return response.messages.map((message) => ({
    id: message.id,
    role: message.role === "ai" ? "assistant" : "user",
    content: message.text,
    created_at: message.created_at,
  }));
}

export async function getOrCreateTodaySession(
  userId: string,
  mood: number | null = null,
): Promise<AIChatSession> {
  const messages = await history();
  const now = new Date().toISOString();
  return {
    id: "clipboard",
    user_id: userId,
    date: todayDateStr(),
    mood,
    message_count: messages.length,
    created_at: messages[0]?.created_at ?? now,
    updated_at: messages.at(-1)?.created_at ?? now,
  };
}

/** The chat endpoint persists both turns atomically; callers retain this no-op. */
export async function addMessageToSession(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<AIChatMessage> {
  void sessionId;
  return {
    id: `pending-${Date.now()}`,
    role,
    content,
    created_at: new Date().toISOString(),
  };
}

export async function getSessionMessages(
  sessionId: string,
): Promise<AIChatMessage[]> {
  void sessionId;
  try {
    return await history();
  } catch {
    return [];
  }
}

export async function getChatSessions(
  userId: string,
  count: number = 30,
): Promise<AIChatSession[]> {
  void count;
  const messages = await getSessionMessages("clipboard");
  if (!messages.length) return [];
  return [
    {
      id: "clipboard",
      user_id: userId,
      date: messages.at(-1)?.created_at.slice(0, 10) ?? todayDateStr(),
      mood: null,
      message_count: messages.length,
      created_at: messages[0].created_at,
      updated_at: messages.at(-1)?.created_at ?? messages[0].created_at,
    },
  ];
}
