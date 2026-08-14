import type { ViewStyle } from "react-native";

export const APP_CONTENT_MAX_WIDTH = 1040;
export const CHAT_CONTENT_MAX_WIDTH = 900;
export const FORM_CONTENT_MAX_WIDTH = 680;
export const TAB_BAR_MAX_WIDTH = 720;

export interface AdaptiveLayout {
  width: number;
  height: number;
  compact: boolean;
  medium: boolean;
  expanded: boolean;
  gutter: number;
  contentFrame: ViewStyle;
}

export function getAdaptiveLayout(width: number, height: number): AdaptiveLayout {
  const compact = width < 390 || height < 700;
  const medium = width >= 700;
  const expanded = width >= 980;
  const gutter = compact ? 16 : medium ? 28 : 20;

  return {
    width,
    height,
    compact,
    medium,
    expanded,
    gutter,
    contentFrame: {
      width: "100%",
      maxWidth: APP_CONTENT_MAX_WIDTH,
      alignSelf: "center",
    },
  };
}
