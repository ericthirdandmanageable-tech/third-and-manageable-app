import {
  GlassButton,
  GlassSurface,
  ScreenHeader,
  SectionLabel,
} from "@/components/ui/liquid-glass";
import {
  FAVORITE_OPTIONS,
  ROLE_OPTIONS,
  deriveCareerSkillMap,
  rankCareerPaths,
  type CareerIntakeAnswers,
} from "@/constants/career-intake";
import { CATEGORY_LABELS, getTodayAction, type DailyAction } from "@/constants/actions";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { useAdaptiveLayout } from "@/hooks/use-adaptive-layout";
import {
  completeAction,
  getCompletionCount,
  getRecentCompletions,
  getTodayCompletion,
} from "@/services/gameplan";
import { getCareerIntake, saveCareerIntake } from "@/services/career";
import type { GamePlanCompletion } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GamePlanScreen() {
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();
  const { medium } = useAdaptiveLayout();
  const [action, setAction] = useState<DailyAction | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [weekCompletions, setWeekCompletions] = useState<GamePlanCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [intake, setIntake] = useState<CareerIntakeAnswers | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const todayAction = getTodayAction(user.$id);
      const [todayDone, count, recent, storedIntake] = await Promise.all([
        getTodayCompletion(user.$id, todayAction.id),
        getCompletionCount(user.$id),
        getRecentCompletions(user.$id),
        getCareerIntake(),
      ]);
      setAction(todayAction);
      setCompleted(Boolean(todayDone));
      setTotalCompleted(count);
      setWeekCompletions(recent);
      if (storedIntake) setIntake(storedIntake);
    } catch {
      // The plan shell should still render if one data source is unavailable.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => void loadData(), [loadData]));

  const handleComplete = async () => {
    if (!user?.$id || !action || completed) return;
    setCompleting(true);
    try {
      await completeAction(user.$id, action.id);
      setCompleted(true);
      setTotalCompleted((value) => value + 1);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error: any) {
      Alert.alert("Could not save", error.message || "Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const skillMap = useMemo(
    () => deriveCareerSkillMap(intake, profile?.sport),
    [intake, profile?.sport],
  );
  const rankedPaths = useMemo(
    () => (intake ? rankCareerPaths(intake).slice(0, 3) : []),
    [intake],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator color={colors.signal} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={`Day ${Math.max(totalCompleted + 1, 1)} / 90`}
          title="Your Game Plan"
          subtitle="Translate what the game taught you into a working life that fits."
          icon="map-outline"
        />

        <GlassSurface tone="signal" style={styles.journey}>
          <View style={styles.journeyHeader}>
            <SectionLabel>Reset · Rebuild · Relaunch</SectionLabel>
            <Text style={[styles.mono, { color: colors.signal }]}>{Math.min(100, Math.round((totalCompleted / 90) * 100))}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.fill, { width: `${Math.max(4, Math.min(100, (totalCompleted / 90) * 100))}%`, backgroundColor: colors.signal }]} />
          </View>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>Every deliberate rep counts, even when the scoreboard looks quiet.</Text>
        </GlassSurface>

        <View style={styles.sectionHeader}>
          <View>
            <SectionLabel>Transferable skill map</SectionLabel>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What the game taught you</Text>
          </View>
          <GlassButton
            label={intake ? "Retake" : "Build yours"}
            icon={intake ? "refresh-outline" : "sparkles-outline"}
            variant="glass"
            compact
            onPress={() => setIntakeOpen(true)}
          />
        </View>

        <GlassSurface style={styles.skillCard}>
          {!intake ? (
            <Text style={[styles.caption, styles.intakePrompt, { color: colors.textSecondary }]}>A two-minute, story-first intake sharpens these translations and re-ranks your paths. The starter map comes from your sport profile.</Text>
          ) : null}
          {skillMap.map((entry) => (
            <View key={entry.skill} style={styles.skillRow}>
              <View style={[styles.skillChip, { backgroundColor: colors.signalSoft }]}>
                <Text style={[styles.skillChipText, { color: colors.signal }]}>{entry.skill}</Text>
              </View>
              <Ionicons name="arrow-forward" size={15} color={colors.textTertiary} />
              <View style={styles.skillCopy}>
                <Text style={[styles.skillTranslation, { color: colors.textPrimary }]}>{entry.translation}</Text>
                <Text style={[styles.skillOrigin, { color: colors.textTertiary }]}>{entry.origin}</Text>
              </View>
            </View>
          ))}
        </GlassSurface>

        <View style={styles.sectionHeader}>
          <View>
            <SectionLabel>Path fit</SectionLabel>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {intake ? "Structures worth testing" : "Built from your story"}
            </Text>
          </View>
        </View>
        {!intake ? (
          <GlassSurface style={styles.pathEmptyCard}>
            <View style={[styles.pathIcon, { backgroundColor: colors.signalSoft }]}>
              <Ionicons name="compass-outline" size={22} color={colors.signal} />
            </View>
            <View style={styles.pathCopy}>
              <Text style={[styles.pathTitle, { color: colors.textPrimary }]}>No generic recommendations</Text>
              <Text style={[styles.pathRationale, { color: colors.textSecondary }]}>
                Complete the two-minute intake before the app ranks career structures for you.
              </Text>
            </View>
            <GlassButton label="Start" variant="glass" compact onPress={() => setIntakeOpen(true)} />
          </GlassSurface>
        ) : null}
        <View style={styles.pathGrid}>
          {rankedPaths.map((path, index) => (
            <Pressable
              key={path.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: "/(tabs)/path-detail", params: { id: path.id } })}
              style={({ pressed }) => [
                styles.pathCell,
                medium && styles.pathCellMedium,
                { opacity: pressed ? 0.82 : 1 },
              ]}
            >
              <GlassSurface tone={index === 0 ? "signal" : "regular"} style={styles.pathCard}>
                <View style={[styles.pathIcon, { backgroundColor: colors.signalSoft }]}>
                  <Ionicons name={path.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.signal} />
                </View>
                <View style={styles.pathCopy}>
                  <View style={styles.pathTitleRow}>
                    <Text style={[styles.pathTitle, { color: colors.textPrimary }]}>{path.name}</Text>
                    <Text style={[styles.fit, { color: colors.signal }]}>{index === 0 ? "Strong fit" : path.fit}</Text>
                  </View>
                  <Text style={[styles.pathRationale, { color: colors.textSecondary }]} numberOfLines={2}>{path.rationale}</Text>
                  <Text style={[styles.pathMeta, { color: colors.textTertiary }]}>{path.meta}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </GlassSurface>
            </Pressable>
          ))}
        </View>

        {action ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <SectionLabel>This week’s action</SectionLabel>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>One rep for today</Text>
              </View>
            </View>
            <GlassSurface tone={completed ? "signal" : "strong"} style={styles.actionCard}>
              <View style={styles.actionTopline}>
                <Text style={[styles.actionKind, { color: colors.signal }]}>{CATEGORY_LABELS[action.category]}</Text>
                <Text style={[styles.actionCount, { color: colors.textTertiary }]}>{weekCompletions.length} this week</Text>
              </View>
              <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{action.title}</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{action.description}</Text>
              <GlassButton
                label={completed ? "Rep complete" : "Mark complete"}
                icon={completed ? "checkmark-circle" : "checkmark-circle-outline"}
                variant={completed ? "glass" : "primary"}
                disabled={completed || completing}
                onPress={() => void handleComplete()}
              />
            </GlassSurface>
          </>
        ) : null}
      </ScrollView>

      <CareerIntakeModal
        visible={intakeOpen}
        initial={intake}
        onClose={() => setIntakeOpen(false)}
        onComplete={async (answers) => {
          await saveCareerIntake(answers, profile?.sport ?? "other");
          setIntake(answers);
          setIntakeOpen(false);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />
    </SafeAreaView>
  );
}

function CareerIntakeModal({
  visible,
  initial,
  onClose,
  onComplete,
}: {
  visible: boolean;
  initial: CareerIntakeAnswers | null;
  onClose: () => void;
  onComplete: (answers: CareerIntakeAnswers) => Promise<void>;
}) {
  const { colors, reduceMotion } = useAppTheme();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(initial?.role ?? "");
  const [favorite, setFavorite] = useState(initial?.favorite ?? "");
  const [reliedOn, setReliedOn] = useState(initial?.reliedOn ?? "");

  const resetAndClose = () => {
    setStep(0);
    onClose();
  };

  const options = step === 0 ? ROLE_OPTIONS : FAVORITE_OPTIONS;
  const selection = step === 0 ? role : favorite;
  const setSelection = step === 0 ? setRole : setFavorite;

  return (
    <Modal visible={visible} animationType={reduceMotion ? "none" : "slide"} presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <SafeAreaView style={[styles.modal, { backgroundColor: colors.backgroundGradient[0] }]}>
        <View style={styles.modalTopbar}>
          <GlassButton label="Close" variant="glass" compact onPress={resetAndClose} />
          <Text style={[styles.modalProgress, { color: colors.textSecondary }]}>0{step + 1} / 03</Text>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.modalEyebrow, { color: colors.signal }]}>Stories, not résumés</Text>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            {step === 0
              ? "What role did you play on the team?"
              : step === 1
                ? "What did you love most about competing?"
                : "The moment teammates most relied on you was…"}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Your answers stay private and make the skill translations explainable.</Text>

          {step < 2 ? (
            <View style={styles.optionList}>
              {options.map((option) => {
                const selected = option === selection;
                return (
                  <Pressable key={option} onPress={() => setSelection(option)}>
                    <GlassSurface tone={selected ? "signal" : "regular"} style={[styles.option, selected ? { borderColor: colors.signal } : undefined]}>
                      <View style={[styles.radio, { borderColor: selected ? colors.signal : colors.borderStrong }]}>
                        {selected ? <View style={[styles.radioFill, { backgroundColor: colors.signal }]} /> : null}
                      </View>
                      <Text style={[styles.optionText, { color: colors.textPrimary }]}>{option}</Text>
                    </GlassSurface>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <GlassSurface tone="strong" style={styles.storyField}>
              <TextInput
                autoFocus
                multiline
                value={reliedOn}
                onChangeText={setReliedOn}
                placeholder="A sentence or two. Think of a moment, not a title."
                placeholderTextColor={colors.textTertiary}
                style={[styles.storyInput, { color: colors.textPrimary }]}
              />
            </GlassSurface>
          )}
        </ScrollView>
        <View style={styles.modalFooter}>
          {step > 0 ? (
            <View style={styles.footerButton}>
              <GlassButton label="Back" variant="glass" onPress={() => setStep((value) => value - 1)} />
            </View>
          ) : null}
          <View style={styles.footerButton}>
            <GlassButton
              label={step === 2 ? "Build my map" : "Continue"}
              icon={step === 2 ? "sparkles-outline" : "arrow-forward"}
              disabled={step === 0 ? !role : step === 1 ? !favorite : reliedOn.trim().length < 12}
              onPress={() => {
                if (step < 2) setStep((value) => value + 1);
                else void onComplete({ role, favorite, reliedOn: reliedOn.trim() });
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingBottom: 120 },
  journey: { marginHorizontal: 20, padding: 20, marginBottom: 26 },
  journeyHeader: { flexDirection: "row", justifyContent: "space-between" },
  mono: { fontFamily: "DMMono-Medium", fontSize: 11 },
  track: { height: 8, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  fill: { height: "100%", borderRadius: 4 },
  caption: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionHeader: { marginHorizontal: 20, marginTop: 4, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 },
  sectionTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 27, lineHeight: 30 },
  skillCard: { marginHorizontal: 20, padding: 18, marginBottom: 27 },
  intakePrompt: { marginBottom: 16 },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14 },
  skillChip: { borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 110 },
  skillChipText: { fontFamily: "DMMono-Medium", fontSize: 9 },
  skillCopy: { flex: 1 },
  skillTranslation: { fontFamily: "Raleway-SemiBold", fontSize: 12, lineHeight: 17 },
  skillOrigin: { fontFamily: "Raleway-Medium", fontSize: 9, lineHeight: 14, marginTop: 2 },
  pathGrid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pathCell: { flexBasis: "100%" },
  pathCellMedium: { flexBasis: "48%", flexGrow: 1 },
  pathCard: { flex: 1, minHeight: 128, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  pathEmptyCard: { marginHorizontal: 20, marginBottom: 10, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  pathIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  pathCopy: { flex: 1 },
  pathTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pathTitle: { fontFamily: "Raleway-Bold", fontSize: 15 },
  fit: { fontFamily: "DMMono-Medium", fontSize: 8, textTransform: "uppercase" },
  pathRationale: { fontFamily: "Raleway-Medium", fontSize: 11, lineHeight: 16, marginTop: 4 },
  pathMeta: { fontFamily: "DMMono-Regular", fontSize: 8, marginTop: 5 },
  actionCard: { marginHorizontal: 20, padding: 20, marginBottom: 20 },
  actionTopline: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  actionKind: { fontFamily: "DMMono-Medium", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2 },
  actionCount: { fontFamily: "DMMono-Regular", fontSize: 9 },
  actionTitle: { fontFamily: "Raleway-Bold", fontSize: 18, lineHeight: 23 },
  actionDescription: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20, marginTop: 7, marginBottom: 18 },
  modal: { flex: 1 },
  modalTopbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
  modalProgress: { fontFamily: "DMMono-Medium", fontSize: 10 },
  modalContent: { width: "100%", maxWidth: 680, alignSelf: "center", padding: 24, paddingBottom: 120 },
  modalEyebrow: { fontFamily: "DMMono-Medium", fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 16 },
  modalTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 37, lineHeight: 42, marginTop: 10 },
  modalSubtitle: { fontFamily: "Raleway-Medium", fontSize: 13, lineHeight: 20, marginTop: 10 },
  optionList: { gap: 10, marginTop: 28 },
  option: { minHeight: 62, paddingHorizontal: 17, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontFamily: "Raleway-SemiBold", fontSize: 14 },
  storyField: { minHeight: 190, marginTop: 28, padding: 18 },
  storyInput: { flex: 1, minHeight: 150, textAlignVertical: "top", fontFamily: "Raleway-Medium", fontSize: 15, lineHeight: 23 },
  modalFooter: { position: "absolute", left: 20, right: 20, bottom: 20, flexDirection: "row", gap: 10 },
  footerButton: { flex: 1 },
});
