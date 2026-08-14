import { useAppTheme } from "@/context/app-theme";
import { GLASS_COLOR_SCHEME } from "@/constants/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { cssInterop } from "nativewind";
import React, { type ReactNode, useMemo } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
  useWindowDimensions,
} from "react-native";

export type GlassTone = "regular" | "strong" | "subtle" | "signal";

interface GlassSurfaceProps extends ViewProps {
  children?: ReactNode;
  className?: string;
  tone?: GlassTone;
  radius?: number;
  interactive?: boolean;
  /** Use for repeated list cells to avoid stacking GPU-heavy blur surfaces. */
  renderMode?: "auto" | "static";
}

const isNativeGlassReady = (): boolean => {
  if (Platform.OS !== "ios") return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    // A pre-existing development build may not contain the newly installed
    // native module yet. It should retain the blur fallback until rebuilt.
    return false;
  }
};

/**
 * Cross-platform liquid-glass surface.
 *
 * iOS 26 uses the real UIVisualEffect-based GlassView. Older iOS and web use
 * BlurView, Android uses a translucent material to avoid SDK 54's experimental
 * blur performance cost, and Reduce Transparency always receives an opaque
 * high-contrast surface.
 */
function GlassSurfaceBase({
  children,
  tone = "regular",
  radius = 24,
  interactive = false,
  renderMode = "auto",
  style,
  ...props
}: GlassSurfaceProps) {
  const { colors, isGlass, reduceTransparency } = useAppTheme();
  const nativeGlass = useMemo(
    () =>
      renderMode === "auto" &&
      isGlass &&
      !reduceTransparency &&
      isNativeGlassReady(),
    [isGlass, reduceTransparency, renderMode],
  );

  const surfaceStyle = useMemo<ViewStyle>(
    () => ({
      borderRadius: radius,
      overflow: "hidden",
      borderWidth: tone === "subtle" ? StyleSheet.hairlineWidth : 1,
      borderColor:
        tone === "signal" ? `${colors.signal}30` : colors.border,
      backgroundColor:
        tone === "signal"
          ? `${colors.signal}18`
          : tone === "strong"
            ? colors.surfaceStrong
            : tone === "subtle"
              ? colors.surfaceMuted
              : colors.surface,
      shadowColor: tone === "signal" ? colors.signal : colors.shadow,
      shadowOffset: { width: 0, height: tone === "strong" ? 8 : 4 },
      shadowOpacity: isGlass ? (tone === "strong" ? 0.13 : 0.08) : 0.05,
      shadowRadius: tone === "strong" ? 22 : 14,
      elevation: tone === "strong" ? 7 : 3,
    }),
    [colors, isGlass, radius, tone],
  );

  if (!isGlass || reduceTransparency || renderMode === "static") {
    return (
      <View {...props} style={[surfaceStyle, style]}>
        {children}
      </View>
    );
  }

  if (nativeGlass) {
    return (
      <GlassView
        {...props}
        colorScheme={GLASS_COLOR_SCHEME}
        glassEffectStyle={tone === "subtle" ? "clear" : "regular"}
        isInteractive={interactive}
        tintColor={tone === "signal" ? `${colors.signal}20` : undefined}
        style={[surfaceStyle, styles.nativeGlassBackground, style]}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === "ios" || Platform.OS === "web") {
    return (
      <BlurView
        {...props}
        intensity={tone === "strong" ? 72 : tone === "subtle" ? 36 : 54}
        tint="systemUltraThinMaterialLight"
        style={[surfaceStyle, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View {...props} style={[surfaceStyle, style]}>
      {children}
    </View>
  );
}

export const GlassSurface = cssInterop(GlassSurfaceBase, {
  className: "style",
});

/** A glass-token surface without a per-cell native blur pass. */
export function GlassListSurface(props: GlassSurfaceProps) {
  return <GlassSurface {...props} renderMode="static" />;
}

interface GlassButtonProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "glass" | "danger";
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function GlassButton({
  label,
  onPress,
  icon,
  variant = "primary",
  disabled = false,
  compact = false,
  style,
  textStyle,
  accessibilityLabel,
}: GlassButtonProps) {
  const { colors } = useAppTheme();
  const isPrimary = variant === "primary";
  const foreground = isPrimary
    ? colors.signalInk
    : variant === "danger"
      ? colors.semantic.danger
      : colors.textPrimary;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        collapsable={false}
        disabled={disabled}
        onPress={onPress}
        style={styles.buttonPressable}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.buttonFrame,
              compact && styles.buttonFrameCompact,
              {
                opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
                transform: [{ scale: pressed ? 0.985 : 1 }],
              },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                styles.buttonBackdrop,
                {
                  backgroundColor: isPrimary ? colors.signal : colors.surfaceStrong,
                  borderColor: isPrimary ? colors.signal : colors.borderStrong,
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.buttonContent,
                compact && styles.buttonContentCompact,
              ]}
            >
              {icon ? (
                <Ionicons
                  name={icon}
                  size={compact ? 16 : 18}
                  color={foreground}
                />
              ) : null}
              <Text
                style={[
                  styles.buttonLabel,
                  compact && styles.buttonLabelCompact,
                  { color: foreground },
                  textStyle,
                ]}
              >
                {label}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

interface ScreenHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  action,
}: ScreenHeaderProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 420;
  return (
    <View style={[styles.header, compact && styles.headerCompact]}>
      <View style={styles.headerCopy}>
        {eyebrow ? (
          <Text style={[styles.eyebrow, { color: colors.signal }]}>{eyebrow}</Text>
        ) : null}
        <View style={styles.titleRow}>
          {icon ? (
            <View style={[styles.headerIcon, { backgroundColor: colors.signalSoft }]}>
              <Ionicons name={icon} size={20} color={colors.signal} />
            </View>
          ) : null}
          <Text
            style={[
              styles.title,
              compact && styles.titleCompact,
              { color: colors.textPrimary },
            ]}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode;
  style?: TextStyle;
}) {
  const { colors } = useAppTheme();
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  nativeGlassBackground: {
    backgroundColor: "transparent",
  },
  buttonPressable: {
    alignSelf: "stretch",
  },
  buttonFrame: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonFrameCompact: {
    height: 40,
    borderRadius: 20,
  },
  buttonBackdrop: {
    ...StyleSheet.absoluteFill,
    borderRadius: 25,
    borderWidth: 1,
  },
  buttonContent: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  buttonContentCompact: {
    height: 40,
    paddingHorizontal: 14,
  },
  buttonLabel: {
    fontFamily: "Raleway-Bold",
    fontSize: 15,
  },
  buttonLabelCompact: {
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  headerCompact: {
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: "DMMono-Medium",
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontFamily: "InstrumentSerif-Regular",
    fontSize: 38,
    lineHeight: 42,
  },
  titleCompact: {
    fontSize: 34,
    lineHeight: 37,
  },
  subtitle: {
    fontFamily: "Raleway-Medium",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
    maxWidth: 330,
  },
  sectionLabel: {
    fontFamily: "DMMono-Medium",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
});
