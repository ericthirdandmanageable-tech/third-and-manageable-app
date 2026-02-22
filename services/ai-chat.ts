/**
 * AI Chat History service — Firebase Firestore.
 * Persists "The Clipboard" conversations per day.
 *
 * Collection: "ai_chat_sessions" — one doc per user per day
 * Sub-collection: "ai_chat_sessions/{sessionId}/messages" — individual messages
 */
import { db } from "@/lib/firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    where,
} from "firebase/firestore";

export interface AIChatSession {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
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

// ─── Sessions ─────────────────────────────────────────────────────────

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get or create today's AI chat session for a user.
 */
export async function getOrCreateTodaySession(
  userId: string,
  mood: number | null = null,
): Promise<AIChatSession> {
  const today = todayDateStr();
  const docId = `${userId}_${today}`;

  const ref = doc(db, "ai_chat_sessions", docId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as AIChatSession;
  }

  // Create new session
  const data = {
    user_id: userId,
    date: today,
    mood,
    message_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, data);
  return { id: docId, ...data };
}

/**
 * Add a message to a session and increment the message count.
 */
export async function addMessageToSession(
  sessionId: string,
  role: "user" | "assistant",
  content: string,
): Promise<AIChatMessage> {
  const data = {
    role,
    content,
    created_at: new Date().toISOString(),
  };
  const ref = await addDoc(
    collection(db, "ai_chat_sessions", sessionId, "messages"),
    data,
  );

  // Update session message count and updated_at
  const sessionRef = doc(db, "ai_chat_sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);
  if (sessionSnap.exists()) {
    const currentCount = sessionSnap.data().message_count || 0;
    await setDoc(
      sessionRef,
      {
        message_count: currentCount + 1,
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  return { id: ref.id, ...data };
}

/**
 * Get all messages for a session, ordered by created_at.
 */
export async function getSessionMessages(
  sessionId: string,
): Promise<AIChatMessage[]> {
  try {
    const q = query(
      collection(db, "ai_chat_sessions", sessionId, "messages"),
      orderBy("created_at", "asc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AIChatMessage);
  } catch {
    return [];
  }
}

/**
 * Get past chat sessions for a user, ordered by date descending.
 */
export async function getChatSessions(
  userId: string,
  count: number = 30,
): Promise<AIChatSession[]> {
  try {
    // Equality-only query — sort client-side to avoid composite index
    const q = query(
      collection(db, "ai_chat_sessions"),
      where("user_id", "==", userId),
      limit(count * 2),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as AIChatSession)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, count);
  } catch {
    return [];
  }
}
