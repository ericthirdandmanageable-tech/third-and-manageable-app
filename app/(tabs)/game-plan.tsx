import { GamePlanScreenSkeleton } from "@/components/SkeletonLoader";
import {
  CATEGORY_LABELS,
  DailyAction,
  getTodayAction,
} from "@/constants/actions";
import { useAuth } from "@/context/auth";
import {
  completeAction,
  getCompletionCount,
  getRecentCompletions,
  getTodayCompletion,
} from "@/services/gameplan";
import { createGamePlanNotification } from "@/services/notification-store";
import { GamePlanCompletion } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GamePlanScreen() {
  const { user } = useAuth();
  const [action, setAction] = useState<DailyAction | null>(null);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [weekCompletions, setWeekCompletions] = useState<GamePlanCompletion[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const todayAction = getTodayAction(user.$id);
      setAction(todayAction);

      const [todayDone, count, recent] = await Promise.all([
        getTodayCompletion(user.$id, todayAction.id),
        getCompletionCount(user.$id),
        getRecentCompletions(user.$id),
      ]);

      setCompleted(!!todayDone);
      setTotalCompleted(count);
      setWeekCompletions(recent);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  // Refresh data every time the game plan tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleComplete = async () => {
    if (!user?.$id || !action || completed) return;
    setCompleting(true);
    try {
      await completeAction(user.$id, action.id);
      setCompleted(true);
      setTotalCompleted((prev) => prev + 1);
      await loadData();
      // Create notification
      await createGamePlanNotification(user.$id);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to mark action complete.");
    } finally {
      setCompleting(false);
    }
  };

  // Build week streak dots (last 7 days)
  const weekDots = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split("T")[0];
    const wasCompleted = weekCompletions.some(
      (c) => c.completed_at.split("T")[0] === dateStr,
    );
    const isToday = i === 6;
    return {
      dateStr,
      wasCompleted,
      isToday,
      dayLabel: ["S", "M", "T", "W", "T", "F", "S"][date.getDay()],
    };
  });

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream">
        <GamePlanScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={{ marginBottom: 20 }}>
          <ImageBackground
            source={require("../../assets/images/gameplan-hero.png")}
            style={{
              width: "100%",
              height: 200,
              borderRadius: 24,
              overflow: "hidden",
            }}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["transparent", "rgba(3, 3, 102, 0.85)"]}
              locations={[0.3, 1]}
              style={{
                flex: 1,
                justifyContent: "flex-end",
                padding: 20,
              }}
            >
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  fontFamily: "Raleway-SemiBold",
                  marginBottom: 4,
                }}
              >
                Today&apos;s Focus
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 24,
                  fontFamily: "Raleway-ExtraBold",
                }}
              >
                Game Plan
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 13,
                  fontFamily: "Raleway-Medium",
                  marginTop: 4,
                }}
              >
                One step at a time. Focus on today&apos;s action.
              </Text>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Today's Action Card */}
        {action && (
          <View
            className={`rounded-3xl p-5 mb-4 ${completed ? "bg-dp-700" : "bg-white"}`}
            style={{
              shadowColor: completed ? "#030366" : "#000",
              shadowOffset: { width: 0, height: completed ? 6 : 2 },
              shadowOpacity: completed ? 0.25 : 0.05,
              shadowRadius: completed ? 12 : 8,
              elevation: completed ? 8 : 3,
            }}
          >
            {/* Category badge */}
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <View
                  className="w-7 h-7 rounded-full items-center justify-center mr-2"
                  style={{
                    backgroundColor: completed
                      ? "rgba(255,255,255,0.15)"
                      : "#ECEEFB",
                  }}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={16}
                    color={completed ? "#A1A8EB" : "#040485"}
                  />
                </View>
                <Text
                  className={`text-xs font-raleway-bold uppercase tracking-wider ${completed ? "text-white/60" : "text-dp-600"
                    }`}
                >
                  {CATEGORY_LABELS[action.category]}
                </Text>
              </View>
              {completed && (
                <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center">
                  <Ionicons name="checkmark-circle" size={14} color="#A1A8EB" />
                  <Text className="text-xs font-raleway-bold text-white/80 ml-1">
                    Done
                  </Text>
                </View>
              )}
            </View>

            {/* Action content */}
            <Text
              className={`text-lg font-raleway-bold mb-2 ${completed ? "text-white" : "text-silver-900"
                }`}
            >
              {action.title}
            </Text>
            <Text
              className={`text-sm leading-6 mb-4 ${completed ? "text-white/70" : "text-silver-500"
                }`}
            >
              {action.description}
            </Text>

            {/* Complete button */}
            {!completed ? (
              <TouchableOpacity
                className="bg-dp-600 py-3.5 rounded-2xl items-center flex-row justify-center"
                style={{
                  shadowColor: "#040485",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
                onPress={handleComplete}
                disabled={completing}
                activeOpacity={0.8}
              >
                {completing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text className="text-white text-base font-raleway-bold ml-2">
                      Mark Complete
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View className="bg-white/10 py-3 rounded-2xl items-center">
                <Text className="text-white/60 text-sm font-raleway-semibold">
                  Great job! See you tomorrow.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Week Activity */}
        <View
          className="bg-white rounded-3xl p-5 mb-4"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons name="calendar-outline" size={16} color="#040485" />
            </View>
            <Text className="text-xs font-raleway-bold text-dp-600 uppercase tracking-wider">
              This Week
            </Text>
          </View>
          <View className="flex-row justify-between">
            {weekDots.map((dot, i) => (
              <View key={i} className="items-center">
                <Text className="text-[10px] text-silver-400 font-raleway-medium mb-1.5">
                  {dot.dayLabel}
                </Text>
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center ${dot.wasCompleted
                    ? "bg-dp-500"
                    : dot.isToday
                      ? "bg-dp-50"
                      : "bg-silver-100"
                    }`}
                  style={
                    dot.isToday && !dot.wasCompleted
                      ? { borderWidth: 2, borderColor: "#040485" }
                      : undefined
                  }
                >
                  {dot.wasCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text
                      className={`text-xs font-raleway-bold ${dot.isToday ? "text-dp-600" : "text-silver-300"
                        }`}
                    >
                      {new Date(dot.dateStr).getDate()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
          <View
            className="flex-1 bg-white rounded-3xl p-5 items-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {totalCompleted}
            </Text>
            <Text
              className="text-xs text-silver-500 font-raleway-medium mt-1"
              numberOfLines={1}
            >
              Actions Done
            </Text>
          </View>
          <View
            className="flex-1 bg-white rounded-3xl p-5 items-center"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {weekCompletions.length}
            </Text>
            <Text
              className="text-xs text-silver-500 font-raleway-medium mt-1"
              numberOfLines={1}
            >
              This Week
            </Text>
          </View>
        </View>

        {/* Motivation Card */}
        <View
          className="bg-dp-700 rounded-3xl p-5"
          style={{
            shadowColor: "#030366",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center mb-3">
            <View className="w-7 h-7 rounded-full bg-white/15 items-center justify-center mr-2">
              <Ionicons name="heart-outline" size={16} color="#A1A8EB" />
            </View>
            <Text className="text-xs font-raleway-bold text-white/60 uppercase tracking-wider">
              Remember
            </Text>
          </View>
          <Text className="text-white text-sm leading-6">
            You don&apos;t need to win every day. You just need to show up.
            Consistency beats intensity.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
