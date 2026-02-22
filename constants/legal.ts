export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_LINKS = {
  privacy:
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||
    "https://thirdandmanageable.com/privacy",
  terms:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    "https://thirdandmanageable.com/terms",
  supportEmail:
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "support@thirdandmanageable.com",
};

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  lastUpdated: "February 21, 2026",
  sections: [
    {
      heading: "Information We Collect",
      paragraphs: [
        "We collect account information you provide, including your name, email, athlete profile details, and any content you submit in check-ins, messages, and support requests.",
        "We also collect technical data needed to run the app, such as device push token and service logs.",
      ],
    },
    {
      heading: "How We Use Information",
      paragraphs: [
        "We use your information to authenticate your account, personalize your app experience, deliver support features, and maintain community safety.",
        "We may use aggregated and de-identified usage data to improve product quality and reliability.",
      ],
    },
    {
      heading: "Community and Safety",
      paragraphs: [
        "If you use community features, your display name, sport, athlete status, and messages may be visible to other approved users in relevant rooms.",
        "Reported content and moderation events may be stored to investigate abuse, enforce guidelines, and protect users.",
      ],
    },
    {
      heading: "Data Retention and Deletion",
      paragraphs: [
        "You can request deletion directly in the app from Profile > Delete Account.",
        "When deletion is requested, we remove user-owned data from our application databases and end active sessions.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For privacy requests or support, contact us at ${LEGAL_LINKS.supportEmail}.`,
      ],
    },
  ],
};

export const TERMS_AND_CONDITIONS: LegalDocument = {
  title: "Terms and Conditions",
  lastUpdated: "February 21, 2026",
  sections: [
    {
      heading: "Acceptance of Terms",
      paragraphs: [
        "By creating an account or using this app, you agree to these terms and our Privacy Policy.",
      ],
    },
    {
      heading: "Account and Eligibility",
      paragraphs: [
        "You are responsible for account security and for activity performed under your account.",
        "You must provide accurate profile information and keep it up to date.",
      ],
    },
    {
      heading: "Community Rules",
      paragraphs: [
        "Do not post content that is abusive, threatening, discriminatory, sexually explicit, or otherwise harmful.",
        "Do not impersonate others, spam, or use the platform for fraud or harassment.",
        "Users can report content and block other users. We may remove content or restrict access for violations.",
      ],
    },
    {
      heading: "No Emergency Service",
      paragraphs: [
        "This app does not provide emergency response services. In an emergency, call 911. For crisis support in the United States, call or text 988.",
      ],
    },
    {
      heading: "Termination and Deletion",
      paragraphs: [
        "You may stop using the app at any time and can delete your account from within the app.",
        "We may suspend or terminate accounts that violate these terms or create safety risks.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `For legal or support questions, contact ${LEGAL_LINKS.supportEmail}.`,
      ],
    },
  ],
};
