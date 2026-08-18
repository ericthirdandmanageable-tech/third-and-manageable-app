import LegalDocument from "@/components/athlete/LegalDocument";
import { TERMS_AND_CONDITIONS } from "@/lib/core/legal";

export default function TermsPage() {
    return <LegalDocument document={TERMS_AND_CONDITIONS} />;
}
