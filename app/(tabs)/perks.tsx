import { GlassSurface, ScreenHeader } from "@/components/ui/liquid-glass";
import { useAppTheme } from "@/context/app-theme";
import { useAuth } from "@/context/auth";
import { PERKS, Perk, TIER_COLORS, TIER_LABELS } from "@/constants/perks";
import { getCompletionCount } from "@/services/gameplan";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface PerkStatus {
  perk: Perk;
  unlocked: boolean;
  progress: number; // 0-100
  currentValue: number;
}

export default function PerksScreen() {
  const { user, profile } = useAuth();
  const { colors } = useAppTheme();
  const [perkStatuses, setPerkStatuses] = useState<PerkStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlockedCount, setUnlockedCount] = useState(0);

  const loadPerks = useCallback(async () => {
    if (!user?.$id || !profile) return;
    setLoading(true);
    try {
      const completionCount = await getCompletionCount(user.$id);
      const streak = profile.streak ?? 0;

      // We approximate checkins count from streak for now
      // In a full implementation, we'd query the checkins collection
      const checkinCount = streak;

      const statuses: PerkStatus[] = PERKS.map((perk) => {
        let currentValue = 0;
        switch (perk.requirement.type) {
          case "streak":
            currentValue = streak;
            break;
          case "completions":
            currentValue = completionCount;
            break;
          case "checkins":
            currentValue = checkinCount;
            break;
          case "days_active":
            if (profile.joined_at) {
              const diff =
                new Date().getTime() - new Date(profile.joined_at).getTime();
              currentValue = Math.floor(diff / (1000 * 60 * 60 * 24));
            }
            break;
        }

        const progress = Math.min(
          100,
          (currentValue / perk.requirement.count) * 100,
        );
        const unlocked = currentValue >= perk.requirement.count;

        return { perk, unlocked, progress, currentValue };
      });

      setPerkStatuses(statuses);
      setUnlockedCount(statuses.filter((s) => s.unlocked).length);
    } catch {
      // Silently handle
    } finally {
      setLoading(false);
    }
  }, [user?.$id, profile]);

  useEffect(() => {
    loadPerks();
  }, [loadPerks]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-transparent items-center justify-center">
        <ActivityIndicator size="large" color={colors.signal} />
      </SafeAreaView>
    );
  }

  const tiers: Perk["tier"][] = ["bronze", "silver", "gold", "platinum"];

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Rewards that mark the reps"
          title="Perks"
          subtitle="Earned through consistency—not comparison."
          icon="trophy-outline"
        />

        {/* Summary card */}
        <View
          className="bg-dp-700 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: "#030366",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white/60 text-xs font-raleway-bold uppercase tracking-wider mb-1">
                Perks Unlocked
              </Text>
              <Text className="text-white text-3xl font-raleway-extrabold">
                {unlockedCount}
                <Text className="text-white/40 text-lg">
                  {" "}
                  / {PERKS.length}
                </Text>
              </Text>
            </View>
            <View className="w-14 h-14 rounded-full bg-white/15 items-center justify-center">
              <Ionicons name="trophy" size={28} color="#A1A8EB" />
            </View>
          </View>
          {/* Overall progress bar */}
          <View className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
            <View
              className="h-full bg-dp-400 rounded-full"
              style={{
                width: `${(unlockedCount / PERKS.length) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Perks by tier */}
        {tiers.map((tier) => {
          const tierPerks = perkStatuses.filter((s) => s.perk.tier === tier);
          if (tierPerks.length === 0) return null;
          const tierColor = TIER_COLORS[tier];

          return (
            <View key={tier} className="mb-4">
              {/* Tier header */}
              <View className="flex-row items-center mb-3">
                <View
                  className="px-3 py-1 rounded-full mr-2"
                  style={{ backgroundColor: tierColor.bg, borderWidth: 1, borderColor: tierColor.border }}
                >
                  <Text
                    className="text-xs font-raleway-bold uppercase tracking-wider"
                    style={{ color: tierColor.text }}
                  >
                    {TIER_LABELS[tier]}
                  </Text>
                </View>
                <Text className="text-xs text-silver-400 font-raleway-medium">
                  {tierPerks.filter((s) => s.unlocked).length}/{tierPerks.length} earned
                </Text>
              </View>

              {/* Perk cards */}
              {tierPerks.map(({ perk, unlocked, progress, currentValue }) => (
                <GlassSurface
                  key={perk.id}
                  className={`bg-app-surface rounded-2xl p-4 mb-2 ${
                    unlocked ? "" : "opacity-80"
                  }`}
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center mr-3"
                      style={{
                        backgroundColor: unlocked ? tierColor.bg : "#F5F5F5",
                        borderWidth: 1.5,
                        borderColor: unlocked ? tierColor.border : "#E0E0E0",
                      }}
                    >
                      {unlocked ? (
                        <Ionicons
                          name={perk.icon as any}
                          size={20}
                          color={tierColor.text}
                        />
                      ) : (
                        <Ionicons name="lock-closed" size={16} color="#BDBDBD" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className={`text-sm font-raleway-bold ${
                          unlocked ? "text-silver-900" : "text-silver-400"
                        }`}
                      >
                        {perk.title}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          unlocked ? "text-silver-500" : "text-silver-300"
                        }`}
                      >
                        {unlocked ? perk.description : perk.requirement.label}
                      </Text>
                    </View>
                    {unlocked && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={tierColor.text}
                      />
                    )}
                  </View>
                  {/* Progress bar (only for locked perks) */}
                  {!unlocked && (
                    <View className="mt-2.5">
                      <View className="h-1.5 bg-silver-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: tierColor.border,
                          }}
                        />
                      </View>
                      <Text className="text-[10px] text-silver-400 mt-1">
                        {currentValue} / {perk.requirement.count}
                      </Text>
                    </View>
                  )}
                </GlassSurface>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
