import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

type ButtonProps = {
  children: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  icon?: ReactNode;
  disabled?: boolean;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variant === "primary" && styles.primaryLabel]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.small,
    paddingHorizontal: 14,
  },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  quiet: { backgroundColor: "transparent" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  label: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  primaryLabel: { color: colors.surface },
  icon: { alignItems: "center", justifyContent: "center" },
});