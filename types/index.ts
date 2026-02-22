import type { ImageSourcePropType } from "react-native";

export type AIPersonality =
  | "motivator"
  | "chill"
  | "analyst"
  | "mentor"
  | "huddle";

export interface Profile {
  id: string;
  sport: string;
  display_name: string;
  email?: string;
  profile_pic?: string;
  athlete_status: "current" | "former";
  school: string;
  group_interest: boolean;
  current_quarter: number;
  streak: number;
  joined_at: string;
  verified: boolean;
  verification_requested?: boolean;
  ai_personality?: AIPersonality;
}

export interface Room {
  id: string;
  room_id: string;
  name: string;
  type: "global" | "school";
  school: string | null;
  daily_prompt: string;
  daily_prompt_author?: string;
  daily_prompt_updated_at?: string;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  sport: string;
  athlete_status: string;
  content: string;
  verified?: boolean;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  user_id: string;
  type: "peer" | "moderator";
  message: string;
  status: "pending" | "connected" | "resolved";
  created_at: string;
}

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  room_id: string;
  message_id: string;
  content_preview: string;
  reason: string;
  created_at: string;
  status: "open" | "reviewed" | "dismissed";
}

export interface UserBlock {
  id: string;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  mood: number;
  note: string | null;
  ai_response: string | null;
  created_at: string;
}

export interface GamePlanCompletion {
  id: string;
  user_id: string;
  action_id: string;
  completed_at: string;
}

export type SportKey =
  | "basketball"
  | "football"
  | "soccer"
  | "hockey"
  | "baseball"
  | "tennis"
  | "swimming"
  | "track_field"
  | "volleyball"
  | "softball"
  | "wrestling"
  | "lacrosse"
  | "golf"
  | "gymnastics"
  | "other";

export interface SportConfig {
  key: SportKey;
  label: string;
  icon: ImageSourcePropType;
  periodName: string;
  periodNamePlural: string;
  totalPeriods: number;
}
