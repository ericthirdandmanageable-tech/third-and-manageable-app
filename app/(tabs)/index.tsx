import {
  GlassButton,
  GlassSurface,
  SectionLabel,
} from "@/components/ui/liquid-glass";
import { SPORTS } from "@/constants/sports";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { useAdaptiveLayout } from "@/hooks/use-adaptive-layout";
import { computeProgress, getProgressMessage } from "@/lib/progress";
import { getTodayCheckIn, getWeeklyCheckInCount } from "@/services/checkin";
import { getMessages } from "@/services/community";
import { getCompletionCount, getRecentCompletions } from "@/services/gameplan";
import { getUnreadCount } from "@/services/notification-store";
import type { CheckIn, Message, SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAILY_TIPS = [
  "Progress isn't linear. Some days you show up strong; other days you just show up. Both count.",
  "Your identity was never only your sport. Today is a rep in discovering what else you're made of.",
  "Discipline got you here. The same discipline can carry you in a new direction.",
  "The best athletes adapt. You're not losing who you were—you're adding range.",
  "Small wins compound: one check-in, one action, one honest conversation.",
];

const getDailyTip = () => {
  const day = Math.floor(Date.now() / 86_400_000);
  return DAILY_TIPS[day % DAILY_TIPS.length];
};

export default function HomeScreen() {
  const { user, profile, isLoading } = useAuth();
  const { colors, schoolTheme, theme } = useAppTheme();
  const { compact, expanded } = useAdaptiveLayout();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [weeklyCheckIns, setWeeklyCheckIns] = useState(0);
  const [totalCompletions, setTotalCompletions] = useState(0);
  const [weeklyCompletions, setWeeklyCompletions] = useState(0);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);

  const progress =
    profile?.joined_at && sport
      ? computeProgress(profile.joined_at, sport)
      : null;

  const load = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const [notifications, checkIn, checkIns, completions, recent, messages] =
        await Promise.all([
          getUnreadCount(user.$id),
          getTodayCheckIn(user.$id),
          getWeeklyCheckInCount(user.$id),
          getCompletionCount(user.$id),
          getRecentCompletions(user.$id),
          getMessages("global", 3),
        ]);
      setUnreadCount(notifications);
      setTodayCheckIn(checkIn);
      setWeeklyCheckIns(checkIns);
      setTotalCompletions(completions);
      setWeeklyCompletions(recent.length);
      setRecentMessages(messages.reverse());
    } catch {
      // Individual destination screens remain the source of truth.
    }
  }, [user]);

  useFocusEffect(useCallback(() => void load(), [load]));

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.signal} />
      </SafeAreaView>
    );
  }

  const campusLabel =
    theme === "school" && schoolTheme.key !== "tm"
      ? schoolTheme.name
      : profile.school && !["Other", "N/A"].includes(profile.school)
        ? profile.school
        : "Third & Manageable";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View style={styles.brand}>
            <View style={[styles.mark, { backgroundColor: colors.signal }]}>
              <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
            </View>
            <View>
              <Text style={[styles.brandName, { color: colors.textPrimary }]}>Third & Manageable</Text>
              <Text style={[styles.campus, { color: colors.textTertiary }]} numberOfLines={1}>{campusLabel}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <View style={styles.notificationWrapper}>
              <GlassSurface radius={22} interactive style={styles.notification}>
                <Ionicons name="notifications-outline" size={19} color={colors.textPrimary} />
              </GlassSurface>
              {unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>

        <GlassSurface
          tone="strong"
          radius={30}
          style={[styles.hero, compact && styles.heroCompact]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[`${colors.signal}20`, `${colors.signalDark}08`, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.heroEyebrow, { color: colors.signal }]}>Your next chapter · today’s huddle</Text>
          <Text
            style={[
              styles.heroTitle,
              compact && styles.heroTitleCompact,
              { color: colors.textPrimary },
            ]}
          >
            Welcome back, {profile.display_name}.
          </Text>
          <Text style={[styles.heroBody, { color: colors.textSecondary }]}>The jersey can change. The way you show up doesn’t have to.</Text>
          <View style={styles.identityRow}>
            <View style={[styles.identityPill, { backgroundColor: colors.signalSoft }]}>
              <Ionicons name={profile.verified ? "shield-checkmark" : "shield-outline"} size={13} color={colors.signal} />
              <Text style={[styles.identityText, { color: colors.signal }]}>{profile.verified ? "Verified athlete" : "Athlete profile"}</Text>
            </View>
            {sport ? (
              <View style={[styles.identityPill, { backgroundColor: colors.surfaceStrong }]}>
                <Image source={sport.icon} style={[styles.sportIcon, { tintColor: colors.textSecondary }]} />
                <Text style={[styles.identityText, { color: colors.textSecondary }]}>{sport.label}</Text>
              </View>
            ) : null}
          </View>
        </GlassSurface>

        <Pressable onPress={() => router.push("/(tabs)/check-in")}>
          <GlassSurface tone={todayCheckIn ? "regular" : "signal"} style={styles.checkInCard}>
            <View style={[styles.checkInIcon, { backgroundColor: todayCheckIn ? `${colors.success}18` : colors.signalSoft }]}>
              <Ionicons name={todayCheckIn ? "checkmark" : "heart-outline"} size={22} color={todayCheckIn ? colors.success : colors.signal} />
            </View>
            <View style={styles.checkInCopy}>
              <SectionLabel>Daily check-in</SectionLabel>
              <Text style={[styles.checkInTitle, { color: colors.textPrimary }]}>{todayCheckIn ? "You showed up today" : "How are you arriving?"}</Text>
              <Text style={[styles.checkInSubtitle, { color: colors.textSecondary }]}>{todayCheckIn ? "Continue the conversation with your coach." : "One honest minute. No performance required."}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </GlassSurface>
        </Pressable>

        <View style={styles.sectionHeading}>
          <SectionLabel>This week</SectionLabel>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>The small scoreboard</Text>
        </View>
        <View style={styles.stats}>
          <Stat value={String(weeklyCheckIns)} label="Check-ins" icon="heart-outline" />
          <Stat value={String(weeklyCompletions)} label="Game-plan reps" icon="checkmark-done-outline" />
          <Stat value={String(profile.streak ?? 0)} label="Day streak" icon="flame-outline" />
        </View>

        {sport && progress ? (
          <Pressable onPress={() => router.push("/(tabs)/progress")}>
            <GlassSurface style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <View>
                  <SectionLabel>Your 90-day journey</SectionLabel>
                  <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>{sport.periodName} {progress.currentPeriod} of {sport.totalPeriods}</Text>
                </View>
                <Text style={[styles.progressPercent, { color: colors.signal }]}>{progress.overallProgress}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
                <View style={[styles.progressFill, { backgroundColor: colors.signal, width: `${progress.overallProgress}%` }]} />
              </View>
              <Text style={[styles.progressCopy, { color: colors.textSecondary }]}>{getProgressMessage(progress, sport.periodName)}</Text>
            </GlassSurface>
          </Pressable>
        ) : null}

        <View style={styles.sectionHeading}>
          <SectionLabel>Move the chains</SectionLabel>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pick your next rep</Text>
        </View>
        <View style={styles.quickGrid}>
          <QuickAction expanded={expanded} title="Game Plan" subtitle={`${totalCompletions} reps banked`} icon="map-outline" onPress={() => router.push("/(tabs)/game-plan")} />
          <QuickAction expanded={expanded} title="Clipboard" subtitle="Private AI coach" icon="sparkles-outline" onPress={() => router.push("/(tabs)/clipboard")} />
          <QuickAction expanded={expanded} title="Support" subtitle="Help right now" icon="heart-circle-outline" onPress={() => router.push("/(tabs)/support")} />
          <QuickAction expanded={expanded} title="Perks" subtitle="Earned rewards" icon="trophy-outline" onPress={() => router.push("/(tabs)/perks")} />
        </View>

        <Pressable onPress={() => router.push("/(tabs)/community")}>
          <GlassSurface style={styles.communityCard}>
            <View style={styles.communityHeader}>
              <View>
                <SectionLabel>Your team</SectionLabel>
                <Text style={[styles.communityTitle, { color: colors.textPrimary }]}>Athlete community</Text>
              </View>
              <GlassButton label="Open" variant="glass" compact onPress={() => router.push("/(tabs)/community")} />
            </View>
            {recentMessages.length ? recentMessages.map((message) => (
              <View key={message.id} style={styles.messagePreview}>
                <View style={[styles.messageAvatar, { backgroundColor: colors.signalSoft }]}><Text style={[styles.avatarText, { color: colors.signal }]}>{message.display_name?.slice(0, 1).toUpperCase() ?? "?"}</Text></View>
                <View style={styles.messageCopy}>
                  <Text style={[styles.messageName, { color: colors.textPrimary }]}>{message.display_name}</Text>
                  <Text style={[styles.messageBody, { color: colors.textSecondary }]} numberOfLines={1}>{message.content}</Text>
                </View>
              </View>
            )) : <Text style={[styles.empty, { color: colors.textSecondary }]}>Be the first athlete to start today’s conversation.</Text>}
          </GlassSurface>
        </Pressable>

        <GlassSurface tone="signal" style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={20} color={colors.signal} />
          <View style={styles.tipCopy}>
            <SectionLabel>Today’s film note</SectionLabel>
            <Text style={[styles.tip, { color: colors.textPrimary }]}>{getDailyTip()}</Text>
          </View>
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useAppTheme();
  return (
    <GlassSurface style={styles.stat}>
      <Ionicons name={icon} size={16} color={colors.signal} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </GlassSurface>
  );
}

function QuickAction({ expanded, title, subtitle, icon, onPress }: { expanded: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable style={[styles.quickCell, expanded && styles.quickCellExpanded]} onPress={onPress}>
      <GlassSurface interactive style={styles.quickAction}>
        <View style={[styles.quickIcon, { backgroundColor: colors.signalSoft }]}><Ionicons name={icon} size={20} color={colors.signal} /></View>
        <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.quickSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingBottom: 120 },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  mark: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  logo: { width: 24, height: 24, tintColor: "#FFFFFF" },
  brandName: { fontFamily: "Raleway-Bold", fontSize: 13 },
  campus: { fontFamily: "DMMono-Regular", fontSize: 7, marginTop: 3, maxWidth: 220, textTransform: "uppercase", letterSpacing: 0.5 },
  notificationWrapper: { width: 44, height: 44, position: "relative" },
  notification: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -3, top: -3, minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "white", fontFamily: "DMMono-Medium", fontSize: 7 },
  hero: { margin: 20, marginTop: 8, padding: 24, minHeight: 235, justifyContent: "flex-end" },
  heroCompact: { marginHorizontal: 16, padding: 20, minHeight: 210 },
  heroEyebrow: { fontFamily: "DMMono-Medium", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.4 },
  heroTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 40, lineHeight: 43, marginTop: 8 },
  heroTitleCompact: { fontSize: 35, lineHeight: 38 },
  heroBody: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20, maxWidth: 290, marginTop: 8 },
  identityRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 17 },
  identityPill: { minHeight: 29, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10 },
  identityText: { fontFamily: "DMMono-Medium", fontSize: 8 },
  sportIcon: { width: 13, height: 13 },
  checkInCard: { marginHorizontal: 20, padding: 17, flexDirection: "row", alignItems: "center", gap: 12 },
  checkInIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  checkInCopy: { flex: 1 },
  checkInTitle: { fontFamily: "Raleway-Bold", fontSize: 14 },
  checkInSubtitle: { fontFamily: "Raleway-Medium", fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionHeading: { marginHorizontal: 20, marginTop: 28, marginBottom: 11 },
  sectionTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 27, lineHeight: 30 },
  stats: { flexDirection: "row", gap: 8, paddingHorizontal: 20 },
  stat: { flex: 1, minHeight: 105, padding: 13, justifyContent: "space-between" },
  statValue: { fontFamily: "InstrumentSerif-Regular", fontSize: 28, lineHeight: 30 },
  statLabel: { fontFamily: "DMMono-Regular", fontSize: 7, textTransform: "uppercase", lineHeight: 11 },
  progressCard: { marginHorizontal: 20, marginTop: 12, padding: 18 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  progressTitle: { fontFamily: "Raleway-Bold", fontSize: 14 },
  progressPercent: { fontFamily: "DMMono-Medium", fontSize: 11 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 15 },
  progressFill: { height: "100%", borderRadius: 4 },
  progressCopy: { fontFamily: "Raleway-Medium", fontSize: 10, lineHeight: 15, marginTop: 10 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 20 },
  quickCell: { width: "48.5%" },
  quickCellExpanded: { width: "23.9%" },
  quickAction: { minHeight: 130, padding: 16 },
  quickIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  quickTitle: { fontFamily: "Raleway-Bold", fontSize: 14 },
  quickSubtitle: { fontFamily: "Raleway-Medium", fontSize: 10, marginTop: 3 },
  communityCard: { marginHorizontal: 20, marginTop: 26, padding: 18 },
  communityHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  communityTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 25 },
  messagePreview: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  messageAvatar: { width: 30, height: 30, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "DMMono-Medium", fontSize: 9 },
  messageCopy: { flex: 1 },
  messageName: { fontFamily: "Raleway-Bold", fontSize: 11 },
  messageBody: { fontFamily: "Raleway-Medium", fontSize: 10, marginTop: 2 },
  empty: { fontFamily: "Raleway-Medium", fontSize: 11, paddingVertical: 8 },
  tipCard: { margin: 20, padding: 18, flexDirection: "row", gap: 12 },
  tipCopy: { flex: 1 },
  tip: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18 },
});
