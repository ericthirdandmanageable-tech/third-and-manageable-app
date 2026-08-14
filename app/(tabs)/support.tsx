import { LEGAL_LINKS } from "@/constants/legal";
import { RESOURCES, Resource } from "@/constants/resources";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupportScreen() {
  const handleResourcePress = (resource: Resource) => {
    if (resource.url) {
      Linking.openURL(resource.url);
    } else if (resource.phone) {
      Linking.openURL(`tel:${resource.phone}`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-5">
          <Text className="text-sm text-silver-500 mb-0.5">You&apos;re Not Alone</Text>
          <Text className="text-2xl font-raleway-extrabold text-silver-900">
            Support
          </Text>
          <Text className="text-sm text-silver-400 mt-1">
            Resources to help you through the transition.
          </Text>
        </View>

        {/* Crisis banner */}
        <View
          className="bg-red-50 rounded-2xl p-4 mb-5 border border-red-200"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-center mb-2">
            <Ionicons name="warning-outline" size={18} color="#DC2626" />
            <Text className="text-sm font-raleway-bold text-red-700 ml-2">
              In Crisis?
            </Text>
          </View>
          <Text className="text-xs text-red-600 leading-5 mb-2">
            If you or someone you know is in immediate danger, call 911 or
            call/text 988 for the Suicide & Crisis Lifeline.
          </Text>
          <TouchableOpacity
            className="bg-red-600 py-2.5 rounded-xl items-center"
            onPress={() => Linking.openURL("tel:988")}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-raleway-bold">
              Call 988 Crisis Line
            </Text>
          </TouchableOpacity>
        </View>

        {/* Resource cards */}
        {RESOURCES.map((resource) => (
          <TouchableOpacity
            key={resource.id}
            className="bg-app-surface rounded-3xl p-5 mb-3"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => handleResourcePress(resource)}
            activeOpacity={resource.url || resource.phone ? 0.7 : 1}
          >
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-dp-50 items-center justify-center mr-3 mt-0.5">
                <Ionicons
                  name={resource.icon as any}
                  size={20}
                  color="#040485"
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-raleway-bold text-silver-900 mb-1">
                  {resource.title}
                </Text>
                <Text className="text-sm text-silver-500 leading-5">
                  {resource.description}
                </Text>
                {(resource.url || resource.phone) && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons
                      name={resource.phone && !resource.url?.startsWith("http") ? "call-outline" : "open-outline"}
                      size={12}
                      color="#0618A8"
                    />
                    <Text className="text-xs font-raleway-semibold text-dp-500 ml-1">
                      {resource.phone && !resource.url?.startsWith("http")
                        ? `Call ${resource.phone}`
                        : "Open Resource"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

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
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield-checkmark-outline" size={18} color="#040485" />
            <Text className="text-base font-raleway-bold text-silver-900 ml-2">
              Community Safety
            </Text>
          </View>
          <Text className="text-sm text-silver-500 leading-5 mb-3">
            If you see harmful content in community chat, long press the message
            and select Report Message or Block User.
          </Text>
          <TouchableOpacity
            className="flex-row items-center justify-between py-2"
            onPress={() => Linking.openURL(`mailto:${LEGAL_LINKS.supportEmail}`)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-raleway-semibold text-dp-600">
              Contact Support
            </Text>
            <Ionicons name="mail-outline" size={16} color="#040485" />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-row items-center justify-between py-2"
            onPress={() => Linking.openURL(LEGAL_LINKS.privacy)}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-raleway-semibold text-dp-600">
              Privacy Policy
            </Text>
            <Ionicons name="open-outline" size={16} color="#040485" />
          </TouchableOpacity>
        </View>

        {/* Bottom encouragement */}
        <View
          className="bg-dp-700 rounded-3xl p-5 mt-1"
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
            Asking for help isn&apos;t weakness - it&apos;s the same discipline that made
            you an athlete. The strongest people know when to lean on others.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
