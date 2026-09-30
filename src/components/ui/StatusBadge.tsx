import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

type StatusBadgeProps = {
  label: string;
  tone: "green" | "coral" | "amber" | "blue" | "neutral";
};

const palette = {
  green: { background: colors.greenSoft, text: colors.green },
  coral: { background: colors.coralSoft, text: colors.coral },
  amber: { background: colors.amberSoft, text: colors.amber },
  blue: { background: colors.blueSoft, text: colors.blue },
  neutral: { background: "#F0F2F0", text: colors.muted },
};

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  const selected = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: selected.background }]}>
      <Text style={[styles.label, { color: selected.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.small,
    alignItems: "center"

  },
  label: { fontSize: 12, lineHeight: 15, fontWeight: "600" },
});