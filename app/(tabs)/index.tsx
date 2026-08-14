import { HomeScreenSkeleton } from "@/components/SkeletonLoader";
import { SPORTS } from "@/constants/sports";
import { useAuth } from "@/context/auth";
import { computeProgress, getProgressMessage } from "@/lib/progress";
import { getTodayCheckIn, getWeeklyCheckInCount } from "@/services/checkin";
import { getMessages } from "@/services/community";
import { getCompletionCount, getRecentCompletions } from "@/services/gameplan";
import { getUnreadCount } from "@/services/notification-store";
import { CheckIn, Message, SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.42;

// ─── Real motivational quotes from athletes ───────────────────────────

const MOTIVATIONAL_QUOTES = [
  {
    text: "The only way to prove you are a good sport is to lose.",
    author: "Ernie Banks",
  },
  {
    text: "I've failed over and over again in my life. And that is why I succeed.",
    author: "Michael Jordan",
  },
  {
    text: "What makes something special is not just what you have to gain, but what you feel there is to lose.",
    author: "Andre Agassi",
  },
  {
    text: "The transition out of sport taught me more about who I really am than anything I accomplished on the field.",
    author: "Athlete Insight",
  },
  {
    text: "Your body is not done learning just because the game is over. Your next chapter needs mental strength.",
    author: "Athlete Insight",
  },
  {
    text: "Everything negative — pressure, challenges — is all an opportunity for me to rise.",
    author: "Kobe Bryant",
  },
  {
    text: "I am building something new. I am not what I was — I am what I'm becoming.",
    author: "Athlete Mantra",
  },
  {
    text: "Champions keep playing until they get it right — on and off the field.",
    author: "Billie Jean King",
  },
  {
    text: "The hardest part of retirement wasn't leaving the game. It was finding myself without it.",
    author: "Athlete Insight",
  },
  {
    text: "Your discipline got you here. That same discipline will build your next life.",
    author: "Athlete Insight",
  },
  {
    text: "The mind is everything. What you think, you become — even after the final whistle.",
    author: "Adapted from Buddha",
  },
  {
    text: "It's not the will to win that matters — everyone has that. It's the will to prepare to win that matters.",
    author: "Bear Bryant",
  },
  {
    text: "Transition is not an ending. It's a different kind of beginning.",
    author: "Athlete Insight",
  },
  {
    text: "Show up for yourself the same way you showed up for your team.",
    author: "Athlete Mantra",
  },
];

const DAILY_TIPS = [
  "Progress isn't always linear. Some days you show up strong, others you just show up — both count.",
  "Your identity was never just your sport. Today is a chance to discover what else you're made of.",
  "Discipline got you here. That same discipline will carry you forward — just in a new direction.",
  "It's okay to grieve the game. What matters is that you keep moving forward.",
  "The best athletes adapt. You're not losing who you were — you're becoming who you're meant to be.",
  "Community makes the transition easier. You don't have to figure this out alone.",
  "Small wins compound. One check-in, one action, one conversation at a time.",
];

function getDailyItem<T>(items: T[]): T {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
    86400000,
  );
  return items[dayOfYear % items.length];
}

// ─── Tile styles ──────────────────────────────────────────────────────

/** Blue-tinted glass — frosted with a hint of the brand blue */
const blueGlass = StyleSheet.create({
  card: {
    backgroundColor: "rgba(4, 4, 133, 0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(4, 4, 133, 0.1)",
    shadowColor: "rgba(4, 4, 133, 0.12)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 5,
  },
});

/** White glass — clean frosty white with subtle depth */
const whiteGlass = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.65)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.85)",
    shadowColor: "rgba(0, 0, 0, 0.08)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
});

export default function HomeScreen() {
  const { user, profile, isLoading } = useAuth();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [weeklyCheckIns, setWeeklyCheckIns] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [weeklyCompletions, setWeeklyCompletions] = useState(0);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);

  const progressInfo = useMemo(() => {
    if (!profile?.joined_at || !sport) return null;
    return computeProgress(profile.joined_at, sport);
  }, [profile?.joined_at, sport]);

  const progress = progressInfo?.overallProgress ?? 25;
  const dailyTip = useMemo(() => getDailyItem(DAILY_TIPS), []);
  const dailyQuote = useMemo(() => getDailyItem(MOTIVATIONAL_QUOTES), []);

  const loadHomeData = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const [notifCount, todayCI, weeklyCI, totalComp, weeklyComp, msgs] =
        await Promise.all([
          getUnreadCount(user.$id),
          getTodayCheckIn(user.$id),
          getWeeklyCheckInCount(user.$id),
          getCompletionCount(user.$id),
          getRecentCompletions(user.$id).then((c) => c.length),
          getMessages("global", 3),
        ]);
      setUnreadCount(notifCount);
      setTodayCheckIn(todayCI);
      setWeeklyCheckIns(weeklyCI);
      setTotalCompletions(totalComp);
      setWeeklyCompletions(weeklyComp);
      setRecentMessages(msgs.reverse());
    } catch {
      // silent
    }
  }, [user?.$id]);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData]),
  );

  if (isLoading || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-transparent">
        <HomeScreenSkeleton />
      </SafeAreaView>
    );
  }

  const streak = profile?.streak ?? 0;
  const nextStreakMilestone =
    [3, 7, 14, 21, 30, 60, 90].find((m) => m > streak) ?? 90;
  const streakProgress = Math.min(100, (streak / nextStreakMilestone) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: "#FAF8F5" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ════════════════════════════════════════════════════════════
            HERO SECTION — Full wallpaper visible with dark gradient
           ════════════════════════════════════════════════════════════ */}
        <ImageBackground
          source={require("../../assets/images/homepage-wallpaper.png")}
          style={{ width: "100%", height: HERO_HEIGHT }}
          resizeMode="cover"
        >
          {/* Dark vignette / gradient overlay */}
          <LinearGradient
            colors={[
              "rgba(10, 10, 30, 0.25)",
              "rgba(10, 10, 30, 0.4)",
              "rgba(10, 10, 30, 0.92)",
            ]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Safe area content over the hero */}
          <SafeAreaView style={{ flex: 1, justifyContent: "space-between" }}>
            {/* Top bar — logo + notification */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 10,
                  }}
                >
                  <Image
                    source={require("../../assets/images/logo.png")}
                    style={{ width: 24, height: 24, tintColor: "#fff" }}
                    resizeMode="contain"
                  />
                </View>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 13,
                    fontFamily: "Raleway-SemiBold",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}
                >
                  Third & Manageable
                </Text>
              </View>
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => router.push("/(tabs)/notifications")}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="rgba(255,255,255,0.8)"
                />
                {unreadCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -2,
                      backgroundColor: "#EF4444",
                      borderRadius: 9,
                      width: 18,
                      height: 18,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 10,
                        fontFamily: "Raleway-Bold",
                      }}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom of hero — Welcome text */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text
                style={{
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  fontFamily: "Raleway-Medium",
                  marginBottom: 4,
                }}
              >
                Welcome back
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 26,
                    fontFamily: "Raleway-ExtraBold",
                  }}
                  numberOfLines={1}
                >
                  {profile?.display_name ?? "Athlete"}
                </Text>
                {sport ? (
                  <Image
                    source={sport.icon}
                    style={{ width: 22, height: 22, marginLeft: 8, tintColor: "#fff" }}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
              {/* Status badges */}
              {profile?.athlete_status && (
                <View style={{ flexDirection: "column", gap: 8 }}>
                  <View
                    style={{
                      backgroundColor: "rgba(6, 24, 168, 0.5)",
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      flexDirection: "row",
                      alignItems: "center",
                      alignSelf: "flex-start",
                      borderWidth: 1,
                      borderColor: "rgba(161, 168, 235, 0.3)",
                    }}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={13}
                      color="#A1A8EB"
                    />
                    <Text
                      style={{
                        color: "#A1A8EB",
                        fontSize: 11,
                        fontFamily: "Raleway-Bold",
                        marginLeft: 5,
                      }}
                    >
                      {profile.athlete_status === "current"
                        ? "Current Athlete"
                        : "Former Athlete"}
                    </Text>
                  </View>
                  {profile?.school &&
                    profile.school !== "N/A" &&
                    profile.school !== "Other" && (
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.1)",
                          borderRadius: 20,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                          flexDirection: "row",
                          alignItems: "center",
                          alignSelf: "flex-start",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.15)",
                        }}
                      >
                        <Ionicons
                          name="school-outline"
                          size={12}
                          color="rgba(255,255,255,0.6)"
                        />
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: 11,
                            fontFamily: "Raleway-SemiBold",
                            marginLeft: 5,
                          }}
                          numberOfLines={1}
                        >
                          {profile.school}
                        </Text>
                      </View>
                    )}
                </View>
              )}
            </View>
          </SafeAreaView>
        </ImageBackground>

        {/* ── Dark-to-white fade transition ────────────────────────── */}
        <LinearGradient
          colors={["rgba(10,10,30,0.92)", "#FAF8F5"]}
          locations={[0, 1]}
          style={{ height: 20 }}
        />

        {/* ════════════════════════════════════════════════════════════
            CONTENT SECTION — White/cream background with glass tiles
           ════════════════════════════════════════════════════════════ */}
        <View style={{ backgroundColor: "#FAF8F5", paddingHorizontal: 20, paddingTop: 4 }}>

          {/* ── Today's Check-In Status — BLUE GLASS ───────────────── */}
          {todayCheckIn ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/(tabs)/check-in")}
              style={[
                {
                  borderRadius: 24,
                  padding: 20,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderLeftWidth: 4,
                  borderLeftColor: "#10B981",
                },
                whiteGlass.card,
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(16,185,129,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Raleway-Bold",
                    color: "#1a1a2e",
                  }}
                >
                  Checked in today
                </Text>
                <Text
                  style={{ fontSize: 12, color: "#9E9E9E", marginTop: 2 }}
                >
                  Feeling{" "}
                  {["Struggling", "Tough", "Okay", "Good", "Great"][
                    todayCheckIn.mood - 1
                  ] ?? "Okay"}{" "}
                  · Talk to The Clipboard
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#BDBDBD" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push("/(tabs)/check-in")}
              style={[
                {
                  borderRadius: 24,
                  padding: 20,
                  marginBottom: 16,
                },
                whiteGlass.card,
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={{
                      color: "#9E9E9E",
                      fontSize: 11,
                      fontFamily: "Raleway-SemiBold",
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      marginBottom: 4,
                    }}
                  >
                    Daily Check-In
                  </Text>
                  <Text
                    style={{
                      color: "#1a1a2e",
                      fontSize: 18,
                      fontFamily: "Raleway-Bold",
                    }}
                  >
                    How are you feeling?
                  </Text>
                </View>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(4, 4, 133, 0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(4, 4, 133, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color="#040485"
                  />
                </View>
              </View>
              <Text
                style={{
                  color: "#9E9E9E",
                  fontSize: 13,
                  lineHeight: 20,
                  marginBottom: 16,
                }}
              >
                Take 30 seconds to share how you&apos;re doing. The Clipboard
                is ready.
              </Text>
              <View
                style={{
                  backgroundColor: "#040485",
                  borderRadius: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  shadowColor: "#040485",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <Text
                  style={{
                    color: "#fff",
                    fontFamily: "Raleway-Bold",
                    fontSize: 14,
                  }}
                >
                  Start Check-In
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Motivational Quote — SOLID BLUE ─────────────────────── */}
          <View
            style={{
              borderRadius: 24,
              padding: 20,
              marginBottom: 16,
              backgroundColor: "#030366",
              shadowColor: "#030366",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 14,
              elevation: 8,
              borderWidth: 1,
              borderColor: "rgba(161, 168, 235, 0.15)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <Ionicons name="megaphone-outline" size={14} color="#A1A8EB" />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: "Raleway-Bold",
                  color: "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Quote of the Day
              </Text>
            </View>
            <Text
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 15,
                lineHeight: 24,
                fontStyle: "italic",
                marginBottom: 8,
              }}
            >
              &ldquo;{dailyQuote.text}&rdquo;
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontFamily: "Raleway-SemiBold",
              }}
            >
              — {dailyQuote.author}
            </Text>
          </View>

          {/* ── Journey Progress Card — WHITE GLASS ───────────────────── */}
          {sport && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/progress")}
              style={[
                {
                  borderRadius: 24,
                  padding: 20,
                  marginBottom: 16,
                },
                whiteGlass.card,
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: "Raleway-Bold",
                    color: "#1a1a2e",
                  }}
                >
                  Your Journey
                </Text>
                <View
                  style={{
                    backgroundColor: "rgba(4, 4, 133, 0.06)",
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: "rgba(4, 4, 133, 0.1)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "Raleway-Bold",
                      color: "#040485",
                    }}
                  >
                    {sport.periodName} {progressInfo?.currentPeriod ?? 1}/
                    {sport.totalPeriods}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  height: 10,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderRadius: 5,
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: "#0618A8",
                    borderRadius: 5,
                    width: `${progress}%`,
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 12, color: "#BDBDBD", marginBottom: 4 }}
                  >
                    Day {progressInfo?.daysElapsed ?? 0} of 90 ·{" "}
                    {progressInfo?.daysRemaining ?? 90} days left
                  </Text>
                  <Text style={{ fontSize: 12, color: "#9E9E9E" }}>
                    {progressInfo
                      ? getProgressMessage(progressInfo, sport.periodName)
                      : "Building momentum. Keep showing up."}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginLeft: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Raleway-Bold",
                      color: "#0618A8",
                      marginRight: 4,
                    }}
                  >
                    Details
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="#0618A8" />
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Weekly Activity Snapshot — BLUE GLASS ──────────────────── */}
          <View
            style={[
              {
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
              },
              blueGlass.card,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(4, 4, 133, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(4, 4, 133, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <Ionicons name="bar-chart-outline" size={14} color="#040485" />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Raleway-Bold",
                  color: "#1a1a2e",
                }}
              >
                This Week
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { value: weeklyCheckIns, label: "Check-Ins" },
                { value: weeklyCompletions, label: "Actions Done" },
                { value: totalCompletions, label: "Total Actions" },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(4, 4, 133, 0.04)",
                    borderRadius: 16,
                    padding: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(4, 4, 133, 0.06)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontFamily: "Raleway-ExtraBold",
                      color: "#040485",
                    }}
                  >
                    {item.value}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontFamily: "Raleway-SemiBold",
                      color: "rgba(4, 4, 133, 0.45)",
                      marginTop: 2,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Streak & Milestone — WHITE GLASS PAIR ─────────────────── */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <View
              style={[
                {
                  flex: 1,
                  borderRadius: 24,
                  padding: 20,
                  alignItems: "center",
                },
                whiteGlass.card,
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(245, 158, 11, 0.18)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="flame" size={22} color="#F59E0B" />
              </View>
              <Text
                style={{
                  fontSize: 30,
                  fontFamily: "Raleway-ExtraBold",
                  color: "#040485",
                }}
              >
                {streak}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Medium",
                  color: "#9E9E9E",
                  marginTop: 4,
                }}
              >
                Day Streak
              </Text>
              <View
                style={{
                  width: "100%",
                  height: 5,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderRadius: 3,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: "#F59E0B",
                    borderRadius: 3,
                    width: `${streakProgress}%`,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 9,
                  color: "#BDBDBD",
                  marginTop: 4,
                }}
              >
                Next: {nextStreakMilestone}-day milestone
              </Text>
            </View>

            <View
              style={[
                {
                  flex: 1,
                  borderRadius: 24,
                  padding: 20,
                  alignItems: "center",
                },
                whiteGlass.card,
              ]}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(4, 4, 133, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(4, 4, 133, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="trophy" size={22} color="#040485" />
              </View>
              <Text
                style={{
                  fontSize: 30,
                  fontFamily: "Raleway-ExtraBold",
                  color: "#040485",
                }}
              >
                {profile?.current_quarter ?? 1}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Medium",
                  color: "#9E9E9E",
                  marginTop: 4,
                }}
              >
                {sport?.periodName ?? "Phase"}
              </Text>
              <View
                style={{
                  width: "100%",
                  height: 5,
                  backgroundColor: "rgba(0,0,0,0.05)",
                  borderRadius: 3,
                  marginTop: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    backgroundColor: "#3940C9",
                    borderRadius: 3,
                    width: `${progressInfo?.periodProgress ?? 0}%`,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 9,
                  color: "#BDBDBD",
                  marginTop: 4,
                }}
              >
                {progressInfo?.daysLeftInPeriod ?? 0} days left
              </Text>
            </View>
          </View>

          {/* ── Community Activity Preview — BLUE GLASS ─────────────── */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/community")}
            style={[
              {
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
              },
              blueGlass.card,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(4, 4, 133, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(4, 4, 133, 0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 8,
                  }}
                >
                  <Ionicons name="chatbubbles" size={16} color="#040485" />
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Raleway-Bold",
                    color: "#1a1a2e",
                  }}
                >
                  Athlete Community
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Raleway-Bold",
                    color: "#0618A8",
                    marginRight: 4,
                  }}
                >
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={12} color="#0618A8" />
              </View>
            </View>
            {recentMessages.length > 0 ? (
              recentMessages.map((msg) => (
                <View key={msg.id} style={{ marginBottom: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                    }}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(4, 4, 133, 0.06)",
                        borderWidth: 1,
                        borderColor: "rgba(4, 4, 133, 0.08)",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 8,
                          fontFamily: "Raleway-Bold",
                          color: "#040485",
                        }}
                      >
                        {msg.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: "Raleway-Bold",
                          color: "#37374a",
                        }}
                      >
                        {msg.display_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#9E9E9E",
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {msg.content}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 12, color: "#BDBDBD" }}>
                No messages yet. Be the first to connect!
              </Text>
            )}
          </TouchableOpacity>

          {/* ── Quick Links — SOLID BLUE ──────────────────────────────── */}
          <View style={{ marginBottom: 16 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/game-plan")}
              style={{
                borderRadius: 24,
                padding: 20,
                backgroundColor: "#040485",
                shadowColor: "#040485",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 6,
                borderWidth: 1,
                borderColor: "rgba(161, 168, 235, 0.15)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.18)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons name="clipboard" size={20} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Raleway-Bold",
                        color: "#fff",
                      }}
                    >
                      Game Plan
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.5)",
                        marginTop: 2,
                      }}
                    >
                      Today&apos;s action
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.4)" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            {/* Support — CLEAR GLASS */}
            <TouchableOpacity
              style={[
                {
                  flex: 1,
                  borderRadius: 24,
                  padding: 16,
                  alignItems: "center",
                },
                whiteGlass.card,
              ]}
              onPress={() => router.push("/(tabs)/support")}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(4, 4, 133, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(4, 4, 133, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="heart-outline" size={20} color="#040485" />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Bold",
                  color: "#1a1a2e",
                }}
              >
                Support
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: "#9E9E9E",
                  marginTop: 2,
                }}
              >
                Resources
              </Text>
            </TouchableOpacity>
            {/* Perks — CLEAR GLASS */}
            <TouchableOpacity
              style={[
                {
                  flex: 1,
                  borderRadius: 24,
                  padding: 16,
                  alignItems: "center",
                },
                whiteGlass.card,
              ]}
              onPress={() => router.push("/(tabs)/perks")}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "rgba(4, 4, 133, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(4, 4, 133, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="trophy-outline" size={20} color="#040485" />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Bold",
                  color: "#1a1a2e",
                }}
              >
                Perks
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: "#9E9E9E",
                  marginTop: 2,
                }}
              >
                Rewards
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Daily Tip Card — WHITE GLASS ───────────────────────────── */}
          <View
            style={[
              {
                borderRadius: 24,
                padding: 20,
                marginBottom: 16,
              },
              whiteGlass.card,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: "rgba(4, 4, 133, 0.06)",
                  borderWidth: 1,
                  borderColor: "rgba(4, 4, 133, 0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <Ionicons name="bulb-outline" size={16} color="#040485" />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Bold",
                  color: "#040485",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Daily Tip
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: "#4a4a5a", lineHeight: 20 }}>
              {dailyTip}
            </Text>
          </View>

          {/* ── About Card — BLUE GLASS ────────────────────────────────── */}
          <View
            style={[
              {
                borderRadius: 24,
                padding: 20,
                marginBottom: 20,
              },
              blueGlass.card,
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "rgba(4, 4, 133, 0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 6,
                }}
              >
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={{ width: 16, height: 16 }}
                  resizeMode="contain"
                />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Raleway-Bold",
                  color: "#040485",
                }}
              >
                Third &amp; Manageable
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: "rgba(4, 4, 133, 0.45)",
                lineHeight: 18,
              }}
            >
              A structured athlete-first platform for emotional safety, peer
              connection, and daily transition support. Your 90-day journey to
              building life beyond sport.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
