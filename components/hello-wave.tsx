import { Image } from "react-native";
import Animated from "react-native-reanimated";

export function HelloWave() {
  return (
    <Animated.View
      style={{
        width: 28,
        height: 28,
        marginTop: -6,
        animationName: {
          "50%": { transform: [{ rotate: "25deg" }] },
        },
        animationIterationCount: 4,
        animationDuration: "300ms",
      }}
    >
      <Image
        source={require("../assets/icons/wave-hand.png")}
        style={{ width: 28, height: 28 }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
