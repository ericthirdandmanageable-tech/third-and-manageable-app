import { AIPersonality } from "@/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "",
);

const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
  generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
});

// ─── Personality Definitions ────────────────────────────────────────────

const PERSONALITY_PROMPTS: Record<AIPersonality, string> = {
  motivator: `Tone: Upbeat, energetic, hype-coach energy. Use encouraging phrases like "Let's go!", "You've got this!", "Keep pushing forward!". Be enthusiastic but genuine.`,
  chill: `Tone: Calm, relaxed, conversational. Talk like a laid-back friend who genuinely cares. Use casual language. No pressure, just presence.`,
  analyst: `Tone: Thoughtful, reflective, structured. Help the user break things down logically. Offer clear frameworks and observations. Be insightful but warm.`,
  mentor: `Tone: Wise, experienced, steady. Speak like a trusted older advisor who has seen it all. Share perspective with patience and care.`,
  huddle: `Tone: High-energy locker room hype with football terminology woven in naturally. Use phrases like "time to run the play", "move the chains", "you're in the red zone", "audible if you need to", "fourth quarter mentality". Talk like an upbeat teammate hyping them up before the big drive. Keep it fun, loud, and encouraging — like a halftime speech that actually hits.`,
};

function getPersonalityPrompt(personality?: AIPersonality): string {
  return PERSONALITY_PROMPTS[personality ?? "motivator"];
}

const BASE_SYSTEM_PROMPT = `You are "The Clipboard" — a supportive AI companion inside the "Third & Manageable" app, which helps athletes rebuild confidence, structure, and momentum after competitive sport.

Rules:
- Keep responses concise (2-3 sentences max)
- Acknowledge feelings without judgment
- Offer a small, actionable insight or encouragement
- Never be preachy or overly positive — be real and grounded
- Do NOT use sport-specific jargon or terminology unless the user brings it up first
- Mood scale: 1 = Struggling, 2 = Tough day, 3 = Okay, 4 = Good, 5 = Great`;

export async function getAIResponse(
  mood: number,
  note: string | null,
  sportLabel?: string,
  personality?: AIPersonality,
): Promise<string> {
  try {
    const moodLabels = ["Struggling", "Tough day", "Okay", "Good", "Great"];
    const moodLabel = moodLabels[mood - 1] ?? "Unknown";

    let prompt = `${BASE_SYSTEM_PROMPT}\n${getPersonalityPrompt(personality)}\n\nThe athlete checked in with mood: ${moodLabel} (${mood}/5).`;
    if (note) {
      prompt += `\nThey shared: "${note}"`;
    }
    if (sportLabel) {
      prompt += `\nTheir sport background: ${sportLabel}`;
    }
    prompt += "\n\nRespond with a brief, supportive message:";

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini AI error:", err);
    return "Thanks for checking in today. Remember, showing up is what matters most — you're doing it right now.";
  }
}

// ─── Conversational Chat ─────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHAT_SYSTEM_PROMPT = `You are "The Clipboard" — a warm, empathetic AI companion inside the "Third & Manageable" app, helping athletes going through transition out of competitive sport.

You are having a follow-up conversation after their daily check-in. Your role:
- Listen actively and validate their feelings
- Ask thoughtful follow-up questions to help them process their feelings
- Offer practical, actionable advice when appropriate
- Keep responses conversational and concise (2-3 sentences)
- Be real and grounded — not overly cheerful or dismissive
- Do NOT use sport-specific jargon or terminology unless the user brings it up first
- Remember context from earlier in the conversation
- If they seem to be in crisis, gently suggest they use the "Need Support Now" feature

Never be preachy. Be the companion they need.`;

/**
 * Send a message to the AI coach and get a conversational reply.
 * Maintains conversation history for multi-turn context.
 */
export async function getChatResponse(
  history: ChatMessage[],
  userMessage: string,
  context?: { mood?: number; sport?: string; personality?: AIPersonality },
): Promise<string> {
  try {
    const moodLabels = ["Struggling", "Tough day", "Okay", "Good", "Great"];
    let contextStr = "";
    if (context?.mood) {
      contextStr += `\nAthlete's mood today: ${moodLabels[context.mood - 1] ?? "Unknown"} (${context.mood}/5).`;
    }
    if (context?.sport) {
      contextStr += `\nTheir sport: ${context.sport}.`;
    }

    const personalityStr = `\n${getPersonalityPrompt(context?.personality)}`;

    // Only include last 10 messages to keep prompt small and fast
    const recentHistory = history.slice(-10);

    let prompt =
      CHAT_SYSTEM_PROMPT +
      personalityStr +
      contextStr +
      "\n\n--- Conversation ---\n";
    for (const msg of recentHistory) {
      const prefix = msg.role === "user" ? "Athlete" : "The Clipboard";
      prompt += `${prefix}: ${msg.content}\n`;
    }
    prompt += `Athlete: ${userMessage}\nThe Clipboard:`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini chat error:", err);
    return "I'm here for you. Could you tell me a bit more about what's on your mind?";
  }
}
