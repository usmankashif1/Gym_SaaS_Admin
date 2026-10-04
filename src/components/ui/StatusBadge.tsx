import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/tokens";

type StatusBadgeProps = {
  label: string;
  tone: "green" | "coral" | "amber" | "blue" | "neutral" | "gold" | "emerald";
  icon?: ReactNode;
};

const palette = {
  green: { background: colors.greenSoft, text: colors.green },
  coral: { background: colors.coralSoft, text: colors.coral },
  amber: { background: colors.amberSoft, text: colors.amber },
  blue: { background: colors.blueSoft, text: colors.blue },
  neutral: { background: "#F0F2F0", text: colors.muted },
  gold: { background: "#F7E9AE", text: "#8B641F" },
  emerald: { background: "#1B8D5A", text: "#FFFFFF" },
};

export function StatusBadge({ label, tone, icon }: StatusBadgeProps) {
  const selected = palette[tone];

  return (
    <View style={[styles.badge, { backgroundColor: selected.background }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, { color: selected.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    minHeight: 28,
  },
  icon: { alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, lineHeight: 16, fontWeight: "700" },
});