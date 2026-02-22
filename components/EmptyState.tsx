import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="w-20 h-20 rounded-full bg-dp-50 items-center justify-center mb-5">
        <Ionicons name={icon as any} size={36} color="#040485" />
      </View>
      <Text className="text-lg font-raleway-bold text-silver-900 text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-silver-400 text-center leading-5 mb-6">
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          className="bg-dp-600 px-8 py-3 rounded-2xl"
          style={{
            shadowColor: "#040485",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-raleway-bold">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
