import {
  GlassButton,
  GlassSurface,
  ScreenHeader,
} from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { ChatMessage, getChatResponse } from "@/lib/gemini";
import {
  addMessageToSession,
  getOrCreateTodaySession,
  getSessionMessages,
} from "@/services/ai-chat";
import { upsertProfile } from "@/services/auth";
import { getTodayCheckIn } from "@/services/checkin";
import type { AIPersonality } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PERSONAS: {
  id: AIPersonality;
  label: string;
  shortLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "chill", label: "The Friend", shortLabel: "Friend", icon: "cafe-outline" },
  { id: "analyst", label: "The Analyst", shortLabel: "Analyst", icon: "analytics-outline" },
  { id: "motivator", label: "The Hype Coach", shortLabel: "Hype", icon: "megaphone-outline" },
  { id: "mentor", label: "The Mentor", shortLabel: "Mentor", icon: "compass-outline" },
];

const QUICK_STARTS = [
  "Help me unpack today's check-in",
  "Translate one of my athlete skills",
  "Give me one small rep for this week",
];

const SEED: ChatMessage = {
  role: "assistant",
  content:
    "Hey—good to see you. We can unpack today, translate what sport taught you, or build one small next rep.",
};

export default function ClipboardScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useAppTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([SEED]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const personality = profile?.ai_personality ?? "chill";

  useEffect(() => {
    let active = true;
    if (!user?.$id) return;

    void Promise.all([
      getOrCreateTodaySession(user.$id),
      getTodayCheckIn(user.$id),
    ])
      .then(async ([session, checkIn]) => {
        const history = await getSessionMessages(session.id);
        if (!active) return;
        setSessionId(session.id);
        if (history.length > 0) {
          setMessages(
            history.map(({ role, content }) => ({ role, content })),
          );
        } else if (checkIn) {
          setMessages([
            {
              role: "assistant",
              content: `I saw today's check-in: ${checkIn.mood}/5. Want to unpack it, or turn it into one useful next step?`,
            },
          ]);
        }
      })
      .catch(() => {
        // The Clipboard remains useful in memory if Firestore is unavailable.
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.$id]);

  const setPersonality = useCallback(
    async (next: AIPersonality) => {
      if (!user?.$id || next === personality) return;
      void Haptics.selectionAsync();
      await upsertProfile({ id: user.$id, ai_personality: next });
      await refreshProfile();
    },
    [personality, refreshProfile, user?.$id],
  );

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || sending) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const nextMessages = [...messages, { role: "user" as const, content: text }];
      setMessages(nextMessages);
      setInput("");
      setSending(true);

      try {
        if (sessionId) {
          await addMessageToSession(sessionId, "user", text);
        }
        const reply = await getChatResponse(messages, text, {
          sport: profile?.sport,
          personality,
        });
        const assistant = { role: "assistant" as const, content: reply };
        setMessages((current) => [...current, assistant]);
        if (sessionId) {
          await addMessageToSession(sessionId, "assistant", reply);
        }
      } finally {
        setSending(false);
      }
    },
    [messages, personality, profile?.sport, sending, sessionId],
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const fromAthlete = item.role === "user";
    return (
      <View
        style={[
          styles.messageRow,
          fromAthlete ? styles.messageRowAthlete : styles.messageRowCoach,
        ]}
      >
        {!fromAthlete ? (
          <View style={[styles.avatar, { backgroundColor: colors.signal }]}>
            <Ionicons name="sparkles" size={14} color={colors.signalInk} />
          </View>
        ) : null}
        <GlassSurface
          tone={fromAthlete ? "signal" : "regular"}
          radius={20}
          style={[
            styles.message,
            fromAthlete
              ? {
                  backgroundColor: colors.signal,
                  borderColor: colors.signal,
                }
              : undefined,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: fromAthlete ? colors.signalInk : colors.textPrimary },
            ]}
          >
            {item.content}
          </Text>
        </GlassSurface>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScreenHeader
          eyebrow="Your private huddle"
          title="The Clipboard"
          subtitle="A steady coach for the space between who you were and what comes next."
          icon="sparkles-outline"
        />

        <View style={styles.personaRail}>
          {PERSONAS.map((item) => {
            const selected = item.id === personality;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={() => void setPersonality(item.id)}
                style={({ pressed }) => [
                  styles.persona,
                  {
                    backgroundColor: selected ? colors.signal : colors.surfaceStrong,
                    borderColor: selected ? colors.signal : colors.borderStrong,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={selected ? colors.signalInk : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.personaText,
                    { color: selected ? colors.signalInk : colors.textSecondary },
                  ]}
                >
                  {item.shortLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.signal} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(_, index) => `message-${index}`}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
            ListFooterComponent={
              messages.length <= 1 ? (
                <View style={styles.quickStarts}>
                  {QUICK_STARTS.map((prompt) => (
                    <GlassButton
                      key={prompt}
                      label={prompt}
                      variant="glass"
                      compact
                      onPress={() => void send(prompt)}
                      style={styles.quickStart}
                    />
                  ))}
                </View>
              ) : sending ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={colors.signal} />
                  <Text style={[styles.typingText, { color: colors.textSecondary }]}>Coach is thinking…</Text>
                </View>
              ) : null
            }
          />
        )}

        <GlassSurface tone="strong" radius={30} style={styles.composer}>
          <TextInput
            accessibilityLabel="Message The Clipboard"
            value={input}
            onChangeText={setInput}
            placeholder="Message The Clipboard…"
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={700}
            style={[styles.input, { color: colors.textPrimary }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!input.trim() || sending}
            onPress={() => void send(input)}
            style={({ pressed }) => [
              styles.send,
              {
                backgroundColor: colors.signal,
                opacity: !input.trim() || sending ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.signalInk} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.signalInk} />
            )}
          </Pressable>
        </GlassSurface>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  personaRail: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  persona: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  personaText: {
    fontFamily: "DMMono-Medium",
    fontSize: 8,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14 },
  messageRow: { flexDirection: "row", gap: 8, marginBottom: 14, maxWidth: "88%" },
  messageRowAthlete: { alignSelf: "flex-end" },
  messageRowCoach: { alignSelf: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  message: { paddingHorizontal: 15, paddingVertical: 12 },
  messageText: { fontFamily: "Raleway-Medium", fontSize: 14, lineHeight: 21 },
  quickStarts: { gap: 8, marginTop: 4, marginLeft: 38, alignItems: "flex-start" },
  quickStart: { minHeight: 40 },
  typing: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 38, marginTop: 4 },
  typingText: { fontFamily: "DMMono-Regular", fontSize: 10 },
  composer: {
    marginHorizontal: 14,
    marginBottom: Platform.OS === "ios" ? 92 : 82,
    minHeight: 58,
    paddingLeft: 18,
    paddingRight: 7,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    paddingTop: 12,
    paddingBottom: 10,
    fontFamily: "Raleway-Medium",
    fontSize: 14,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
