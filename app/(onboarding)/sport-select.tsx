import { SPORT_LIST } from "@/constants/sports";
import { SportKey } from "@/types";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SportSelectScreen() {
  const { athleteStatus } = useLocalSearchParams<{ athleteStatus: string }>();
  const [selected, setSelected] = useState<SportKey | null>(null);

  const handleNext = () => {
    if (!selected) return;
    router.push({
      pathname: "/(onboarding)/profile-setup",
      params: { sport: selected, athleteStatus },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <Text style={styles.step}>Step 2 of 4</Text>
          <Text style={styles.title}>What&apos;s your sport?</Text>
          <Text style={styles.subtitle}>
            We&apos;ll tailor your experience using language from your game.
          </Text>
        </View>
      </View>

      <FlatList
        data={SPORT_LIST}
        keyExtractor={(item) => item.key}
        numColumns={3}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.sportCard,
              selected === item.key && styles.sportCardSelected,
            ]}
            onPress={() => setSelected(item.key)}
            activeOpacity={0.7}
          >
            <Image
              source={item.icon}
              style={styles.sportIcon}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.sportLabel,
                selected === item.key && styles.sportLabelSelected,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, !selected && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  step: {
    fontSize: 12,
    color: "#0618A8",
    fontFamily: "Raleway-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: "Raleway-ExtraBold",
    color: "#212121",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Raleway-Medium",
    color: "#616161",
    lineHeight: 21,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sportCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sportCardSelected: {
    borderColor: "#0618A8",
    backgroundColor: "#ECEEFB",
    shadowColor: "#0618A8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  sportIcon: {
    width: 34,
    height: 34,
    marginBottom: 6,
  },
  sportLabel: {
    fontSize: 12,
    fontFamily: "Raleway-SemiBold",
    color: "#616161",
    textAlign: "center",
  },
  sportLabelSelected: {
    color: "#030366",
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 8,
  },
  button: {
    backgroundColor: "#040485",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#040485",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Raleway-Bold",
  },
});
