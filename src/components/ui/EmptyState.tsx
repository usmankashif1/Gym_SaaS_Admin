import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/tokens";

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.icon}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { minHeight: 220, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 8 },
  icon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: colors.greenSoft, marginBottom: 4 },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700", textAlign: "center" },
  description: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 17, maxWidth: 300 },
});