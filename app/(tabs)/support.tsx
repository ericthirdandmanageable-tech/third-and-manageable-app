import {
  GlassButton,
  GlassSurface,
  ScreenHeader,
  SectionLabel,
} from "@/components/ui/liquid-glass";
import { LEGAL_LINKS } from "@/constants/legal";
import { RESOURCES, type Resource } from "@/constants/resources";
import { useAppTheme } from "@/context/app-theme";
import { useAdaptiveLayout } from "@/hooks/use-adaptive-layout";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupportScreen() {
  const { colors } = useAppTheme();
  const { medium } = useAdaptiveLayout();
  const openResource = (resource: Resource) => {
    if (resource.url) void Linking.openURL(resource.url);
    else if (resource.phone) void Linking.openURL(`tel:${resource.phone}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader eyebrow="Always within reach" title="Support" subtitle="Asking for help is a strength rep. Crisis, peer, and practical resources stay one tap away." icon="heart-circle-outline" />

        <GlassSurface tone="strong" style={[styles.crisis, { borderColor: `${colors.semantic.danger}50` }]}>
          <View style={[styles.crisisIcon, { backgroundColor: `${colors.semantic.danger}18` }]}>
            <Ionicons name="warning-outline" size={23} color={colors.semantic.danger} />
          </View>
          <View style={styles.crisisCopy}>
            <Text style={[styles.crisisTitle, { color: colors.textPrimary }]}>If you’re in immediate danger</Text>
            <Text style={[styles.crisisBody, { color: colors.textSecondary }]}>Call 911, or call/text 988 for the Suicide & Crisis Lifeline in the United States.</Text>
          </View>
          <GlassButton label="Call 988" icon="call-outline" variant="danger" compact onPress={() => void Linking.openURL("tel:988")} />
        </GlassSurface>

        <View style={styles.sectionHeading}>
          <SectionLabel>Resources</SectionLabel>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Choose the kind of help you need</Text>
        </View>

        <View style={styles.resourceGrid}>
          {RESOURCES.map((resource) => (
            <Pressable
              key={resource.id}
              onPress={() => openResource(resource)}
              style={[styles.resourceCell, medium && styles.resourceCellMedium]}
            >
              <GlassSurface interactive style={styles.resource}>
                <View style={[styles.resourceIcon, { backgroundColor: colors.signalSoft }]}>
                  <Ionicons name={resource.icon as keyof typeof Ionicons.glyphMap} size={21} color={colors.signal} />
                </View>
                <View style={styles.resourceCopy}>
                  <Text style={[styles.resourceTitle, { color: colors.textPrimary }]}>{resource.title}</Text>
                  <Text style={[styles.resourceBody, { color: colors.textSecondary }]}>{resource.description}</Text>
                  {resource.url || resource.phone ? (
                    <Text style={[styles.resourceAction, { color: colors.signal }]}>{resource.phone && !resource.url?.startsWith("http") ? `Call ${resource.phone}` : "Open resource"}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </GlassSurface>
            </Pressable>
          ))}
        </View>

        <GlassSurface style={styles.safety}>
          <View style={styles.safetyTitleRow}>
            <Ionicons name="shield-checkmark-outline" size={19} color={colors.signal} />
            <Text style={[styles.resourceTitle, { color: colors.textPrimary }]}>Community safety</Text>
          </View>
          <Text style={[styles.resourceBody, { color: colors.textSecondary }]}>Long-press a community message to report harmful content or block an account. Those controls remain available in every room.</Text>
          <View style={styles.safetyButtons}>
            <GlassButton label="Email support" icon="mail-outline" variant="glass" compact onPress={() => void Linking.openURL(`mailto:${LEGAL_LINKS.supportEmail}`)} />
            <GlassButton label="Privacy" icon="open-outline" variant="glass" compact onPress={() => void Linking.openURL(LEGAL_LINKS.privacy)} />
          </View>
        </GlassSurface>

        <GlassSurface tone="signal" style={styles.reminder}>
          <Text style={[styles.reminderQuote, { color: colors.textPrimary }]}>“The strongest people know when to lean on the team.”</Text>
          <Text style={[styles.reminderMeta, { color: colors.signal }]}>ASKING IS A STRENGTH REP</Text>
        </GlassSurface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: "100%", maxWidth: 1040, alignSelf: "center", paddingBottom: 120 },
  crisis: { marginHorizontal: 20, padding: 17, flexDirection: "row", alignItems: "center", gap: 12 },
  crisisIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  crisisCopy: { flex: 1 },
  crisisTitle: { fontFamily: "Raleway-Bold", fontSize: 13 },
  crisisBody: { fontFamily: "Raleway-Medium", fontSize: 10, lineHeight: 15, marginTop: 4 },
  sectionHeading: { marginHorizontal: 20, marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontFamily: "InstrumentSerif-Regular", fontSize: 27, lineHeight: 31 },
  resourceGrid: { paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resourceCell: { flexBasis: "100%" },
  resourceCellMedium: { flexBasis: "48%", flexGrow: 1 },
  resource: { minHeight: 112, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  resourceIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  resourceCopy: { flex: 1 },
  resourceTitle: { fontFamily: "Raleway-Bold", fontSize: 14 },
  resourceBody: { fontFamily: "Raleway-Medium", fontSize: 11, lineHeight: 17, marginTop: 3 },
  resourceAction: { fontFamily: "DMMono-Medium", fontSize: 8, textTransform: "uppercase", marginTop: 7 },
  safety: { marginHorizontal: 20, marginTop: 8, padding: 18 },
  safetyTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  safetyButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 },
  reminder: { margin: 20, padding: 22 },
  reminderQuote: { fontFamily: "InstrumentSerif-Italic", fontSize: 25, lineHeight: 30 },
  reminderMeta: { fontFamily: "DMMono-Medium", fontSize: 8, letterSpacing: 1.3, marginTop: 12 },
});
