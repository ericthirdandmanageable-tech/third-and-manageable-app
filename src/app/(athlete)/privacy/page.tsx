import LegalDocument from "@/components/athlete/LegalDocument";
import { PRIVACY_POLICY } from "@/lib/core/legal";

export default function PrivacyPage() {
    return <LegalDocument document={PRIVACY_POLICY} />;
}
