import LegalDocumentScreen from "@/components/LegalDocumentScreen";
import { LEGAL_LINKS, TERMS_AND_CONDITIONS } from "@/constants/legal";
import { Stack } from "expo-router";

export default function TermsAndConditionsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Terms & Conditions" }} />
      <LegalDocumentScreen
        document={TERMS_AND_CONDITIONS}
        hostedUrl={LEGAL_LINKS.terms}
        hostedLabel="Open full terms and conditions"
      />
    </>
  );
}
