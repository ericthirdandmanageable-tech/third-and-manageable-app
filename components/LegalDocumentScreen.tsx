import { GlassSurface } from "@/components/ui/liquid-glass";
import { LegalDocument, LEGAL_LINKS } from "@/constants/legal";
import { Ionicons } from "@expo/vector-icons";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  document: LegalDocument;
  hostedUrl: string;
  hostedLabel: string;
}

export default function LegalDocumentScreen({
  document,
  hostedUrl,
  hostedLabel,
}: Props) {
  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-5">
          <Text className="text-sm text-silver-500 mb-1">{document.title}</Text>
          <Text className="text-2xl font-raleway-extrabold text-silver-900">
            {document.title}
          </Text>
          <Text className="text-xs text-silver-400 mt-2">
            Last updated: {document.lastUpdated}
          </Text>
        </View>

        {document.sections.map((section) => (
          <GlassSurface
            key={section.heading}
            className="bg-app-surface rounded-3xl p-5 mb-3"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Text className="text-base font-raleway-bold text-silver-900 mb-2">
              {section.heading}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text
                key={`${section.heading}_${index}`}
                className="text-sm text-silver-600 leading-6 mb-2"
              >
                {paragraph}
              </Text>
            ))}
          </GlassSurface>
        ))}

        <TouchableOpacity
          className="bg-dp-50 rounded-2xl p-4 flex-row items-center justify-between mb-3"
          onPress={() => Linking.openURL(hostedUrl)}
          activeOpacity={0.8}
        >
          <View className="flex-1 pr-3">
            <Text className="text-xs font-raleway-bold text-dp-600 uppercase tracking-wider mb-1">
              Hosted Document
            </Text>
            <Text className="text-sm text-dp-500">{hostedLabel}</Text>
          </View>
          <Ionicons name="open-outline" size={18} color="#040485" />
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-app-surface rounded-2xl p-4 flex-row items-center justify-between"
          onPress={() => Linking.openURL(`mailto:${LEGAL_LINKS.supportEmail}`)}
          activeOpacity={0.8}
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-1 pr-3">
            <Text className="text-xs font-raleway-bold text-silver-600 uppercase tracking-wider mb-1">
              Contact
            </Text>
            <Text className="text-sm text-silver-700">{LEGAL_LINKS.supportEmail}</Text>
          </View>
          <Ionicons name="mail-outline" size={18} color="#040485" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
