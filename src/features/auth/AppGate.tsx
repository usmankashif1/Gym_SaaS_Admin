import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/features/auth/AuthProvider";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { colors } from "@/theme/tokens";

export function AppGate() {
  const { isConfigured, ready, session } = useAuth();

  if (!isConfigured) return <SupabaseSetup />;
  if (!ready) return <SessionLoading />;
  if (!session) return <AuthScreen />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />;
}

function SessionLoading() {
  return (
    <View style={styles.loading}>
      <Skeleton style={styles.loadingTitle} />
      <Skeleton style={styles.loadingLine} />
      <Skeleton style={styles.loadingPanel} />
    </View>
  );
}

function SupabaseSetup() {
  return (
    <View style={styles.setup}>
      <Text style={styles.setupTitle}>Supabase configuration required</Text>
      <Text style={styles.setupMessage}>Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart Expo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, minHeight: "100%", backgroundColor: colors.canvas, padding: 34, gap: 18 },
  loadingTitle: { width: 240, height: 32, marginTop: 24 },
  loadingLine: { width: 340, maxWidth: "75%", height: 18 },
  loadingPanel: { height: 300, marginTop: 12 },
  setup: { flex: 1, minHeight: "100%", alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas, padding: 24, gap: 10 },
  setupTitle: { color: colors.ink, fontSize: 18, fontWeight: "700", textAlign: "center" },
  setupMessage: { color: colors.muted, fontSize: 14, lineHeight: 18, textAlign: "center", maxWidth: 420 },
});