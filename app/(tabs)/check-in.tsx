import { SkeletonCard } from "@/components/SkeletonLoader";
import { GlassListSurface, GlassSurface } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { SPORTS } from "@/constants/sports";
import { useAuth } from "@/context/auth";
import { ChatMessage, getChatResponse } from "@/lib/gemini";
import {
  addMessageToSession,
  AIChatSession,
  getChatSessions,
  getOrCreateTodaySession,
  getSessionMessages,
} from "@/services/ai-chat";
import {
  createCheckIn,
  getTodayCheckIn,
  updateStreak,
} from "@/services/checkin";
import { AIPersonality, CheckIn, SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MOODS = [
  {
    value: 1,
    icon: require("../../assets/icons/mood-struggling.png"),
    label: "Struggling",
  },
  {
    value: 2,
    icon: require("../../assets/icons/mood-tough.png"),
    label: "Tough",
  },
  {
    value: 3,
    icon: require("../../assets/icons/mood-okay.png"),
    label: "Okay",
  },
  {
    value: 4,
    icon: require("../../assets/icons/mood-good.png"),
    label: "Good",
  },
  {
    value: 5,
    icon: require("../../assets/icons/mood-great.png"),
    label: "Great",
  },
] as { value: number; icon: ImageSourcePropType; label: string }[];

const MOOD_LABELS: Record<number, string> = {
  1: "Struggling",
  2: "Tough",
  3: "Okay",
  4: "Good",
  5: "Great",
};

function formatSessionDate(dateStr: string): string {
  const today = new Date();
  const sessionDate = new Date(dateStr + "T00:00:00");
  const diffMs = today.getTime() - sessionDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return sessionDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CheckInScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, reduceMotion } = useAppTheme();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [checkingToday, setCheckingToday] = useState(true);

  // Keyboard tracking — WhatsApp-style: track actual keyboard height
  const [bottomInset, setBottomInset] = useState(
    Platform.OS === "ios" ? 90 : 85,
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) =>
      setBottomInset(e.endCoordinates.height + 15),
    );
    const hideSub = Keyboard.addListener(hideEvent, () =>
      setBottomInset(Platform.OS === "ios" ? 90 : 85),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Chat state
  const [chatMode, setChatMode] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const chatListRef = useRef<FlatList>(null);

  // History state
  const [historyMode, setHistoryMode] = useState(false);
  const [pastSessions, setPastSessions] = useState<AIChatSession[]>([]);
  const [viewingSession, setViewingSession] = useState<AIChatSession | null>(
    null,
  );
  const [viewingMessages, setViewingMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Check today's check-in on mount and every time screen gains focus
  const checkToday = useCallback(() => {
    if (!user?.$id) return;
    getTodayCheckIn(user.$id).then((ci) => {
      if (ci) {
        setTodayCheckIn(ci);
        setAiResponse(ci.ai_response);
        setSelectedMood(ci.mood);
      }
      setCheckingToday(false);
    });
  }, [user]);

  useEffect(() => {
    checkToday();
  }, [checkToday]);

  useFocusEffect(
    useCallback(() => {
      checkToday();
    }, [checkToday]),
  );

  const handleSubmit = async () => {
    if (!selectedMood || !user?.$id) return;

    setLoading(true);
    try {
      const checkIn = await createCheckIn(
        user.$id,
        selectedMood,
        note.trim() || null,
        null,
        sport?.label,
        profile?.ai_personality as AIPersonality | undefined,
      );
      setAiResponse(checkIn.ai_response);
      setTodayCheckIn(checkIn);

      await updateStreak(user.$id);
      await refreshProfile();

      // The check-in route owns check-in and streak notifications.
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save check-in.");
    } finally {
      setLoading(false);
    }
  };

  // Start chat mode — load or create today's session
  const startChat = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const session = await getOrCreateTodaySession(
        user.$id,
        todayCheckIn?.mood ?? null,
      );
      setChatSessionId(session.id);

      // Load existing messages from Firestore
      const savedMessages = await getSessionMessages(session.id);
      const initial: ChatMessage[] = savedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // If no messages but there's an AI response, add it as the first message
      if (initial.length === 0 && aiResponse) {
        initial.push({ role: "assistant", content: aiResponse });
        await addMessageToSession(session.id, "assistant", aiResponse);
      }

      setChatHistory(initial);
      setChatMode(true);
    } catch {
      // Fallback to in-memory chat if Firestore fails
      const initial: ChatMessage[] = [];
      if (aiResponse) {
        initial.push({ role: "assistant", content: aiResponse });
      }
      setChatHistory(initial);
      setChatMode(true);
    }
  }, [user, aiResponse, todayCheckIn]);

  // Send a chat message
  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatSending(true);

    // Persist user message
    if (chatSessionId) {
      addMessageToSession(chatSessionId, "user", text).catch(() => { });
    }

    try {
      const reply = await getChatResponse([...chatHistory, userMsg], text, {
        mood: todayCheckIn?.mood,
        sport: sport?.label,
        personality: profile?.ai_personality as AIPersonality | undefined,
      });
      const assistantMsg: ChatMessage = { role: "assistant", content: reply };
      setChatHistory((prev) => [...prev, assistantMsg]);

      // Persist assistant message
      if (chatSessionId) {
        addMessageToSession(chatSessionId, "assistant", reply).catch(() => { });
      }
    } catch {
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: "I'm here for you. Could you tell me a bit more?",
      };
      setChatHistory((prev) => [...prev, errorMsg]);
    } finally {
      setChatSending(false);
    }
  }, [
    chatInput,
    chatSending,
    chatHistory,
    todayCheckIn,
    sport,
    chatSessionId,
    profile,
  ]);

  // Load chat history
  const loadHistory = useCallback(async () => {
    if (!user?.$id) return;
    setLoadingHistory(true);
    try {
      const sessions = await getChatSessions(user.$id);
      setPastSessions(sessions.filter((s) => s.message_count > 0));
    } catch {
      setPastSessions([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  // View a specific past session
  const viewSession = useCallback(async (session: AIChatSession) => {
    setViewingSession(session);
    try {
      const messages = await getSessionMessages(session.id);
      setViewingMessages(
        messages.map((m) => ({ role: m.role, content: m.content })),
      );
    } catch {
      setViewingMessages([]);
    }
  }, []);

  // Render a chat bubble
  const renderChatMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    return (
      <View className={`mb-3 px-4 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <View className="flex-row items-center mb-1">
            <Ionicons name="sparkles" size={12} color={colors.signal} />
            <Text className="text-[10px] font-raleway-bold text-dp-500 ml-1">
              The Clipboard
            </Text>
          </View>
        )}
        <GlassListSurface
          tone={isUser ? "signal" : "regular"}
          radius={18}
          className={`rounded-2xl px-4 py-3 max-w-[85%] ${isUser ? "bg-dp-600" : "bg-app-surface"
            }`}
          style={
            isUser
              ? undefined
              : {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }
          }
        >
          <Text
            className={`text-sm leading-5 ${isUser ? "text-white" : "text-silver-800"
              }`}
          >
            {item.content}
          </Text>
        </GlassListSurface>
      </View>
    );
  };

  if (checkingToday) {
    return (
      <SafeAreaView className="flex-1 bg-transparent">
        <View style={{ width: "100%", maxWidth: 900, alignSelf: "center", padding: 20 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Chat History View ──────────────────────────────────────────────
  if (historyMode) {
    if (viewingSession) {
      // Viewing a specific past session
      return (
        <SafeAreaView
          className="flex-1 bg-transparent"
          edges={["top"]}
          style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}
        >
          {/* Header */}
          <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => {
                setViewingSession(null);
                setViewingMessages([]);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              <Text className="text-sm font-raleway-bold text-silver-700 ml-1">
                Back
              </Text>
            </TouchableOpacity>
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={16} color={colors.signal} />
              <Text className="text-base font-raleway-extrabold text-silver-900 ml-1.5">
                {formatSessionDate(viewingSession.date)}
              </Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* Mood badge */}
          {viewingSession.mood && (
            <View className="px-5 mb-2">
              <View className="bg-dp-50 self-start rounded-full px-3 py-1.5 flex-row items-center">
                <Text className="text-xs font-raleway-bold text-dp-600">
                  Feeling {MOOD_LABELS[viewingSession.mood] ?? "Okay"}
                </Text>
              </View>
            </View>
          )}

          {/* Messages */}
          <FlatList
            data={viewingMessages}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderChatMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-10 px-8">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text className="text-sm text-silver-400 text-center mt-3">
                  No messages in this session.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      );
    }

    // History list
    return (
      <SafeAreaView
        className="flex-1 bg-transparent"
        edges={["top"]}
        style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}
      >
        {/* Header */}
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => setHistoryMode(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            <Text className="text-sm font-raleway-bold text-silver-700 ml-1">
              Back
            </Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={18} color={colors.signal} />
            <Text className="text-base font-raleway-extrabold text-silver-900 ml-1.5">
              Chat History
            </Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {loadingHistory ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.signal} />
          </View>
        ) : pastSessions.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text className="text-base font-raleway-bold text-silver-400 mt-3 text-center">
              No past conversations
            </Text>
            <Text className="text-sm text-silver-400 text-center mt-1">
              Your conversations with The Clipboard will appear here after you
              chat.
            </Text>
          </View>
        ) : (
          <FlatList
            data={pastSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="bg-app-surface rounded-2xl p-4 mb-3"
                style={{
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                }}
                onPress={() => viewSession(item)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center">
                    <Ionicons name="sparkles" size={14} color={colors.signal} />
                    <Text className="text-sm font-raleway-bold text-silver-900 ml-1.5">
                      {formatSessionDate(item.date)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </View>
                <View className="flex-row items-center">
                  {item.mood && (
                    <View className="bg-dp-50 rounded-full px-2 py-0.5 mr-2">
                      <Text className="text-[10px] font-raleway-bold text-dp-600">
                        {MOOD_LABELS[item.mood] ?? "Okay"}
                      </Text>
                    </View>
                  )}
                  <Text className="text-xs text-silver-400">
                    {item.message_count} messages
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Chat Mode ───────────────────────────────────────────────────
  if (todayCheckIn && chatMode) {
    return (
      <SafeAreaView className="flex-1 bg-transparent" edges={["top"]}>
        <View
          className="flex-1"
          style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}
        >
          {/* Chat Header */}
          <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setChatMode(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              <Text className="text-sm font-raleway-bold text-silver-700 ml-1">
                Back
              </Text>
            </TouchableOpacity>
            <View className="flex-row items-center">
              <Ionicons name="sparkles" size={16} color={colors.signal} />
              <Text className="text-base font-raleway-extrabold text-silver-900 ml-1.5">
                The Clipboard
              </Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* Chat Messages */}
          <FlatList
            ref={chatListRef}
            data={chatHistory}
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderChatMessage}
            contentContainerStyle={{ paddingVertical: 12 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              chatListRef.current?.scrollToEnd({ animated: !reduceMotion })
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-10 px-8">
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={40}
                  color={colors.textTertiary}
                />
                <Text className="text-sm text-silver-400 text-center mt-3">
                  Tell The Clipboard what&apos;s on your mind. It&apos;s here to
                  listen.
                </Text>
              </View>
            }
          />

          {/* Typing indicator */}
          {chatSending && (
            <View className="px-4 pb-2 flex-row items-center">
              <Ionicons name="sparkles" size={12} color={colors.signal} />
              <Text className="text-xs text-dp-500 font-raleway-semibold ml-1">
                Coach is typing...
              </Text>
            </View>
          )}

          {/* Chat Input — floats above keyboard when open, above tab bar when closed */}
          <View
            className="px-4 py-3 bg-app-surface border-t border-silver-100"
            style={{
              paddingBottom: bottomInset,
            }}
          >
            <View className="flex-row items-end">
              <TextInput
                className="flex-1 bg-silver-50 rounded-2xl px-4 py-3 text-sm text-silver-900 mr-2"
                style={{ maxHeight: 100, fontFamily: "Raleway-Regular" }}
                placeholder="Talk to your coach..."
                placeholderTextColor={colors.textTertiary}
                multiline
                value={chatInput}
                onChangeText={setChatInput}
                maxLength={500}
              />
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${chatInput.trim() ? "bg-dp-600" : "bg-silver-200"
                  }`}
                onPress={handleChatSend}
                disabled={!chatInput.trim() || chatSending}
                activeOpacity={0.8}
              >
                {chatSending ? (
                  <ActivityIndicator size="small" color={colors.inverseText} />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={chatInput.trim() ? colors.inverseText : colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Completed Check-In View ─────────────────────────────────────
  if (todayCheckIn) {
    const moodInfo = MOODS.find((m) => m.value === todayCheckIn.mood);
    return (
      <SafeAreaView className="flex-1 bg-transparent">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            width: "100%",
            maxWidth: 900,
            alignSelf: "center",
            padding: 20,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Banner */}
          <View style={{ marginBottom: 20 }}>
            <ImageBackground
              source={require("../../assets/images/checkin-hero.png")}
              style={{
                width: "100%",
                height: 200,
                borderRadius: 24,
                overflow: "hidden",
              }}
              resizeMode="cover"
            >
              <LinearGradient
                colors={["transparent", `${colors.signalDark}D9`]}
                locations={[0.3, 1]}
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  padding: 20,
                }}
              >
                <Text
                  style={{
                    color: `${colors.inverseText}99`,
                    fontSize: 12,
                    fontFamily: "Raleway-SemiBold",
                    marginBottom: 4,
                  }}
                >
                  Today&apos;s Check-In
                </Text>
                <Text
                  style={{
                    color: colors.inverseText,
                    fontSize: 24,
                    fontFamily: "Raleway-ExtraBold",
                  }}
                >
                  All Done
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>

          {/* Mood summary */}
          <GlassSurface
            className="bg-app-surface rounded-3xl p-6 mb-4 items-center"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Image
              source={
                moodInfo?.icon ?? require("../../assets/icons/mood-okay.png")
              }
              style={{ width: 52, height: 52, marginBottom: 12 }}
              resizeMode="contain"
            />
            <Text className="text-lg font-raleway-bold text-silver-900 mb-1">
              Feeling {moodInfo?.label ?? "Okay"}
            </Text>
            {todayCheckIn.note ? (
              <Text className="text-sm text-silver-500 text-center mt-1 italic">
                {`"${todayCheckIn.note}"`}
              </Text>
            ) : null}
          </GlassSurface>

          {/* AI Response */}
          {aiResponse ? (
            <View
              className="bg-dp-700 rounded-3xl p-5 mb-4"
              style={{
                shadowColor: colors.signalDark,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center mb-3">
                <View className="w-7 h-7 rounded-full bg-white/15 items-center justify-center mr-2">
                  <Ionicons name="sparkles" size={16} color={colors.signalSoft} />
                </View>
                <Text className="text-xs font-raleway-bold text-white/60 uppercase tracking-wider">
                  The Clipboard
                </Text>
              </View>
              <Text className="text-white text-base leading-6">
                {aiResponse}
              </Text>
            </View>
          ) : null}

          {/* Talk to Coach Button */}
          <TouchableOpacity
            className="bg-dp-600 rounded-2xl py-4 mb-4 flex-row items-center justify-center"
            style={{
              shadowColor: colors.signal,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={startChat}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.inverseText} />
            <Text className="text-white text-base font-raleway-bold ml-2">
              Talk to The Clipboard
            </Text>
          </TouchableOpacity>

          {/* Chat History Button */}
          <TouchableOpacity
            className="bg-app-surface rounded-2xl py-4 mb-4 flex-row items-center justify-center border border-silver-200"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => {
              setHistoryMode(true);
              loadHistory();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={20} color={colors.signal} />
            <Text className="text-dp-600 text-base font-raleway-bold ml-2">
              Chat History
            </Text>
          </TouchableOpacity>

          {/* Encouragement */}
          <GlassSurface
            tone="signal"
            className="bg-app-surface rounded-3xl p-4"
            style={{
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-sm text-silver-600 text-center leading-5">
              You showed up today. That&apos;s what matters. See you tomorrow.
            </Text>
          </GlassSurface>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 900,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 120,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={{ marginBottom: 20 }}>
          <ImageBackground
            source={require("../../assets/images/checkin-hero.png")}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 24,
              overflow: "hidden",
            }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["transparent", `${colors.signalDark}D9`]}
              locations={[0.3, 1]}
              style={{
                flex: 1,
                justifyContent: "flex-end",
                padding: 20,
              }}
            >
              <Text
                style={{
                  color: `${colors.inverseText}99`,
                  fontSize: 12,
                  fontFamily: "Raleway-SemiBold",
                  marginBottom: 4,
                }}
              >
                Daily Check-In
              </Text>
              <Text
                style={{
                  color: colors.inverseText,
                  fontSize: 24,
                  fontFamily: "Raleway-ExtraBold",
                }}
              >
                How are you today?
              </Text>
              <Text
                style={{
                  color: `${colors.inverseText}80`,
                  fontSize: 13,
                  fontFamily: "Raleway-Medium",
                  marginTop: 4,
                }}
              >
                Take 30 seconds. Be honest with yourself.
              </Text>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Mood Selector */}
        <GlassSurface
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-sm font-raleway-bold text-silver-900 mb-4">
            Select your mood
          </Text>
          <View className="flex-row justify-between">
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                className={`items-center py-3 px-1.5 rounded-2xl flex-1 mx-0.5 ${selectedMood === mood.value ? "bg-dp-50" : "bg-silver-50"
                  }`}
                style={
                  selectedMood === mood.value
                    ? {
                        borderWidth: 2,
                        borderColor: colors.semantic.mood[mood.value - 1],
                        backgroundColor: `${colors.semantic.mood[mood.value - 1]}14`,
                      }
                    : { borderWidth: 2, borderColor: "transparent" }
                }
                onPress={() => setSelectedMood(mood.value)}
                activeOpacity={0.7}
              >
                <Image
                  source={mood.icon}
                  style={{ width: 28, height: 28, marginBottom: 4 }}
                  resizeMode="contain"
                />
                <Text
                  className={`text-[10px] font-raleway-semibold ${selectedMood === mood.value
                    ? "text-dp-700"
                    : "text-silver-400"
                    }`}
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassSurface>

        {/* Note Input */}
        <GlassSurface
          tone="strong"
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text className="text-sm font-raleway-bold text-silver-900 mb-3">
            Want to share more? (optional)
          </Text>
          <TextInput
            className="bg-silver-50 rounded-2xl px-4 py-3 text-base text-silver-900"
            style={{ minHeight: 100, textAlignVertical: "top" }}
            placeholder="What's on your mind today..."
            placeholderTextColor={colors.textTertiary}
            multiline
            value={note}
            onChangeText={setNote}
            maxLength={500}
          />
          <Text className="text-xs text-silver-400 text-right mt-2">
            {note.length}/500
          </Text>
        </GlassSurface>

        {/* Submit Button */}
        <TouchableOpacity
          className={`bg-dp-600 py-4 rounded-2xl items-center ${!selectedMood || loading ? "opacity-50" : ""
            }`}
          style={{
            shadowColor: colors.signal,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
          }}
          onPress={handleSubmit}
          disabled={!selectedMood || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator color={colors.inverseText} size="small" />
              <Text className="text-white text-base font-raleway-bold">
                Getting AI response...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-base font-raleway-bold tracking-wide">
              Submit Check-In
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
