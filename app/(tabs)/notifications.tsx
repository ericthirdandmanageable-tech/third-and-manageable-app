import { useAuth } from "@/context/auth";
import {
  getStoredNotifications,
  markAllAsRead,
  markAsRead,
  StoredNotification,
} from "@/services/notification-store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  heart: "heart",
  clipboard: "clipboard",
  flame: "flame",
  sparkles: "sparkles",
  shield: "shield-checkmark",
  at: "at",
};

const ICON_COLOR_MAP: Record<string, string> = {
  checkin: "#0618A8",
  gameplan: "#040485",
  streak: "#F59E0B",
  milestone: "#10B981",
  welcome: "#040485",
  mention: "#E65100",
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user?.$id) return;
    try {
      const notifs = await getStoredNotifications(user.$id);
      setNotifications(notifs);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleTapNotification = async (notif: StoredNotification) => {
    if (!notif.read) {
      await markAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
    }

    // Navigate based on notification type
    switch (notif.type) {
      case "checkin":
        router.push("/(tabs)/check-in");
        break;
      case "gameplan":
        router.push("/(tabs)/game-plan");
        break;
      case "streak":
      case "milestone":
        router.push("/(tabs)/progress");
        break;
      case "mention":
        router.push("/(tabs)/community");
        break;
      default:
        break;
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.$id) return;
    await markAllAsRead(user.$id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderNotification = ({ item }: { item: StoredNotification }) => {
    const iconName = ICON_MAP[item.icon] ?? "notifications";
    const iconColor = ICON_COLOR_MAP[item.type] ?? "#040485";
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        className={`mx-5 mb-3 rounded-2xl p-4 ${isUnread ? "bg-dp-50" : "bg-app-surface"
          }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isUnread ? 0.08 : 0.04,
          shadowRadius: isUnread ? 6 : 4,
          elevation: isUnread ? 3 : 2,
        }}
        onPress={() => handleTapNotification(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row">
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${isUnread ? "bg-dp-600" : "bg-silver-100"
              }`}
          >
            <Ionicons
              name={iconName}
              size={18}
              color={isUnread ? "#fff" : iconColor}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`text-sm font-raleway-bold ${isUnread ? "text-dp-700" : "text-silver-900"
                  }`}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {isUnread && (
                <View className="w-2 h-2 rounded-full bg-dp-600 ml-2" />
              )}
            </View>
            <Text className="text-xs text-silver-500 leading-4">
              {item.body}
            </Text>
            <Text className="text-[10px] text-silver-400 mt-1.5">
              {formatTimestamp(item.timestamp)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      {/* Header */}
      <View className="px-5 pt-3 pb-4 flex-row items-center">
        <TouchableOpacity
          className="flex-row items-center mr-4"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color="#424242" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-sm text-silver-500 mb-0.5">Activity</Text>
          <Text className="text-xl font-raleway-extrabold text-silver-900">
            Notifications
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            className="bg-dp-50 rounded-full px-3 py-1.5"
            onPress={handleMarkAllRead}
            activeOpacity={0.7}
          >
            <Text className="text-xs font-raleway-bold text-dp-600">
              Mark All Read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#040485" />
        </View>
      ) : notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons
            name="notifications-off-outline"
            size={48}
            color="#BDBDBD"
          />
          <Text className="text-base font-raleway-bold text-silver-500 mt-4">
            No notifications yet
          </Text>
          <Text className="text-sm text-silver-400 text-center mt-1">
            Check in and complete your game plan to see activity here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#040485"
              colors={["#040485"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
