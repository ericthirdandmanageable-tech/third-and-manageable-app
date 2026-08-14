import { GlassSurface, SectionLabel } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { Ionicons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AuthScaffold({
  eyebrow = "Your next chapter",
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const compact = width < 400 || height < 860;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            compact && styles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <GlassSurface
            tone="strong"
            radius={compact ? 26 : 30}
            style={[styles.card, compact && styles.cardCompact]}
          >
            <View style={styles.brandRow}>
              <View style={[styles.logoShell, { backgroundColor: colors.signalSoft }]}>
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={[styles.logo, { tintColor: colors.signal }]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.brandCopy}>
                <SectionLabel style={styles.eyebrow}>{eyebrow}</SectionLabel>
                <Text style={[styles.brandName, { color: colors.textSecondary }]}>Third & Manageable</Text>
              </View>
            </View>

            <Text
              style={[
                styles.title,
                compact && styles.titleCompact,
                { color: colors.textPrimary },
              ]}
            >
              {title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>

            <View style={styles.content}>{children}</View>
          </GlassSurface>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  style,
  ...props
}: TextInputProps & { label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textTertiary}
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            backgroundColor: colors.surfaceStrong,
            borderColor: colors.borderStrong,
          },
          style,
        ]}
      />
    </View>
  );
}

export function AuthDivider() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
      <Text style={[styles.dividerLabel, { color: colors.textTertiary }]}>or</Text>
      <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
    </View>
  );
}

export function AuthProviderButton({
  provider,
  onPress,
  disabled,
  loading,
}: {
  provider: "apple" | "google";
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useAppTheme();
  const apple = provider === "apple";
  const foreground = apple ? "#FFFFFF" : colors.textPrimary;
  const label = loading
    ? "Connecting…"
    : `Continue with ${apple ? "Apple" : "Google"}`;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.providerPressable}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.providerFrame,
            { opacity: disabled ? 0.5 : pressed ? 0.82 : 1 },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.providerBackdrop,
              {
                backgroundColor: apple ? "#0A0A0B" : colors.surfaceStrong,
                borderColor: apple ? "#0A0A0B" : colors.borderStrong,
              },
            ]}
          />
          <View pointerEvents="none" style={styles.providerContent}>
            {apple ? (
              <Ionicons name="logo-apple" size={19} color={foreground} />
            ) : (
              <Text style={[styles.googleMark, { color: colors.signal }]}>G</Text>
            )}
            <Text style={[styles.providerLabel, { color: foreground }]}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  scrollContentCompact: {
    justifyContent: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  card: { width: "100%", maxWidth: 520, alignSelf: "center", padding: 28 },
  cardCompact: { padding: 20 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoShell: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  logo: { width: 26, height: 26 },
  brandCopy: { flex: 1 },
  eyebrow: { marginBottom: 1 },
  brandName: { fontFamily: "Raleway-SemiBold", fontSize: 11 },
  title: { fontFamily: "InstrumentSerif-Regular", fontSize: 34, lineHeight: 37, marginTop: 22 },
  titleCompact: { fontSize: 30, lineHeight: 33, marginTop: 17 },
  subtitle: { fontFamily: "Raleway-Medium", fontSize: 14, lineHeight: 21, marginTop: 6 },
  content: { marginTop: 24, gap: 14 },
  field: { gap: 7 },
  fieldLabel: { fontFamily: "DMMono-Medium", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase" },
  input: { height: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 15, fontFamily: "Raleway-SemiBold", fontSize: 15 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 2 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontFamily: "DMMono-Regular", fontSize: 10 },
  providerPressable: { alignSelf: "stretch" },
  providerFrame: { height: 50, borderRadius: 18, overflow: "hidden" },
  providerBackdrop: { ...StyleSheet.absoluteFill, borderRadius: 18, borderWidth: 1 },
  providerContent: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 16 },
  providerLabel: { fontFamily: "Raleway-SemiBold", fontSize: 14 },
  googleMark: { fontFamily: "Raleway-ExtraBold", fontSize: 18 },
});
