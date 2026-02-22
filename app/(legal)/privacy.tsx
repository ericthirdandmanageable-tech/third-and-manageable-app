import LegalDocumentScreen from "@/components/LegalDocumentScreen";
import { LEGAL_LINKS, PRIVACY_POLICY } from "@/constants/legal";
import { Stack } from "expo-router";

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <LegalDocumentScreen
        document={PRIVACY_POLICY}
        hostedUrl={LEGAL_LINKS.privacy}
        hostedLabel="Open full privacy policy"
      />
    </>
  );
}
