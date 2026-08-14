import { GlassSurface, ScreenHeader } from "@/components/ui/liquid-glass";
import { type AppTheme } from "@/constants/app-theme";
import { useAppTheme } from "@/context/app-theme";
import { SPORTS } from "@/constants/sports";
import { useAuth } from "@/context/auth";
import {
  cancelDailyReminder,
  scheduleDailyReminder,
} from "@/lib/notifications";
import { deleteAccount, signOut, upsertProfile } from "@/services/auth";
import { uploadProfilePic } from "@/services/profile-pic";
import { AIPersonality, SportKey } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const APPEARANCE_OPTIONS: {
  value: AppTheme;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "dusk",
    label: "Sideline Dusk",
    description: "Calm, blue-forward glass.",
    icon: "partly-sunny-outline",
  },
  {
    value: "school",
    label: "Campus Colors",
    description: "Your verified school palette.",
    icon: "school-outline",
  },
  {
    value: "legacy",
    label: "Legacy Neon",
    description: "The original mobile look.",
    icon: "flash-outline",
  },
];

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return "Just joined";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Just joined";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProfileScreen() {
  const { user, profile, refreshUser, refreshProfile } = useAuth();
  const {
    theme: appTheme,
    setTheme: setAppTheme,
    colors: appThemeColors,
    hasVerifiedSchoolMatch,
    reduceMotion,
  } = useAppTheme();
  const sport = profile ? SPORTS[profile.sport as SportKey] : null;
  const userId = user?.$id;
  const userCreatedAt = user?.$createdAt;
  const hasProfile = Boolean(profile);
  const joinedAt = profile?.joined_at;
  const [remindersEnabled, setRemindersEnabled] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Profile picture state
  const [uploadingPic, setUploadingPic] = useState(false);

  const handlePickProfilePic = async () => {
    if (!user?.$id) return;
    Alert.alert("Change Profile Photo", "Choose a source", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission Required",
              "Camera access is needed to take a photo.",
            );
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            await doUpload(result.assets[0].uri);
          }
        },
      },
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Permission Required",
              "Photo library access is needed.",
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            await doUpload(result.assets[0].uri);
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const doUpload = async (uri: string) => {
    setUploadingPic(true);
    try {
      await uploadProfilePic(user!.$id, uri);
      await refreshProfile();
    } catch {
      Alert.alert(
        "Error",
        "Failed to upload profile picture. Please try again.",
      );
    } finally {
      setUploadingPic(false);
    }
  };

  // AI personality state
  const savedAiPersonality =
    (profile?.ai_personality as AIPersonality) ?? "motivator";
  const [pendingAiPersonality, setPendingAiPersonality] =
    useState<AIPersonality | null>(null);
  const aiPersonality = pendingAiPersonality ?? savedAiPersonality;
  const [personalitySaving, setPersonalitySaving] = useState(false);

  const handlePersonalityChange = async (p: AIPersonality) => {
    if (!user?.$id || p === aiPersonality) return;
    setPendingAiPersonality(p);
    setPersonalitySaving(true);
    try {
      await upsertProfile({ id: user.$id, ai_personality: p });
      await refreshProfile();
      setPendingAiPersonality(null);
    } catch {
      setPendingAiPersonality(null);
    } finally {
      setPersonalitySaving(false);
    }
  };

  const handleRequestVerification = async () => {
    if (!user?.$id) return;
    Alert.alert(
      "Request Verification",
      "Submit a request to verify your athlete status. An admin will review and approve it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit Request",
          onPress: async () => {
            try {
              await upsertProfile({
                id: user.$id,
                verification_requested: true,
              });
              await refreshProfile();
              Alert.alert(
                "Request Sent",
                "Your verification request has been submitted. You'll be notified when it's approved.",
              );
            } catch {
              Alert.alert(
                "Error",
                "Failed to submit verification request. Please try again.",
              );
            }
          },
        },
      ],
    );
  };

  useEffect(() => {
    AsyncStorage.getItem("daily_reminder_set").then((val) => {
      setRemindersEnabled(val === "true");
    });
  }, []);

  // Backfill joined_at for existing users who signed up before this field was added
  useEffect(() => {
    if (userId && hasProfile && !joinedAt) {
      upsertProfile({
        id: userId,
        joined_at: userCreatedAt ?? new Date().toISOString(),
      }).then(() => refreshProfile());
    }
  }, [hasProfile, joinedAt, refreshProfile, userCreatedAt, userId]);

  const toggleReminders = async (value: boolean) => {
    setRemindersEnabled(value);
    if (value) {
      await scheduleDailyReminder(9);
      await AsyncStorage.setItem("daily_reminder_set", "true");
    } else {
      await cancelDailyReminder();
      await AsyncStorage.setItem("daily_reminder_set", "false");
    }
  };

  const openEditModal = () => {
    setEditDisplayName(profile?.display_name ?? "");
    setEditModalVisible(true);
  };

  const editInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });

      return () => cancelAnimationFrame(frame);
    }, []),
  );

  const handleSaveProfile = useCallback(async () => {
    if (!user?.$id || !editDisplayName.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await upsertProfile({
        id: user.$id,
        display_name: editDisplayName.trim(),
      });
      await refreshProfile();
      setEditModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile.");
    } finally {
      setEditSaving(false);
    }
  }, [user, editDisplayName, editSaving, refreshProfile]);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            await refreshUser();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data including check-ins, game plan progress, and community messages will be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Your account and all associated data will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      await cancelDailyReminder();
                      await AsyncStorage.removeItem("daily_reminder_set");
                      await refreshUser();
                    } catch (err: any) {
                      Alert.alert(
                        "Error",
                        err.message || "Failed to delete account.",
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 960,
          alignSelf: "center",
          padding: 20,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Identity, privacy, and preferences"
          title="Profile & Settings"
          subtitle="The athlete you were and the person you're becoming can live in the same place."
          icon="person-outline"
        />

        {/* Avatar & Name Card */}
        <GlassSurface
          tone="strong"
          className="bg-app-surface rounded-3xl p-6 mb-4 items-center"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <TouchableOpacity
            onPress={handlePickProfilePic}
            activeOpacity={0.8}
            disabled={uploadingPic}
            className="mb-3"
          >
            <View
              className="w-20 h-20 rounded-full bg-dp-600 items-center justify-center overflow-hidden"
              style={{
                shadowColor: appThemeColors.signal,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              {uploadingPic ? (
                <ActivityIndicator size="small" color={appThemeColors.inverseText} />
              ) : profile?.profile_pic ? (
                <Image
                  source={{ uri: profile.profile_pic }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-3xl font-raleway-extrabold text-white">
                  {profile?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
                </Text>
              )}
            </View>
            <View
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-app-surface items-center justify-center"
              style={{
                shadowColor: appThemeColors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Ionicons name="camera" size={14} color={appThemeColors.signal} />
            </View>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <Text className="text-xl font-raleway-extrabold text-silver-900">
              {profile?.display_name ?? "Athlete"}
            </Text>
            {profile?.verified && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={appThemeColors.signal}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
          <View className="flex-row items-center mt-1.5">
            {sport ? (
              <Image
                source={sport.icon}
                style={{ width: 16, height: 16, marginRight: 6 }}
                resizeMode="contain"
              />
            ) : null}
            <Text className="text-sm text-silver-500">
              {sport?.label ?? "Sport"}
            </Text>
          </View>
          {/* Athlete Status & School */}
          <View className="flex-row items-center mt-3 flex-wrap justify-center">
            {profile?.athlete_status && (
              <View className="bg-dp-50 rounded-full px-3 py-1 flex-row items-center mr-2 mb-1">
                <Ionicons name="shield-checkmark" size={12} color={appThemeColors.signal} />
                <Text className="text-[11px] font-raleway-bold text-dp-600 ml-1">
                  {profile.athlete_status === "current"
                    ? "Current Athlete"
                    : "Former Athlete"}
                </Text>
              </View>
            )}
            {profile?.school &&
              profile.school !== "N/A" &&
              profile.school !== "Other" && (
                <View className="bg-silver-50 rounded-full px-3 py-1 flex-row items-center mb-1">
                  <Ionicons name="school-outline" size={12} color={appThemeColors.textSecondary} />
                  <Text className="text-[11px] font-raleway-semibold text-silver-600 ml-1">
                    {profile.school}
                  </Text>
                </View>
              )}
          </View>
          <Text className="text-xs text-silver-400 mt-2">
            Member since {formatMemberSince(profile?.joined_at)}
          </Text>

          {/* Edit Profile Button */}
          <TouchableOpacity
            className="mt-4 bg-dp-50 rounded-xl px-5 py-2.5 flex-row items-center"
            onPress={openEditModal}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={16} color={appThemeColors.signal} />
            <Text className="text-sm font-raleway-bold text-dp-600 ml-1.5">
              Edit Profile
            </Text>
          </TouchableOpacity>
        </GlassSurface>

        {/* Account Details Card */}
        <GlassSurface
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={appThemeColors.signal}
              />
            </View>
            <Text className="text-base font-raleway-bold text-silver-900">
              Account Details
            </Text>
          </View>

          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Display Name</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {profile?.display_name ?? "—"}
            </Text>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Email</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {user?.email ?? "—"}
            </Text>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Sport</Text>
            <View className="flex-row items-center">
              {sport ? (
                <Image
                  source={sport.icon}
                  style={{ width: 14, height: 14, marginRight: 4 }}
                  resizeMode="contain"
                />
              ) : null}
              <Text className="text-sm font-raleway-semibold text-silver-900">
                {sport?.label ?? "—"}
              </Text>
            </View>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Athlete Status</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {profile?.athlete_status === "current"
                ? "Current"
                : profile?.athlete_status === "former"
                  ? "Former"
                  : "—"}
            </Text>
          </View>
          {profile?.school &&
            profile.school !== "N/A" &&
            profile.school !== "Other" && (
              <View className="flex-row justify-between py-3 border-b border-silver-100">
                <Text className="text-sm text-silver-500">School</Text>
                <Text
                  className="text-sm font-raleway-semibold text-silver-900 flex-1 text-right ml-4"
                  numberOfLines={1}
                >
                  {profile.school}
                </Text>
              </View>
            )}
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Progress Language</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {sport?.periodNamePlural ?? "—"}
            </Text>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Peer Support</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {profile?.group_interest ? "Enrolled" : "Not enrolled"}
            </Text>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Streak</Text>
            <Text className="text-sm font-raleway-semibold text-dp-600">
              {profile?.streak ?? 0} days
            </Text>
          </View>
          <View className="flex-row justify-between py-3 border-b border-silver-100">
            <Text className="text-sm text-silver-500">Member Since</Text>
            <Text className="text-sm font-raleway-semibold text-silver-900">
              {formatMemberSince(profile?.joined_at)}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-sm text-silver-500">Verification</Text>
            {profile?.verified ? (
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={16} color={appThemeColors.semantic.success} />
                <Text className="text-sm font-raleway-semibold ml-1" style={{ color: appThemeColors.semantic.success }}>
                  Verified
                </Text>
              </View>
            ) : profile?.verification_requested ? (
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={16} color={appThemeColors.semantic.warning} />
                <Text className="text-sm font-raleway-semibold ml-1" style={{ color: appThemeColors.semantic.warning }}>
                  Pending Review
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                className="bg-dp-50 rounded-xl px-3 py-1.5 flex-row items-center"
                onPress={handleRequestVerification}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={14}
                  color={appThemeColors.signal}
                />
                <Text className="text-xs font-raleway-bold text-dp-600 ml-1">
                  Request Verification
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </GlassSurface>

        {/* Appearance */}
        <GlassSurface
          tone="signal"
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-1">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons
                name="color-palette-outline"
                size={16}
                color={appThemeColors.signal}
              />
            </View>
            <Text className="text-base font-raleway-bold text-silver-900">
              Appearance
            </Text>
          </View>
          <Text className="text-xs text-silver-400 mb-4">
            {hasVerifiedSchoolMatch
              ? "Campus Colors uses your verified school palette across the app."
              : "Verify a supported school to unlock its palette as your smart default."}
          </Text>

          <View accessibilityRole="radiogroup" className="gap-2">
            {APPEARANCE_OPTIONS.map((option) => {
              const selected = appTheme === option.value;
              const disabled = option.value === "school" && !hasVerifiedSchoolMatch;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled }}
                  accessibilityLabel={option.label}
                  accessibilityHint={
                    disabled
                      ? "Requires a verified supported institution."
                      : option.description
                  }
                  activeOpacity={0.75}
                  disabled={disabled}
                  className={`rounded-2xl border-2 p-4 flex-row items-center ${
                    selected
                      ? "border-dp-600 bg-dp-50"
                      : "border-silver-100 bg-silver-50"
                  }`}
                  style={{ opacity: disabled ? 0.52 : 1 }}
                  onPress={() => setAppTheme(option.value)}
                >
                  <View className="w-9 h-9 rounded-full items-center justify-center bg-app-surface mr-3">
                    <Ionicons
                      name={option.icon}
                      size={19}
                      color={selected ? appThemeColors.signal : appThemeColors.textSecondary}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-raleway-bold text-silver-900">
                      {option.label}
                    </Text>
                    <Text className="text-[11px] text-silver-500 mt-0.5">
                      {disabled ? "Requires a verified supported institution." : option.description}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={selected ? appThemeColors.signal : appThemeColors.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassSurface>

        {/* Notifications Card */}
        <GlassSurface
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons
                name="notifications-outline"
                size={16}
                color={appThemeColors.signal}
              />
            </View>
            <Text className="text-base font-raleway-bold text-silver-900">
              Notifications
            </Text>
          </View>

          <View className="flex-row items-center justify-between py-3">
            <View className="flex-1 mr-3">
              <Text className="text-sm text-silver-900 font-raleway-semibold">
                Daily Reminder
              </Text>
              <Text className="text-xs text-silver-400 mt-0.5">
                Get a reminder at 9:00 AM to check in
              </Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={toggleReminders}
              trackColor={{ false: appThemeColors.borderStrong, true: appThemeColors.signalSoft }}
              thumbColor={remindersEnabled ? appThemeColors.signal : appThemeColors.disabled}
            />
          </View>
        </GlassSurface>

        {/* The Clipboard Personality */}
        <GlassSurface
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-1">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons name="sparkles" size={16} color={appThemeColors.signal} />
            </View>
            <Text className="text-base font-raleway-bold text-silver-900">
              The Clipboard
            </Text>
            {personalitySaving && (
              <View className="ml-2">
                <Text className="text-[10px] text-silver-400">Saving...</Text>
              </View>
            )}
          </View>
          <Text className="text-xs text-silver-400 mb-4">
            Choose a personality for your AI companion
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {[
              {
                key: "motivator" as AIPersonality,
                label: "Motivator",
                icon: "flame-outline" as const,
                desc: "Upbeat & energetic",
              },
              {
                key: "chill" as AIPersonality,
                label: "Chill",
                icon: "leaf-outline" as const,
                desc: "Calm & relaxed",
              },
              {
                key: "analyst" as AIPersonality,
                label: "Analyst",
                icon: "analytics-outline" as const,
                desc: "Thoughtful & structured",
              },
              {
                key: "mentor" as AIPersonality,
                label: "Mentor",
                icon: "school-outline" as const,
                desc: "Wise & experienced",
              },
              {
                key: "huddle" as AIPersonality,
                label: "Huddle",
                icon: "american-football-outline" as const,
                desc: "Football hype energy",
              },
            ].map((item) => {
              const isActive = aiPersonality === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  className={`flex-1 min-w-[45%] rounded-2xl p-3 border-2 ${isActive
                      ? "bg-dp-50 border-dp-600"
                      : "bg-silver-50 border-silver-100"
                    }`}
                  onPress={() => handlePersonalityChange(item.key)}
                  activeOpacity={0.7}
                  disabled={personalitySaving}
                >
                  <View className="flex-row items-center mb-1">
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isActive ? appThemeColors.signal : appThemeColors.textSecondary}
                    />
                    <Text
                      className={`text-sm font-raleway-bold ml-1.5 ${isActive ? "text-dp-600" : "text-silver-600"
                        }`}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <Text
                    className={`text-[10px] ${isActive ? "text-dp-500" : "text-silver-400"
                      }`}
                  >
                    {item.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </GlassSurface>

        {/* Quick Links */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity
            className="flex-1 bg-app-surface rounded-3xl p-4 items-center"
            style={{
              shadowColor: appThemeColors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => router.push("/(tabs)/support")}
            activeOpacity={0.7}
          >
            <Ionicons name="heart-outline" size={22} color={appThemeColors.signal} />
            <Text className="text-xs font-raleway-bold text-silver-900 mt-1.5">
              Support
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-app-surface rounded-3xl p-4 items-center"
            style={{
              shadowColor: appThemeColors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => router.push("/(tabs)/perks")}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy-outline" size={22} color={appThemeColors.signal} />
            <Text className="text-xs font-raleway-bold text-silver-900 mt-1.5">
              Perks
            </Text>
          </TouchableOpacity>
        </View>

        {/* Legal Card */}
        <GlassSurface
          className="bg-app-surface rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center mb-4">
            <View className="w-7 h-7 rounded-full bg-dp-50 items-center justify-center mr-2">
              <Ionicons name="document-text-outline" size={16} color={appThemeColors.signal} />
            </View>
            <Text className="text-base font-raleway-bold text-silver-900">
              Legal
            </Text>
          </View>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3 border-b border-silver-100"
            onPress={() => router.push("/(legal)/privacy")}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-silver-700 font-raleway-semibold">
              Privacy Policy
            </Text>
            <Ionicons name="chevron-forward" size={16} color={appThemeColors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => router.push("/(legal)/terms")}
            activeOpacity={0.7}
          >
            <Text className="text-sm text-silver-700 font-raleway-semibold">
              Terms & Conditions
            </Text>
            <Ionicons name="chevron-forward" size={16} color={appThemeColors.textSecondary} />
          </TouchableOpacity>
        </GlassSurface>

        {/* App Info Card */}
        <View
          className="bg-dp-50 rounded-3xl p-5 mb-4"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center mb-2">
            <Image
              source={require("../../assets/images/logo.png")}
              style={{ width: 18, height: 18, marginRight: 6 }}
              resizeMode="contain"
            />
            <Text className="text-xs font-raleway-bold text-dp-600">
              Third &amp; Manageable
            </Text>
          </View>
          <Text className="text-xs text-dp-500/70 leading-4">
            A structured athlete-first platform for emotional safety, peer
            connection, and daily transition support.
          </Text>
          <Text className="text-[10px] text-dp-400/50 mt-2">
            Version 1.0.0 · MVP
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          className="bg-app-surface rounded-3xl py-4 items-center mb-3"
          style={{
            shadowColor: appThemeColors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={18} color={appThemeColors.semantic.danger} />
            <Text className="text-base font-raleway-bold ml-2" style={{ color: appThemeColors.semantic.danger }}>
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          className="rounded-3xl py-3 items-center"
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text className="text-silver-400 text-xs font-raleway-semibold">
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType={reduceMotion ? "none" : "slide"}
        transparent
        onRequestClose={() => setEditModalVisible(false)}
        onShow={() => setTimeout(() => editInputRef.current?.focus(), 350)}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: appThemeColors.overlay }}>
          <View className="bg-app-surface rounded-t-3xl px-6 pt-6 pb-10">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-lg font-raleway-extrabold text-silver-900">
                Edit Profile
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={appThemeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-raleway-bold text-silver-700 mb-2">
              Display Name
            </Text>
            <TextInput
              ref={editInputRef}
              className="bg-silver-50 rounded-2xl px-4 py-3.5 text-base text-silver-900 mb-4"
              style={{ fontFamily: "Raleway-Regular" }}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="Your display name"
              placeholderTextColor={appThemeColors.textTertiary}
              maxLength={30}
            />

            <View className="bg-silver-50 rounded-2xl p-4 mb-6">
              <Text className="text-xs text-silver-400 leading-4">
                Sport and athlete status cannot be changed after onboarding.
                Contact support if you need to update these.
              </Text>
            </View>

            <TouchableOpacity
              className={`bg-dp-600 py-4 rounded-2xl items-center ${!editDisplayName.trim() || editSaving ? "opacity-50" : ""
                }`}
              style={{
                shadowColor: appThemeColors.signal,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
              onPress={handleSaveProfile}
              disabled={!editDisplayName.trim() || editSaving}
              activeOpacity={0.8}
            >
              <Text className="text-white text-base font-raleway-bold">
                {editSaving ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
