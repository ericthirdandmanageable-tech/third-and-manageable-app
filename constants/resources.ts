export interface Resource {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicons name
  url?: string;
  phone?: string;
}

export const RESOURCES: Resource[] = [
  {
    id: "r1",
    title: "And Her Name Was Grace",
    description:
      "First 30 minutes consultation free. Professional support for athletes navigating transition.",
    icon: "heart-outline",
    url: "https://andhernamewasgracellc.simplybook.me/v2/",
  },
  {
    id: "r2",
    title: "988 Suicide & Crisis Lifeline",
    description:
      "Call or Text 988 — free, confidential, 24/7 nationwide crisis support.",
    icon: "call-outline",
    phone: "988",
    url: "tel:988",
  },
];
