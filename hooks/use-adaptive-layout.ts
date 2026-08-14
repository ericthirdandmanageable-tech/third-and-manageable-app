import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import {
  getAdaptiveLayout,
  type AdaptiveLayout,
} from "@/constants/adaptive-layout";

export * from "@/constants/adaptive-layout";

export function useAdaptiveLayout(): AdaptiveLayout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => getAdaptiveLayout(width, height), [height, width]);
}
