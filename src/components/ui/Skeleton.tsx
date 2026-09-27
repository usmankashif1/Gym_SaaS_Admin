import { StyleSheet, View, type ViewStyle } from "react-native";

import { radii } from "@/theme/tokens";

export function Skeleton({ style }: { style: ViewStyle }) {
  return <View accessibilityLabel="Loading" style={[styles.skeleton, style]} />;
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: "#E9EEEA", borderRadius: radii.small },
});