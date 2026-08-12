import { GlassButton, GlassSurface, SectionLabel } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  type ImageSourcePropType,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewToken,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CarouselSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  image: ImageSourcePropType;
}

const SLIDES: CarouselSlide[] = [
  {
    id: "1",
    eyebrow: "Built for the next chapter",
    title: "You are more than the jersey.",
    subtitle:
      "Rebuild confidence, structure, and momentum after sport—one honest rep at a time.",
    icon: "flag-outline",
    image: require("@/assets/images/carousel-slide-1.jpg"),
  },
  {
    id: "2",
    eyebrow: "Thirty seconds of film",
    title: "Check in before you check out.",
    subtitle:
      "Name what today feels like, then get a private response from your Clipboard coach.",
    icon: "pulse-outline",
    image: require("@/assets/images/carousel-slide-2.jpg"),
  },
  {
    id: "3",
    eyebrow: "A team that gets it",
    title: "The locker room still exists.",
    subtitle:
      "Connect with current and former athletes in a verified, moderated community.",
    icon: "people-outline",
    image: require("@/assets/images/carousel-slide-3.jpg"),
  },
  {
    id: "4",
    eyebrow: "Structure without the whistle",
    title: "Turn uncertainty into a game plan.",
    subtitle:
      "Translate your skills, explore career paths, track progress, and keep the next rep small.",
    icon: "map-outline",
    image: require("@/assets/images/carousel-slide-4.jpg"),
  },
];

export default function WelcomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<CarouselSlide>>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const activeSlide = SLIDES[activeIndex];
  const compact = width < 420 || height < 880;
  const expansive = height >= 930;

  const dotAnimations = useRef(
    SLIDES.map((_, index) => new Animated.Value(index === 0 ? 1 : 0)),
  ).current;

  useEffect(() => {
    dotAnimations.forEach((animation, index) => {
      Animated.spring(animation, {
        toValue: index === activeIndex ? 1 : 0,
        useNativeDriver: false,
        friction: 6,
        tension: 80,
      }).start();
    });
  }, [activeIndex, dotAnimations]);

  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((previous) => {
        const next = (previous + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5_000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<CarouselSlide>[] }) => {
      const index = viewableItems[0]?.index;
      if (index != null) setActiveIndex(index);
    },
    [],
  );

  const stopAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = null;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Image source={item.image} style={{ width, height }} resizeMode="cover" />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={width}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onScrollBeginDrag={stopAutoPlay}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5,12,28,0.08)", "rgba(5,12,28,0.3)", "rgba(5,12,28,0.88)"]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFill}
      />

      <GlassSurface
        tone="subtle"
        radius={999}
        style={[
          styles.brand,
          compact && styles.brandCompact,
          { top: insets.top + (compact ? 8 : 12) },
        ]}
      >
        <Image
          source={require("@/assets/images/logo.png")}
          style={[styles.logo, { tintColor: colors.signal }]}
          resizeMode="contain"
        />
        <Text style={styles.brandName}>Third & Manageable</Text>
      </GlassSurface>

      <GlassSurface
        tone="strong"
        radius={compact ? 28 : 32}
        style={[
          styles.storyCard,
          compact && styles.storyCardCompact,
          expansive && styles.storyCardExpansive,
          { bottom: insets.bottom + (compact ? 8 : 14) },
        ]}
      >
        <View style={styles.storyTopline}>
          <View style={[styles.storyIcon, { backgroundColor: colors.signalSoft }]}>
            <Ionicons name={activeSlide.icon} size={17} color={colors.signal} />
          </View>
          <SectionLabel style={styles.storyEyebrow}>{activeSlide.eyebrow}</SectionLabel>
        </View>

        <Text
          style={[
            styles.title,
            compact && styles.titleCompact,
            expansive && styles.titleExpansive,
            { color: colors.textPrimary },
          ]}
        >
          {activeSlide.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{activeSlide.subtitle}</Text>

        <View
          style={[styles.dots, compact && styles.dotsCompact]}
          accessibilityLabel={`Slide ${activeIndex + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((slide, index) => {
            const widthAnimation = dotAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: [7, 28],
            });
            const opacity = dotAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0.25, 1],
            });
            return (
              <Animated.View
                key={slide.id}
                style={[styles.dot, { width: widthAnimation, opacity, backgroundColor: colors.signal }]}
              />
            );
          })}
        </View>

        <GlassButton
          label="Sign in"
          icon="arrow-forward"
          onPress={() => router.push("/(auth)/login")}
          style={styles.primaryButton}
        />
        <GlassButton
          label="Create an account"
          icon="add-circle-outline"
          variant="glass"
          onPress={() => router.push("/(auth)/register")}
        />

        <Text style={[styles.legal, { color: colors.textTertiary }]}>By continuing, you agree to our <Text style={[styles.legalLink, { color: colors.signal }]} onPress={() => router.push("/(legal)/terms")}>Terms</Text> and <Text style={[styles.legalLink, { color: colors.signal }]} onPress={() => router.push("/(legal)/privacy")}>Privacy Policy</Text>.</Text>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071426" },
  brand: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  brandCompact: { paddingVertical: 7, paddingHorizontal: 12 },
  logo: { width: 28, height: 28 },
  brandName: {
    color: "#FFFFFF",
    fontFamily: "Raleway-Bold",
    fontSize: 14,
    letterSpacing: -0.2,
    textShadowColor: "rgba(5,12,28,0.42)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  storyCard: {
    position: "absolute",
    left: 14,
    right: 14,
    padding: 20,
  },
  storyCardCompact: { left: 12, right: 12, padding: 16 },
  storyCardExpansive: { padding: 22 },
  storyTopline: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  storyEyebrow: { flex: 1, marginBottom: 0 },
  storyIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: {
    fontFamily: "InstrumentSerif-Regular",
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -0.7,
    marginBottom: 8,
  },
  titleCompact: { fontSize: 31, lineHeight: 33, letterSpacing: -0.45 },
  titleExpansive: { fontSize: 38, lineHeight: 40 },
  subtitle: { fontFamily: "Raleway-Medium", fontSize: 14, lineHeight: 20 },
  dots: { flexDirection: "row", alignItems: "center", gap: 5, marginVertical: 16 },
  dotsCompact: { marginVertical: 12 },
  dot: { height: 4, borderRadius: 2 },
  primaryButton: { marginBottom: 9 },
  legal: { fontFamily: "Raleway-Medium", fontSize: 10, textAlign: "center", marginTop: 12 },
  legalLink: { fontFamily: "Raleway-Bold", fontSize: 10 },
});
