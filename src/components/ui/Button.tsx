import type { ReactNode } from "react";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

type ButtonProps = {
  children: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet" | "mint";
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  style,
  labelStyle,
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
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variant === "primary" && styles.primaryLabel, labelStyle]} numberOfLines={1} ellipsizeMode="clip">
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
  mint: {
    backgroundColor: "#E8F8F2",
    borderWidth: 1,
    borderColor: "#B9E8D5",
  },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.55 },
  label: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "center",
  },
  primaryLabel: { color: colors.surface },
  icon: { alignItems: "center", justifyContent: "center" },
});