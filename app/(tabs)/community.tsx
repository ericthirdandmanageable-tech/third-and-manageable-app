import { getTodayPrompt, PROMPT_CATEGORY_LABELS } from "@/constants/prompts";
import { GlassSurface } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import {
  blockUser,
  createSupportRequest,
  getBlockedUserIds,
  getMessages,
  getUserIdByDisplayName,
  getUserProfile,
  parseMentions,
  reportMessage,
  sendMessage,
  subscribeToMessages,
  subscribeToRoom,
} from "@/services/community";
import { createMentionNotification } from "@/services/notification-store";
import { Message, Profile, Room } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RoomTab = "global" | "school";

const SPORT_LABELS: Record<string, string> = {
  basketball: "Basketball",
  football: "Football",
  soccer: "Soccer",
  hockey: "Hockey",
  baseball: "Baseball",
  tennis: "Tennis",
  swimming: "Swimming",
  track_field: "Track & Field",
  volleyball: "Volleyball",
  softball: "Softball",
  wrestling: "Wrestling",
  lacrosse: "Lacrosse",
  golf: "Golf",
  gymnastics: "Gymnastics",
  other: "Athlete",
};

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/**
 * Render message text with @mentions highlighted in purple.
 */
function renderMentionText(content: string, isMe: boolean) {
  const mentionRegex = /@([A-Za-z][A-Za-z0-9 ]{1,30}?)(?=[,.\s!?;:]|$)/g;
  const parts: { text: string; isMention: boolean }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: content.slice(lastIndex, match.index),
        isMention: false,
      });
    }
    parts.push({ text: match[0], isMention: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ text: content.slice(lastIndex), isMention: false });
  }

  if (parts.length === 0) {
    return (
      <Text
        className={`text-sm leading-5 ${isMe ? "text-white" : "text-silver-800"
          }`}
      >
        {content}
      </Text>
    );
  }

  return (
    <Text
      className={`text-sm leading-5 ${isMe ? "text-white" : "text-silver-800"}`}
    >
      {parts.map((part, i) =>
        part.isMention ? (
          <Text
            key={i}
            style={{
              fontFamily: "Raleway-Bold",
              color: isMe ? "#A1A8EB" : "#0618A8",
            }}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={i}>{part.text}</Text>
        ),
      )}
    </Text>
  );
}

export default function CommunityScreen() {
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();
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
  const [activeTab, setActiveTab] = useState<RoomTab>("global");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);
  const [supportSending, setSupportSending] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const localPrompt = useMemo(() => getTodayPrompt(), []);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  const hasSchool =
    profile?.school && profile.school !== "N/A" && profile.school !== "Other";

  const currentRoomId =
    activeTab === "global"
      ? "global"
      : `school_${profile?.school?.toLowerCase().replace(/\s+/g, "_")}`;

  /** Abbreviate school name to initials (e.g. "Case Western Reserve University" → "CWRU") */
  const getSchoolAbbreviation = (name: string): string => {
    const skipWords = new Set(["of", "the", "and", "at", "in", "for"]);
    return name
      .split(/\s+/)
      .filter((w) => !skipWords.has(w.toLowerCase()))
      .map((w) => w.charAt(0).toUpperCase())
      .join("");
  };

  const schoolAbbreviation = hasSchool
    ? getSchoolAbbreviation(profile!.school!)
    : "";

  const roomTitle =
    activeTab === "global" ? "Global Athlete Room" : `${schoolAbbreviation} Room`;

  // Load messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const msgs = await getMessages(currentRoomId, 50);
      setMessages(msgs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentRoomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!user?.$id) return;
    (async () => {
      const blocked = await getBlockedUserIds(user.$id);
      setBlockedUserIds(blocked);
    })();
  }, [user?.$id]);

  // Subscribe to room document for real-time prompt updates
  useEffect(() => {
    const unsubscribe = subscribeToRoom(currentRoomId, (room) => {
      setCurrentRoom(room);
    });
    return () => unsubscribe();
  }, [currentRoomId]);

  // Subscribe to realtime messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages((msg) => {
      if (msg.room_id === currentRoomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [msg, ...prev];
        });
      }
    });
    return unsubscribe;
  }, [currentRoomId]);

  // Send message with @mention detection
  const handleSend = async () => {
    if (!messageText.trim() || !user?.$id || !profile) return;
    setSending(true);
    try {
      const sentMsg = await sendMessage(
        currentRoomId,
        user.$id,
        profile.display_name,
        profile.sport,
        profile.athlete_status || "former",
        messageText.trim(),
        profile.verified,
      );
      setMessageText("");

      // Detect and process @mentions
      const mentions = parseMentions(sentMsg.content);
      for (const mentionName of mentions) {
        const mentionedUserId = await getUserIdByDisplayName(mentionName);
        if (mentionedUserId && mentionedUserId !== user.$id) {
          await createMentionNotification(
            mentionedUserId,
            profile.display_name,
            roomTitle,
            sentMsg.id,
          );
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Support request handlers
  const handleSupportRequest = async (type: "peer" | "moderator") => {
    if (!user?.$id) return;
    setSupportSending(true);
    try {
      const msg =
        type === "peer"
          ? "I need peer support right now."
          : "I need technical support.";
      await createSupportRequest(user.$id, type, msg);
      setSupportModalVisible(false);
      Alert.alert(
        "Request Sent",
        type === "peer"
          ? "We've notified the community. A peer will reach out soon."
          : "Our technical support team has been alerted and will connect with you shortly.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send request.");
    } finally {
      setSupportSending(false);
    }
  };

  // Tap a user's name to view their mini profile
  const handleTapUser = async (userId: string) => {
    if (userId === user?.$id) return; // Don't show own profile
    setProfileLoading(true);
    setProfileModalVisible(true);
    try {
      const prof = await getUserProfile(userId);
      setSelectedProfile(prof);
    } catch {
      setSelectedProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleReportMessage = async (message: Message) => {
    if (!user?.$id) return;
    try {
      await reportMessage(user.$id, message);
      Alert.alert(
        "Report Submitted",
        "Thanks for reporting. Our team will review this message.",
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit report.");
    }
  };

  const handleBlockUser = async (targetUserId: string, displayName: string) => {
    if (!user?.$id) return;
    try {
      await blockUser(user.$id, targetUserId);
      setBlockedUserIds((prev) =>
        prev.includes(targetUserId) ? prev : [...prev, targetUserId],
      );
      Alert.alert("User Blocked", `You will no longer see messages from ${displayName}.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to block user.");
    }
  };

  const openMessageActions = (message: Message) => {
    if (message.user_id === user?.$id) return;
    Alert.alert("Message Options", "Choose an action", [
      {
        text: "Report Message",
        style: "destructive",
        onPress: () => handleReportMessage(message),
      },
      {
        text: "Block User",
        style: "destructive",
        onPress: () => handleBlockUser(message.user_id, message.display_name),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (msg) => msg.user_id === user?.$id || !blockedUserIds.includes(msg.user_id),
      ),
    [messages, blockedUserIds, user?.$id],
  );

  // Render a single message bubble
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.user_id === user?.$id;
    const sportLabel = SPORT_LABELS[item.sport] || item.sport;
    const statusLabel =
      item.athlete_status === "current" ? "Current" : "Former";

    return (
      <View
        className={`mb-3 ${isMe ? "items-end" : "items-start"}`}
        style={{ paddingHorizontal: 16 }}
      >
        {!isMe && (
          <TouchableOpacity
            className="flex-row items-center mb-1"
            onPress={() => handleTapUser(item.user_id)}
            activeOpacity={0.6}
          >
            <Text className="text-xs font-raleway-bold text-silver-700">
              {item.display_name}
            </Text>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={12}
                color="#0618A8"
                style={{ marginLeft: 3 }}
              />
            )}
            <Text className="text-[10px] text-silver-400 ml-1.5">
              {statusLabel} · {sportLabel}
            </Text>
          </TouchableOpacity>
        )}
        <Pressable
          onLongPress={() => openMessageActions(item)}
          delayLongPress={250}
        >
          <GlassSurface
            tone={isMe ? "signal" : "regular"}
            radius={18}
            className={`rounded-2xl px-4 py-3 max-w-[85%] ${isMe ? "bg-dp-600" : "bg-white"
              }`}
            style={
              isMe
                ? undefined
                : {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                }
            }
          >
            {renderMentionText(item.content, isMe)}
          </GlassSurface>
        </Pressable>
        <Text className="text-[10px] text-silver-400 mt-1 mx-1">
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent" edges={["top"]}>
      <View className="flex-1">
        {/* Header */}
        <GlassSurface tone="strong" style={{ marginHorizontal: 20, marginTop: 8, padding: 16 }}>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center">
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "rgba(4, 4, 133, 0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(4, 4, 133, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 6,
                  }}
                >
                  <Image
                    source={require("../../assets/images/logo.png")}
                    style={{ width: 14, height: 14, tintColor: "#040485" }}
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-sm text-silver-500 mb-0.5">Community</Text>
              </View>
              <Text
                className="text-xl font-raleway-extrabold text-silver-900"
                numberOfLines={1}
              >
                {roomTitle}
              </Text>
            </View>
            {/* Need Support Now button */}
            <TouchableOpacity
              className="bg-dp-600 rounded-xl px-3 py-2 flex-row items-center"
              style={{
                minWidth: 120,
                shadowColor: "#040485",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
                elevation: 4,
              }}
              onPress={() => setSupportModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={16} color="#fff" />
              <Text className="text-white text-xs font-raleway-bold ml-1.5">
                Need Support
              </Text>
            </TouchableOpacity>
          </View>

          {/* Room tabs */}
          <GlassSurface radius={14} tone="subtle" className="flex-row rounded-xl p-1 mb-2">
            <TouchableOpacity
              className={`flex-1 py-2 rounded-lg items-center ${activeTab === "global" ? "bg-dp-600" : ""
                }`}
              onPress={() => setActiveTab("global")}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-raleway-bold ${activeTab === "global" ? "text-white" : "text-silver-500"
                  }`}
              >
                Global Room
              </Text>
            </TouchableOpacity>
            {hasSchool && (
              <TouchableOpacity
                className={`flex-1 py-2 px-2 rounded-lg items-center ${activeTab === "school" ? "bg-dp-600" : ""
                  }`}
                onPress={() => setActiveTab("school")}
                activeOpacity={0.7}
              >
                <Text
                  numberOfLines={1}
                  className={`text-xs font-raleway-bold ${activeTab === "school" ? "text-white" : "text-silver-500"
                    }`}
                >
                  School Room
                </Text>
              </TouchableOpacity>
            )}
          </GlassSurface>

          {/* Verified badge */}
          <View className="flex-row items-center mb-1">
            <Ionicons name="checkmark-circle" size={14} color="#0618A8" />
            <Text className="text-[11px] text-dp-500 font-raleway-semibold ml-1">
              Verified Athletes Only - Use @Name to mention someone
            </Text>
          </View>
          <Text className="text-[10px] text-silver-400 mb-1">
            Long press a message to report content or block a user.
          </Text>
        </GlassSurface>

        {/* Today's Prompt */}
        <GlassSurface
          tone="signal"
          className="mx-5 mb-2 bg-dp-700 rounded-2xl p-4"
          style={{
            shadowColor: "#030366",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <View className="flex-row items-center mb-2">
            <Ionicons name="chatbubble-ellipses" size={14} color="#A1A8EB" />
            <Text className="text-[10px] font-raleway-bold text-white/50 uppercase tracking-wider ml-1.5">
              Today&apos;s Chat Prompt
              {currentRoom?.daily_prompt
                ? ""
                : ` · ${PROMPT_CATEGORY_LABELS[localPrompt.category]}`}
            </Text>
          </View>
          <Text className="text-white text-sm font-raleway-semibold leading-5">
            {currentRoom?.daily_prompt || localPrompt.text}
          </Text>
          {currentRoom?.daily_prompt_author ? (
            <Text className="text-white/40 text-[10px] font-raleway-medium mt-2">
              — {currentRoom.daily_prompt_author}
            </Text>
          ) : null}
        </GlassSurface>

        {/* Messages */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.signal} />
          </View>
        ) : visibleMessages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="chatbubbles-outline" size={48} color="#BDBDBD" />
            <Text className="text-base font-raleway-bold text-silver-400 mt-3 text-center">
              No visible messages yet
            </Text>
            <Text className="text-sm text-silver-400 text-center mt-1">
              Try posting first or switch rooms.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={{ paddingVertical: 8 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Message Input — floats above keyboard when open, above tab bar when closed */}
        <GlassSurface
          tone="strong"
          radius={28}
          className="mx-3 px-3 py-2"
          style={{
            marginBottom: 8,
            paddingBottom: bottomInset,
          }}
        >
          {profile?.verified ? (
            <View className="flex-row items-end">
              <TextInput
                className="flex-1 bg-silver-50 rounded-2xl px-4 py-3 text-sm text-silver-900 mr-2"
                style={{ maxHeight: 100, fontFamily: "Raleway-Regular" }}
                placeholder="Share here... Use @Name to mention"
                placeholderTextColor="#BDBDBD"
                multiline
                value={messageText}
                onChangeText={setMessageText}
                maxLength={500}
              />
              <TouchableOpacity
                className={`w-10 h-10 rounded-full items-center justify-center ${messageText.trim() ? "bg-dp-600" : "bg-silver-200"
                  }`}
                onPress={handleSend}
                disabled={!messageText.trim() || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={messageText.trim() ? "#fff" : "#9E9E9E"}
                  />
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="items-center py-2">
              <View className="flex-row items-center">
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color="#9E9E9E"
                />
                <Text className="text-xs text-silver-400 font-raleway-semibold ml-1.5">
                  Verify your account to participate in chat
                </Text>
              </View>
              <TouchableOpacity
                className="mt-2 bg-dp-50 rounded-xl px-4 py-2"
                onPress={() => router.push("/(tabs)/profile")}
                activeOpacity={0.7}
              >
                <Text className="text-xs font-raleway-bold text-dp-600">
                  Go to Profile → Request Verification
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </GlassSurface>

        {/* Mini Profile Drawer */}
        <Modal
          visible={profileModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setProfileModalVisible(false);
            setSelectedProfile(null);
          }}
        >
          <TouchableOpacity
            className="flex-1 justify-end bg-black/40"
            activeOpacity={1}
            onPress={() => {
              setProfileModalVisible(false);
              setSelectedProfile(null);
            }}
          >
            <TouchableOpacity activeOpacity={1}>
              <View
                className="bg-app-surface rounded-t-3xl px-6 pt-5 pb-10"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 10,
                }}
              >
                {/* Handle bar */}
                <View className="items-center mb-4">
                  <View className="w-10 h-1 rounded-full bg-silver-200" />
                </View>

                {profileLoading ? (
                  <View className="items-center py-10">
                    <ActivityIndicator size="large" color={colors.signal} />
                  </View>
                ) : selectedProfile ? (
                  <View className="items-center">
                    {/* Profile Picture */}
                    <View
                      className="w-20 h-20 rounded-full bg-dp-600 items-center justify-center overflow-hidden mb-3"
                      style={{
                        shadowColor: "#040485",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                    >
                      {selectedProfile.profile_pic ? (
                        <Image
                          source={{ uri: selectedProfile.profile_pic }}
                          style={{ width: 80, height: 80, borderRadius: 40 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-3xl font-raleway-extrabold text-white">
                          {selectedProfile.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </Text>
                      )}
                    </View>

                    {/* Name + Verification Badge */}
                    <View className="flex-row items-center mb-1">
                      <Text className="text-lg font-raleway-extrabold text-silver-900">
                        {selectedProfile.display_name}
                      </Text>
                      {selectedProfile.verified && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#0618A8"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </View>

                    {/* Sport + Status */}
                    <View className="flex-row items-center mb-3">
                      <View
                        className="bg-dp-50 rounded-full px-3 py-1 flex-row items-center mr-2"
                      >
                        <Ionicons name="shield-checkmark" size={11} color="#040485" />
                        <Text className="text-[11px] font-raleway-bold text-dp-600 ml-1">
                          {selectedProfile.athlete_status === "current"
                            ? "Current Athlete"
                            : "Former Athlete"}
                        </Text>
                      </View>
                      <View className="bg-silver-50 rounded-full px-3 py-1">
                        <Text className="text-[11px] font-raleway-semibold text-silver-600 capitalize">
                          {(SPORT_LABELS[selectedProfile.sport] || selectedProfile.sport)}
                        </Text>
                      </View>
                    </View>

                    {/* School */}
                    {selectedProfile.school &&
                      selectedProfile.school !== "N/A" &&
                      selectedProfile.school !== "Other" && (
                        <View className="flex-row items-center mb-4">
                          <Ionicons name="school-outline" size={14} color="#757575" />
                          <Text className="text-sm text-silver-500 font-raleway-semibold ml-1.5">
                            {selectedProfile.school}
                          </Text>
                        </View>
                      )}

                    {/* Close button */}
                    <TouchableOpacity
                      className="bg-silver-50 rounded-2xl px-8 py-3 mt-1"
                      onPress={() => {
                        setProfileModalVisible(false);
                        setSelectedProfile(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text className="text-sm font-raleway-bold text-silver-600">
                        Close
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center py-8">
                    <Text className="text-sm text-silver-400">Profile not found</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Need Support Now Modal */}
        <Modal
          visible={supportModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSupportModalVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/40">
            <View
              className="bg-app-surface rounded-t-3xl px-6 pt-6 pb-10"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 10,
              }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={22} color="#040485" />
                  <Text className="text-lg font-raleway-extrabold text-silver-900 ml-2">
                    Need Support Now?
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSupportModalVisible(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>
              </View>

              <Text className="text-sm text-silver-500 mb-5 leading-5">
                We&apos;re here to help. Request immediate support from the
                community or our technical support team.
              </Text>

              {/* Peer Support */}
              <TouchableOpacity
                className="bg-dp-50 rounded-2xl p-4 mb-3 flex-row items-center"
                style={{ borderWidth: 1.5, borderColor: "#E8E0F0" }}
                onPress={() => handleSupportRequest("peer")}
                disabled={supportSending}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 rounded-full bg-dp-600 items-center justify-center mr-3">
                  <Ionicons name="people" size={22} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-raleway-bold text-silver-900">
                    Request Peer Support
                  </Text>
                  <Text className="text-xs text-silver-500 mt-0.5">
                    Connect with a fellow athlete who understands
                  </Text>
                </View>
                {supportSending && (
                  <ActivityIndicator size="small" color="#040485" />
                )}
              </TouchableOpacity>

              {/* Technical Support */}
              <TouchableOpacity
                className="bg-silver-50 rounded-2xl p-4 flex-row items-center"
                style={{ borderWidth: 1.5, borderColor: "#E0E0E0" }}
                onPress={() => handleSupportRequest("moderator")}
                disabled={supportSending}
                activeOpacity={0.7}
              >
                <View className="w-11 h-11 rounded-full bg-silver-700 items-center justify-center mr-3">
                  <Ionicons name="headset-outline" size={22} color="#fff" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-raleway-bold text-silver-900">
                    Technical Support
                  </Text>
                  <Text className="text-xs text-silver-500 mt-0.5">
                    Our support team will be alerted and reach out to you
                  </Text>
                </View>
                {supportSending && (
                  <ActivityIndicator size="small" color="#757575" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
