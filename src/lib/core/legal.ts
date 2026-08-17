export interface LegalDocument {
    title: string;
    lastUpdated: string;
    sections: { heading: string; paragraphs: string[] }[];
}

export const SUPPORT_EMAIL = "support@thirdandmanageable.com";

export const PRIVACY_POLICY: LegalDocument = {
    title: "Privacy Policy",
    lastUpdated: "February 21, 2026",
    sections: [
        { heading: "Information We Collect", paragraphs: ["We collect account information you provide, including your name, email, athlete profile details, and content you submit in check-ins, messages, and support requests.", "We also collect technical data needed to run the app, such as device push tokens and service logs."] },
        { heading: "How We Use Information", paragraphs: ["We use your information to authenticate your account, personalize your experience, deliver support features, and maintain community safety.", "We may use aggregated and de-identified usage data to improve product quality and reliability."] },
        { heading: "Community and Safety", paragraphs: ["If you use community features, your display name, sport, athlete status, and messages may be visible to other approved users in relevant rooms.", "Reported content and moderation events may be stored to investigate abuse, enforce guidelines, and protect users."] },
        { heading: "Data Retention and Deletion", paragraphs: ["You can permanently delete your account and user-owned product data from Profile > Delete Account.", "Deleting an account removes application data and ends active sessions. Some limited records may be retained where required for security, legal compliance, or abuse prevention."] },
        { heading: "Contact", paragraphs: [`For privacy requests or support, contact us at ${SUPPORT_EMAIL}.`] },
    ],
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
    title: "Terms and Conditions",
    lastUpdated: "February 21, 2026",
    sections: [
        { heading: "Acceptance of Terms", paragraphs: ["By creating an account or using Third & Manageable, you agree to these terms and our Privacy Policy."] },
        { heading: "Account and Eligibility", paragraphs: ["You are responsible for account security and for activity performed under your account.", "You must provide accurate profile information and keep it up to date."] },
        { heading: "Community Rules", paragraphs: ["Do not post content that is abusive, threatening, discriminatory, sexually explicit, fraudulent, harassing, or otherwise harmful.", "Users can report content and block other users. We may remove content or restrict access for violations."] },
        { heading: "No Emergency Service", paragraphs: ["This app does not provide emergency response services. In an emergency, call 911. For crisis support in the United States, call or text 988."] },
        { heading: "Termination and Deletion", paragraphs: ["You may stop using the app at any time and can delete your account from Profile.", "We may suspend or terminate accounts that violate these terms or create safety risks."] },
        { heading: "Contact", paragraphs: [`For legal or support questions, contact ${SUPPORT_EMAIL}.`] },
    ],
};
