import { DayCounterArtifact } from "@/components/artifacts/DayCounterArtifact";
import {
  GlassButton,
  GlassSurface,
  ScreenHeader,
  SectionLabel,
} from "@/components/ui/liquid-glass";
import { SPORTS } from "@/constants/sports";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import {
  computeProgress,
  getMilestoneMessage,
  getProgressMessage,
  type ProgressInfo,
} from "@/lib/progress";
import { upsertProfile } from "@/services/auth";
import type { SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

export default function ProgressScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors } = useAppTheme();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const artifactRef = useRef<View>(null);

  const progress: ProgressInfo | null = useMemo(
    () =>
      profile?.joined_at && sport
        ? computeProgress(profile.joined_at, sport)
        : null,
    [profile?.joined_at, sport],
  );

  useEffect(() => {
    if (!progress || !profile || !user?.$id || !sport) return;
    if (progress.currentPeriod !== profile.current_quarter) {
      void upsertProfile({ id: user.$id, current_quarter: progress.currentPeriod })
        .then(refreshProfile)
        .catch(() => undefined);
    }
  }, [profile, progress, refreshProfile, sport, user?.$id]);

  useEffect(() => {
    if (progress?.justAdvanced && sport) {
      setMilestoneMessage(
        getMilestoneMessage(progress.currentPeriod, progress.totalPeriods, sport.periodName),
      );
      setMilestoneVisible(true);
    }
  }, [progress, sport]);

  if (!profile || !sport || !progress) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.signal} />
      </SafeAreaView>
    );
  }

  const shareArtifact = async () => {
    if (!artifactRef.current) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Sharing unavailable", "Image sharing is not available on this device.");
        return;
      }
      const uri = await captureRef(artifactRef, { format: "png", quality: 1, result: "tmpfile" });
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your 90-day journey" });
    } catch {
      Alert.alert("Could not create artifact", "Please try again in a moment.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Your 90-day journey" title="Progress" subtitle="No comparison. No public scoreboard. Just evidence that you keep showing up." icon="trending-up-outline" />

        <GlassSurface tone="strong" style={styles.progressCard}>
          <View style={styles.progressTopline}>
            <View>
              <SectionLabel>{sport.periodName} progress</SectionLabel>
              <Text style={[styles.phaseTitle, { color: colors.textPrimary }]}>{sport.periodName} {progress.currentPeriod} of {progress.totalPeriods}</Text>
            </View>
            <Text style={[styles.percent, { color: colors.signal }]}>{progress.overallProgress}%</Text>
          </View>
          <View style={styles.segmentRow}>
            {Array.from({ length: progress.totalPeriods }).map((_, index) => {
              const complete = index < progress.currentPeriod - 1 || progress.journeyComplete;
              const current = index === progress.currentPeriod - 1 && !progress.journeyComplete;
              return (
                <View key={index} style={[styles.segment, { backgroundColor: colors.surfaceMuted }]}>
                  {complete ? <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.signal }]} /> : null}
                  {current ? <View style={[styles.segmentFill, { backgroundColor: colors.signal, width: `${progress.periodProgress}%` }]} /> : null}
                </View>
              );
            })}
          </View>
          <Text style={[styles.dayLine, { color: colors.textSecondary }]}>Day {progress.daysElapsed} of 90 · {progress.daysRemaining} remaining</Text>
          <Text style={[styles.encouragement, { color: colors.textPrimary }]}>{getProgressMessage(progress, sport.periodName)}</Text>
        </GlassSurface>

        <View style={styles.stats}>
          <Stat value={profile.streak ?? 0} label="Day streak" icon="flame-outline" />
          <Stat value={progress.daysElapsed} label="Days active" icon="calendar-outline" />
          <Stat value={progress.daysRemaining} label="Days left" icon="hourglass-outline" />
        </View>

        <View style={styles.sectionHeading}>
          <SectionLabel>Private by default</SectionLabel>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Your day-counter artifact</Text>
          <Text style={[styles.sectionCopy, { color: colors.textSecondary }]}>A designed snapshot of your progress. Nothing leaves the app until you choose to share it.</Text>
        </View>
        <View ref={artifactRef} collapsable={false} style={styles.artifactWrap}>
          <DayCounterArtifact day={Math.max(1, progress.daysElapsed)} phase={`${sport.periodName} ${progress.currentPeriod}`} streak={profile.streak ?? 0} athlete={profile.display_name} />
        </View>
        <GlassButton label={sharing ? "Building image…" : "Share artifact"} icon="share-outline" disabled={sharing} onPress={() => void shareArtifact()} style={styles.shareButton} />

        <GlassSurface style={styles.mapCard}>
          <SectionLabel>Journey map</SectionLabel>
          {Array.from({ length: progress.totalPeriods }).map((_, index) => {
            const number = index + 1;
            const complete = number < progress.currentPeriod || progress.journeyComplete;
            const current = number === progress.currentPeriod && !progress.journeyComplete;
            const start = Math.round((index * 90) / progress.totalPeriods) + 1;
            const end = Math.round(((index + 1) * 90) / progress.totalPeriods);
            return (
              <View key={number} style={styles.mapRow}>
                <View style={[styles.mapNode, { backgroundColor: complete ? colors.signal : current ? colors.signalSoft : colors.surfaceMuted }]}>
                  {complete ? <Ionicons name="checkmark" size={15} color={colors.signalInk} /> : <Text style={[styles.mapNumber, { color: current ? colors.signal : colors.textTertiary }]}>{number}</Text>}
                </View>
                <View style={styles.mapCopy}>
                  <Text style={[styles.mapTitle, { color: current || complete ? colors.textPrimary : colors.textTertiary }]}>{sport.periodName} {number}</Text>
                  <Text style={[styles.mapMeta, { color: colors.textTertiary }]}>Day {start}–{end}{current ? " · now" : ""}</Text>
                </View>
              </View>
            );
          })}
        </GlassSurface>
      </ScrollView>

      <Modal visible={milestoneVisible} transparent animationType="fade" onRequestClose={() => setMilestoneVisible(false)}>
        <View style={styles.overlay}>
          <GlassSurface tone="strong" style={styles.modalCard}>
            <View style={[styles.trophy, { backgroundColor: colors.signalSoft }]}><Ionicons name="trophy" size={31} color={colors.signal} /></View>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Milestone reached</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>{milestoneMessage}</Text>
            <GlassButton label="Keep going" onPress={() => setMilestoneVisible(false)} style={styles.modalButton} />
          </GlassSurface>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useAppTheme();
  return (
    <GlassSurface style={styles.stat}>
      <Ionicons name={icon} size={17} color={colors.signal} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 120 },
  progressCard: { marginHorizontal: 20, padding: 20 },
  progressTopline: { flexDirection: "row", justifyContent: "space-between" },
  phaseTitle: { fontFamily: "Raleway-Bold", fontSize: 16 },
  percent: { fontFamily: "DMMono-Medium", fontSize: 13 },
  segmentRow: { flexDirection: "row", gap: 5, marginTop: 18 },
  segment: { flex: 1, height: 9, borderRadius: 5, overflow: "hidden" },
  segmentFill: { height: "100%" },
  dayLine: { fontFamily: "DMMono-Regular", fontSize: 8, marginTop: 10 },
  encouragement: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20, marginTop: 14 },
  stats: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginTop: 10 },
  stat: { flex: 1, minHeight: 105, padding: 13, justifyContent: "space-between" },
  statValue: { fontFamily: "InstrumentSerif-Regular", fontSize: 28 },
  statLabel: { fontFamily: "DMMono-Regular", fontSize: 7, textTransform: "uppercase" },
  sectionHeading: { marginHorizontal: 20, marginTop: 30, marginBottom: 13 },
  sectionTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 27 },
  sectionCopy: { fontFamily: "Raleway-Medium", fontSize: 11, lineHeight: 17, marginTop: 5 },
  artifactWrap: { marginHorizontal: 20, borderRadius: 28, overflow: "hidden" },
  shareButton: { marginHorizontal: 20, marginTop: 12 },
  mapCard: { margin: 20, padding: 20 },
  mapRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  mapNode: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  mapNumber: { fontFamily: "DMMono-Medium", fontSize: 10 },
  mapCopy: { flex: 1 },
  mapTitle: { fontFamily: "Raleway-Bold", fontSize: 13 },
  mapMeta: { fontFamily: "DMMono-Regular", fontSize: 8, marginTop: 3 },
  overlay: { flex: 1, backgroundColor: "rgba(5,12,28,0.48)", padding: 22, alignItems: "center", justifyContent: "center" },
  modalCard: { width: "100%", padding: 24, alignItems: "center" },
  trophy: { width: 64, height: 64, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  modalTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 31, marginTop: 14 },
  modalBody: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 7 },
  modalButton: { alignSelf: "stretch", marginTop: 20 },
});
