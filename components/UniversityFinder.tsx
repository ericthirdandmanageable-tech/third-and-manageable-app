import { GlassSurface } from "@/components/ui/liquid-glass";
import { findUniversities } from "@/constants/universities";
import { useAppTheme } from "@/context/app-theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function UniversityFinder({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => findUniversities(value), [value]);

  return (
    <View style={styles.container}>
      <View style={[styles.inputShell, { backgroundColor: colors.surfaceStrong, borderColor: focused ? colors.signal : colors.borderStrong }]}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          accessibilityLabel="School or university"
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          placeholder="Find your university"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          autoCorrect={false}
          style={[styles.input, { color: colors.textPrimary }]}
        />
      </View>
      {focused && value.trim() ? (
        <GlassSurface tone="strong" style={styles.results}>
          {results.length > 0 ? (
            results.map(([name, city, state]) => (
              <Pressable
                key={`${name}-${city}`}
                onPress={() => {
                  onChange(name);
                  setFocused(false);
                }}
                style={({ pressed }) => [styles.result, { opacity: pressed ? 0.65 : 1, borderBottomColor: colors.borderStrong }]}
              >
                <View style={styles.resultCopy}>
                  <Text style={[styles.resultName, { color: colors.textPrimary }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.resultLocation, { color: colors.textTertiary }]}>{city}, {state}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={19} color={colors.signal} />
              </Pressable>
            ))
          ) : (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>No cached match. You can continue with the name you entered.</Text>
          )}
        </GlassSurface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", zIndex: 20 },
  inputShell: { minHeight: 54, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, fontFamily: "Raleway-SemiBold", fontSize: 14, paddingVertical: 14 },
  results: { marginTop: 8, padding: 6 },
  result: { flexDirection: "row", alignItems: "center", paddingHorizontal: 11, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  resultCopy: { flex: 1 },
  resultName: { fontFamily: "Raleway-SemiBold", fontSize: 12 },
  resultLocation: { fontFamily: "DMMono-Regular", fontSize: 8, marginTop: 3 },
  empty: { fontFamily: "Raleway-Medium", fontSize: 12, lineHeight: 18, padding: 12 },
});
