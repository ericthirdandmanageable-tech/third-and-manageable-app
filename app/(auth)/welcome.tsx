import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    Image,
    ImageSourcePropType,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface CarouselSlide {
  id: string;
  title: string;
  subtitle: string;
  image: ImageSourcePropType;
}

const SLIDES: CarouselSlide[] = [
  {
    id: "1",
    title: "Your Next Chapter",
    subtitle:
      "Third & Manageable helps you rebuild confidence, structure, and momentum after sport — one day at a time.",
    image: require("@/assets/images/carousel-slide-1.jpg"),
  },
  {
    id: "2",
    title: "Daily Check-Ins",
    subtitle:
      "A 30-second emotional check-in with The Clipboard. Share how you're feeling and get personalized support.",
    image: require("@/assets/images/carousel-slide-2.jpg"),
  },
  {
    id: "3",
    title: "Athlete Community",
    subtitle:
      "Connect with current and former athletes who understand your journey. Verified, moderated, and safe.",
    image: require("@/assets/images/carousel-slide-3.jpg"),
  },
  {
    id: "4",
    title: "Structured Support",
    subtitle:
      "A daily game plan, progress tracking, wellness resources, and a community that has your back.",
    image: require("@/assets/images/carousel-slide-4.jpg"),
  },
];

export default function WelcomeScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const insets = useSafeAreaInsets();

  // Animated values for dot transitions
  const dotAnimations = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0)),
  ).current;

  // Animate dots when activeIndex changes
  useEffect(() => {
    dotAnimations.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === activeIndex ? 1 : 0,
        useNativeDriver: false,
        friction: 6,
        tension: 80,
      }).start();
    });
  }, [activeIndex, dotAnimations]);

  // Auto-advance carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderSlide = ({ item }: { item: CarouselSlide }) => (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      {/* Full-screen background image */}
      <Image
        source={item.image}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
        }}
        resizeMode="cover"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Full-screen carousel (background images) */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        onScrollBeginDrag={() => {
          if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
          }
        }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Dark gradient overlay from bottom for readability */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.4, 1]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: SCREEN_HEIGHT * 0.65,
        }}
        pointerEvents="none"
      />

      {/* Top: Logo — white on dark background */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={{
              width: 44,
              height: 44,
              marginRight: 10,
              tintColor: "#FFFFFF",
            }}
            resizeMode="contain"
          />
          <Text
            style={{
              fontFamily: "Raleway-ExtraBold",
              fontSize: 18,
              color: "#FFFFFF",
              textShadowColor: "rgba(0,0,0,0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}
          >
            Third & Manageable
          </Text>
        </View>
      </View>

      {/* Bottom content overlay: text, dots, buttons */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
        }}
      >
        {/* Slide text */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontFamily: "Raleway-Bold",
              fontSize: 28,
              color: "#FFFFFF",
              textAlign: "left",
              marginBottom: 8,
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
            }}
          >
            {SLIDES[activeIndex].title}
          </Text>
          <Text
            style={{
              fontFamily: "Raleway-Regular",
              fontSize: 15,
              color: "rgba(255,255,255,0.85)",
              textAlign: "left",
              lineHeight: 22,
              textShadowColor: "rgba(0,0,0,0.4)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {SLIDES[activeIndex].subtitle}
          </Text>
        </View>

        {/* Pagination dots */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 24,
            gap: 6,
          }}
        >
          {SLIDES.map((_, idx) => {
            const dotWidth = dotAnimations[idx].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 28],
            });
            const dotColor = dotAnimations[idx].interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(255,255,255,0.4)", "#FFFFFF"],
            });
            return (
              <Animated.View
                key={idx}
                style={{
                  height: 4,
                  width: dotWidth,
                  borderRadius: 2,
                  backgroundColor: dotColor,
                }}
              />
            );
          })}
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            marginBottom: 10,
          }}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontFamily: "Raleway-Bold",
              color: "#040485",
              fontSize: 16,
              letterSpacing: 0.5,
            }}
          >
            Sign In
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "transparent",
            paddingVertical: 16,
            borderRadius: 14,
            alignItems: "center",
            borderWidth: 1.5,
            borderColor: "rgba(255,255,255,0.5)",
          }}
          onPress={() => router.push("/(auth)/register")}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontFamily: "Raleway-Bold",
              color: "#FFFFFF",
              fontSize: 16,
              letterSpacing: 0.5,
            }}
          >
            Create Account
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            marginTop: 14,
            textAlign: "center",
            color: "rgba(255,255,255,0.72)",
            fontSize: 12,
            lineHeight: 18,
            fontFamily: "Raleway-Medium",
          }}
        >
          By continuing, you agree to our{" "}
          <Text
            style={{ color: "#FFFFFF", fontFamily: "Raleway-Bold" }}
            onPress={() => router.push("/(legal)/terms")}
          >
            Terms
          </Text>{" "}
          and{" "}
          <Text
            style={{ color: "#FFFFFF", fontFamily: "Raleway-Bold" }}
            onPress={() => router.push("/(legal)/privacy")}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </View>
    </View>
  );
}
