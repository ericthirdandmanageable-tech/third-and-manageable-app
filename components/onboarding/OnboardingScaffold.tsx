import { GlassButton, GlassSurface } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { Ionicons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ViewStyle,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function OnboardingScaffold({
  step,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  onBack,
  loading = false,
  scroll = true,
}: {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onBack?: () => void;
  loading?: boolean;
  scroll?: boolean;
}) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 420 || height < 860;
  const body = (
    <View style={[styles.body, compact && styles.bodyCompact]}>
      <GlassSurface
        tone="strong"
        style={[styles.header, compact && styles.headerCompact]}
      >
        <Text style={[styles.step, { color: colors.signal }]}>Step {step} of 4</Text>
        <Text
          style={[
            styles.title,
            compact && styles.titleCompact,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map((value) => (
            <View
              key={value}
              style={[
                styles.progressPill,
                {
                  backgroundColor:
                    value <= step ? colors.signal : colors.surfaceMuted,
                },
              ]}
            />
          ))}
        </View>
      </GlassSurface>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{body}</View>
      )}
      <View style={[styles.footer, compact && styles.footerCompact]}>
        {onBack ? (
          <View style={styles.backButton}>
            <GlassButton label="Back" variant="glass" onPress={onBack} />
          </View>
        ) : null}
        <View style={styles.primaryButton}>
          <GlassButton
            label={loading ? "Saving…" : primaryLabel}
            icon={step === 4 ? "sparkles-outline" : "arrow-forward"}
            disabled={primaryDisabled || loading}
            onPress={onPrimary}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export function OnboardingOption({
  selected,
  title,
  description,
  icon,
  image,
  onPress,
  style,
}: {
  selected: boolean;
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  image?: ReactNode;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <GlassSurface
        tone={selected ? "signal" : "regular"}
        style={[
          styles.option,
          selected ? { borderColor: colors.signal } : undefined,
          style,
        ]}
      >
        <View
          style={[
            styles.optionIcon,
            { backgroundColor: selected ? colors.signal : colors.signalSoft },
          ]}
        >
          {image ??
            (icon ? (
              <Ionicons
                name={icon}
                size={24}
                color={selected ? colors.signalInk : colors.signal}
              />
            ) : null)}
        </View>
        <View style={styles.optionCopy}>
          <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>{title}</Text>
          {description ? (
            <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
              {description}
            </Text>
          ) : null}
        </View>
        <View
          style={[
            styles.radio,
            { borderColor: selected ? colors.signal : colors.borderStrong },
          ]}
        >
          {selected ? (
            <View style={[styles.radioFill, { backgroundColor: colors.signal }]} />
          ) : null}
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 120 },
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  bodyCompact: { paddingHorizontal: 16, paddingTop: 8, gap: 10 },
  header: { padding: 22, marginBottom: 4 },
  headerCompact: { padding: 18 },
  step: {
    fontFamily: "DMMono-Medium",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: "InstrumentSerif-Regular",
    fontSize: 36,
    lineHeight: 40,
    marginTop: 8,
  },
  titleCompact: { fontSize: 32, lineHeight: 35 },
  subtitle: {
    fontFamily: "Raleway-Medium",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  progressRow: { flexDirection: "row", gap: 5, marginTop: 17 },
  progressPill: { flex: 1, height: 4, borderRadius: 2 },
  option: { padding: 16, flexDirection: "row", alignItems: "center", gap: 13 },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: { flex: 1 },
  optionTitle: { fontFamily: "Raleway-Bold", fontSize: 15 },
  optionDescription: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18, marginTop: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  footer: {
    position: "absolute",
    bottom: 18,
    width: "92%",
    maxWidth: 640,
    alignSelf: "center",
    flexDirection: "row",
    gap: 10,
  },
  footerCompact: { bottom: 12 },
  backButton: { flex: 1 },
  primaryButton: { flex: 2 },
});
