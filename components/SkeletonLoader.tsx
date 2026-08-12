import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function SkeletonBox({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#E8E0F0",
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Skeleton for a card-shaped loading placeholder */
export function SkeletonCard() {
  return (
    <View
      className="bg-app-surface rounded-3xl p-5 mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <SkeletonBox width="60%" height={14} style={{ marginBottom: 12 }} />
      <SkeletonBox width="100%" height={10} style={{ marginBottom: 8 }} />
      <SkeletonBox width="80%" height={10} />
    </View>
  );
}

/** Skeleton for the Home screen layout */
export function HomeScreenSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      {/* Header */}
      <SkeletonBox width={120} height={12} style={{ marginBottom: 4 }} />
      <SkeletonBox width={200} height={24} style={{ marginBottom: 20 }} />

      {/* Progress card */}
      <View
        className="bg-app-surface rounded-3xl p-5 mb-4"
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <SkeletonBox width="40%" height={12} style={{ marginBottom: 12 }} />
        <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonBox width="50%" height={10} />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <View
          className="flex-1 bg-app-surface rounded-3xl p-5 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <SkeletonBox width={40} height={28} style={{ marginBottom: 8 }} />
          <SkeletonBox width={60} height={10} />
        </View>
        <View
          className="flex-1 bg-app-surface rounded-3xl p-5 items-center"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <SkeletonBox width={40} height={28} style={{ marginBottom: 8 }} />
          <SkeletonBox width={60} height={10} />
        </View>
      </View>

      {/* Quick links */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <View className="flex-1 bg-app-surface rounded-3xl p-4 items-center" style={{ elevation: 3 }}>
          <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width={50} height={10} />
        </View>
        <View className="flex-1 bg-app-surface rounded-3xl p-4 items-center" style={{ elevation: 3 }}>
          <SkeletonBox width={40} height={40} borderRadius={20} style={{ marginBottom: 8 }} />
          <SkeletonBox width={50} height={10} />
        </View>
      </View>

      {/* Tip card */}
      <SkeletonCard />
    </View>
  );
}

/** Skeleton for the Progress screen */
export function ProgressScreenSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <SkeletonBox width={100} height={12} style={{ marginBottom: 4 }} />
      <SkeletonBox width={180} height={24} style={{ marginBottom: 20 }} />

      {/* Big progress card */}
      <View
        className="rounded-3xl p-5 mb-4"
        style={{ backgroundColor: "#E8E0F0", height: 180 }}
      >
        <SkeletonBox width="50%" height={14} style={{ marginBottom: 16 }} />
        <SkeletonBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 12 }} />
        <SkeletonBox width="30%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={10} />
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="flex-1 bg-app-surface rounded-2xl p-3 items-center"
            style={{ elevation: 2 }}
          >
            <SkeletonBox width={30} height={24} style={{ marginBottom: 6 }} />
            <SkeletonBox width={40} height={8} />
          </View>
        ))}
      </View>

      {/* Journey map */}
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

/** Skeleton for the Game Plan screen */
export function GamePlanScreenSkeleton() {
  return (
    <View style={{ padding: 20 }}>
      <SkeletonBox width={100} height={12} style={{ marginBottom: 4 }} />
      <SkeletonBox width={180} height={24} style={{ marginBottom: 20 }} />

      {/* Action card */}
      <View
        className="bg-app-surface rounded-3xl p-6 mb-4"
        style={{ elevation: 3 }}
      >
        <SkeletonBox width={80} height={20} borderRadius={10} style={{ marginBottom: 16 }} />
        <SkeletonBox width="90%" height={16} style={{ marginBottom: 10 }} />
        <SkeletonBox width="70%" height={12} style={{ marginBottom: 20 }} />
        <SkeletonBox width="100%" height={48} borderRadius={16} />
      </View>

      {/* Week calendar */}
      <View
        className="bg-app-surface rounded-3xl p-5 mb-4"
        style={{ elevation: 3 }}
      >
        <SkeletonBox width={140} height={12} style={{ marginBottom: 16 }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <View key={i} style={{ alignItems: "center" }}>
              <SkeletonBox width={10} height={8} style={{ marginBottom: 8 }} />
              <SkeletonBox width={28} height={28} borderRadius={14} />
            </View>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View className="flex-1 bg-app-surface rounded-3xl p-4" style={{ elevation: 3 }}>
          <SkeletonBox width={40} height={28} style={{ marginBottom: 6 }} />
          <SkeletonBox width={60} height={10} />
        </View>
        <View className="flex-1 bg-app-surface rounded-3xl p-4" style={{ elevation: 3 }}>
          <SkeletonBox width={40} height={28} style={{ marginBottom: 6 }} />
          <SkeletonBox width={60} height={10} />
        </View>
      </View>
    </View>
  );
}

export default SkeletonBox;
