import {
  GlassButton,
  GlassSurface,
  ScreenHeader,
  SectionLabel,
} from "@/components/ui/liquid-glass";
import { getCareerPath } from "@/constants/career-paths";
import { useAppTheme } from "@/context/app-theme";
import { getCommittedPath, setCommittedPath } from "@/services/career";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PathDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const path = getCareerPath(id);
  const { colors } = useAppTheme();
  const [committed, setCommitted] = useState(false);

  useEffect(() => {
    void getCommittedPath().then((value) => setCommitted(value === id));
  }, [id]);

  if (!path) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Path not found" subtitle="That work structure is not in the current registry." />
        <GlassButton label="Back to Game Plan" onPress={() => router.back()} style={styles.sideMargin} />
      </SafeAreaView>
    );
  }

  const toggleCommit = async () => {
    if (committed) {
      await setCommittedPath(null);
      setCommitted(false);
    } else {
      await setCommittedPath(path.id);
      setCommitted(true);
    }
  };

  const list = (items: string[], icon: keyof typeof Ionicons.glyphMap) =>
    items.map((item) => (
      <View key={item} style={styles.bulletRow}>
        <Ionicons name={icon} size={15} color={colors.signal} />
        <Text style={[styles.body, styles.bulletCopy, { color: colors.textPrimary }]}>{item}</Text>
      </View>
    ));

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassButton label="Game Plan" icon="chevron-back" variant="glass" compact onPress={() => router.back()} style={styles.back} />
        <ScreenHeader eyebrow={path.meta} title={path.name} subtitle={path.tagline} icon={path.icon as keyof typeof Ionicons.glyphMap} />
        <GlassButton
          label={committed ? "Committed — tap to undo" : "Commit to this path"}
          icon={committed ? "checkmark-circle" : "flag-outline"}
          variant={committed ? "glass" : "primary"}
          onPress={() => void toggleCommit()}
          style={styles.sideMargin}
        />

        <View style={styles.grid}>
          <GlassSurface style={styles.halfCard}>
            <SectionLabel>Schedule shape</SectionLabel>
            <Text style={[styles.body, { color: colors.textPrimary }]}>{path.schedule}</Text>
          </GlassSurface>
          <GlassSurface style={styles.halfCard}>
            <SectionLabel>Income texture</SectionLabel>
            <Text style={[styles.body, { color: colors.textPrimary }]}>{path.income}</Text>
          </GlassSurface>
        </View>

        <GlassSurface style={styles.card}>
          <SectionLabel>What athletes love</SectionLabel>
          {list(path.loves, "heart-outline")}
        </GlassSurface>
        <GlassSurface style={styles.card}>
          <SectionLabel>What gets hard</SectionLabel>
          {list(path.challenges, "warning-outline")}
        </GlassSurface>
        <GlassSurface tone="signal" style={styles.card}>
          <SectionLabel>First three reps</SectionLabel>
          {path.firstReps.map((rep, index) => (
            <View key={rep} style={styles.repRow}>
              <Text style={[styles.repNumber, { color: colors.signal }]}>0{index + 1}</Text>
              <Text style={[styles.body, styles.bulletCopy, { color: colors.textPrimary }]}>{rep}</Text>
            </View>
          ))}
        </GlassSurface>
        <GlassSurface style={styles.forumCard}>
          <View style={[styles.forumIcon, { backgroundColor: colors.signalSoft }]}>
            <Ionicons name="people-outline" size={22} color={colors.signal} />
          </View>
          <View style={styles.forumCopy}>
            <Text style={[styles.forumTitle, { color: colors.textPrimary }]}>{path.forumName}</Text>
            <Text style={[styles.forumSubtitle, { color: colors.textSecondary }]}>Meet athletes testing the same structure.</Text>
          </View>
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingBottom: 120 },
  back: { alignSelf: "flex-start", marginLeft: 20, marginTop: 6, marginBottom: 8 },
  sideMargin: { marginHorizontal: 20, marginBottom: 18 },
  grid: { flexDirection: "row", gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  halfCard: { flex: 1, padding: 18 },
  card: { marginHorizontal: 20, padding: 20, marginBottom: 12 },
  body: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginBottom: 11 },
  bulletCopy: { flex: 1 },
  repRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 9 },
  repNumber: { fontFamily: "DMMono-Medium", fontSize: 12, paddingTop: 2 },
  forumCard: { marginHorizontal: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 13 },
  forumIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  forumCopy: { flex: 1 },
  forumTitle: { fontFamily: "Raleway-Bold", fontSize: 15 },
  forumSubtitle: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18, marginTop: 3 },
});
