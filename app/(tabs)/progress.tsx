import { ProgressScreenSkeleton } from "@/components/SkeletonLoader";
import { SPORTS } from "@/constants/sports";
import { useAuth } from "@/context/auth";
import {
    computeProgress,
    getMilestoneMessage,
    getProgressMessage,
    ProgressInfo,
} from "@/lib/progress";
import { upsertProfile } from "@/services/auth";
import { SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [milestoneMsg, setMilestoneMsg] = useState("");

  const progress: ProgressInfo | null = useMemo(() => {
    if (!profile?.joined_at || !sport) return null;
    return computeProgress(profile.joined_at, sport);
  }, [profile?.joined_at, sport]);

  // Auto-advance period in Appwrite when computed period changes
  useEffect(() => {
    if (!progress || !profile || !user?.$id || !sport) return;
    if (progress.currentPeriod !== profile.current_quarter) {
      upsertProfile({ id: user.$id, current_quarter: progress.currentPeriod })
        .then(() => refreshProfile())
        .catch(() => {});
    }
  }, [profile, progress, refreshProfile, sport, user?.$id]);

  // Show milestone celebration if user just advanced
  useEffect(() => {
    if (!progress || !sport) return;
    if (progress.justAdvanced) {
      setMilestoneMsg(
        getMilestoneMessage(
          progress.currentPeriod,
          progress.totalPeriods,
          sport.periodName,
        ),
      );
      setMilestoneVisible(true);
    }
  }, [progress, sport]);

  const currentPeriod =
    progress?.currentPeriod ?? profile?.current_quarter ?? 1;
  const totalPeriods = progress?.totalPeriods ?? sport?.totalPeriods ?? 4;

  if (!profile || !sport) {
    return (
      <SafeAreaView className="flex-1 bg-transparent">
        <ProgressScreenSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-sm text-silver-500 mb-0.5">Your Journey</Text>
          <Text className="text-2xl font-raleway-extrabold text-silver-900">
            Progress
          </Text>
          <Text className="text-sm text-silver-400 mt-1">
            No scoreboard. No comparison. Just your journey.
          </Text>
        </View>

        {/* Segmented Progress */}
        {sport && progress && (
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
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-base font-raleway-bold text-silver-900">
                {sport.periodName} Progress
              </Text>
              <View className="bg-dp-50 px-3 py-1 rounded-full">
                <Text className="text-xs font-raleway-bold text-dp-600">
                  {currentPeriod} of {totalPeriods}
                </Text>
              </View>
            </View>

            {/* Segmented bar */}
            <View className="flex-row gap-1.5 mb-2">
              {Array.from({ length: totalPeriods }).map((_, i) => {
                const isCurrent =
                  i === currentPeriod - 1 && !progress.journeyComplete;
                const isComplete =
                  i < currentPeriod - 1 || progress.journeyComplete;
                return (
                  <View
                    key={i}
                    className={`flex-1 h-3 rounded-full overflow-hidden ${
                      isComplete
                        ? "bg-dp-500"
                        : isCurrent
                          ? "bg-silver-200"
                          : "bg-silver-200"
                    }`}
                  >
                    {isCurrent && (
                      <View
                        className="h-full bg-dp-400 rounded-full"
                        style={{ width: `${progress.periodProgress}%` }}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Period progress detail */}
            <Text className="text-xs text-silver-400 mb-3">
              Day {progress.daysElapsed} of 90 ·{" "}
              {progress.daysLeftInPeriod > 0
                ? `${progress.daysLeftInPeriod} days left in this ${sport.periodName.toLowerCase()}`
                : "Complete!"}
            </Text>

            {/* Overall progress bar */}
            <View className="h-2 bg-silver-100 rounded-full overflow-hidden mb-3">
              <View
                className="h-full bg-dp-500 rounded-full"
                style={{ width: `${progress.overallProgress}%` }}
              />
            </View>

            {/* Encouragement */}
            <View className="bg-dp-50 rounded-2xl p-3">
              <Text className="text-sm text-dp-700 italic leading-5">
                {getProgressMessage(progress, sport.periodName)}
              </Text>
            </View>
          </View>
        )}

        {/* Stats */}
        <View className="flex-row gap-3 mb-4">
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
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {profile?.streak ?? 0}
            </Text>
            <Text className="text-xs text-silver-500 font-raleway-medium mt-1">
              Day Streak
            </Text>
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
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {progress?.daysElapsed ?? 0}
            </Text>
            <Text className="text-xs text-silver-500 font-raleway-medium mt-1">
              Days Active
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 mb-4">
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
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {currentPeriod}
            </Text>
            <Text className="text-xs text-silver-500 font-raleway-medium mt-1">
              Current {sport?.periodName ?? "Phase"}
            </Text>
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
            <Text className="text-3xl font-raleway-extrabold text-dp-600">
              {progress?.daysRemaining ?? 90}
            </Text>
            <Text className="text-xs text-silver-500 font-raleway-medium mt-1">
              Days Left
            </Text>
          </View>
        </View>

        {/* Journey timeline */}
        {sport && progress && (
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
            <View className="flex-row items-center mb-4">
              <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
                <Ionicons name="map-outline" size={16} color="#040485" />
              </View>
              <Text className="text-xs font-raleway-bold text-dp-600 uppercase tracking-wider">
                Journey Map
              </Text>
            </View>
            {Array.from({ length: totalPeriods }).map((_, i) => {
              const periodNum = i + 1;
              const isComplete =
                periodNum < currentPeriod || progress.journeyComplete;
              const isCurrent =
                periodNum === currentPeriod && !progress.journeyComplete;
              const startDay = Math.round((i * 90) / totalPeriods);
              const endDay = Math.round(((i + 1) * 90) / totalPeriods);
              return (
                <View key={i} className="flex-row items-center mb-3">
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                      isComplete
                        ? "bg-dp-500"
                        : isCurrent
                          ? "bg-dp-100"
                          : "bg-silver-100"
                    }`}
                  >
                    {isComplete ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : (
                      <Text
                        className={`text-xs font-raleway-bold ${
                          isCurrent ? "text-dp-600" : "text-silver-400"
                        }`}
                      >
                        {periodNum}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-raleway-semibold ${
                        isCurrent
                          ? "text-silver-900"
                          : isComplete
                            ? "text-dp-600"
                            : "text-silver-400"
                      }`}
                    >
                      {sport.periodName} {periodNum}
                    </Text>
                    <Text className="text-xs text-silver-400">
                      Day {startDay + 1} – {endDay}
                      {isCurrent && ` · ${progress.daysLeftInPeriod} days left`}
                    </Text>
                  </View>
                  {isCurrent && (
                    <View className="bg-dp-50 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-raleway-bold text-dp-600">
                        NOW
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Milestone banner */}
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
              <Ionicons name="trophy-outline" size={16} color="#A1A8EB" />
            </View>
            <Text className="text-xs font-raleway-bold text-white/60 uppercase tracking-wider">
              Milestones
            </Text>
          </View>
          <Text className="text-white text-sm leading-6">
            {progress?.journeyComplete
              ? "Congratulations! You've completed your 90-day journey. Take a moment to celebrate."
              : `At each ${sport?.periodName?.toLowerCase() ?? "phase"} boundary, you'll get a celebration and reflection prompt. Keep going!`}
          </Text>
        </View>
      </ScrollView>

      {/* Milestone Celebration Modal */}
      <Modal
        visible={milestoneVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMilestoneVisible(false)}
      >
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <View
            className="bg-app-surface rounded-3xl p-6 w-full"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-dp-50 items-center justify-center mb-3">
                <Ionicons name="trophy" size={32} color="#040485" />
              </View>
              <Text className="text-xl font-raleway-extrabold text-silver-900 text-center">
                Milestone Reached!
              </Text>
            </View>
            <Text className="text-sm text-silver-600 text-center leading-6 mb-6">
              {milestoneMsg}
            </Text>
            <TouchableOpacity
              className="bg-dp-600 py-3.5 rounded-2xl items-center"
              style={{
                shadowColor: "#040485",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={() => setMilestoneVisible(false)}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-raleway-bold">
                Keep Going
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
