import { CalendarDays, CreditCard } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { useSubscription } from "@/hooks/useSubscription";
import { colors } from "@/theme/tokens";

export function WorkspaceSubscriptionPage() {
  const { subscription, loading, error } = useSubscription();

  return (
    <AppShell title="Workspace plan" subtitle="Workspace billing status and renewal details.">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loadingBlocks}><Skeleton style={styles.workspaceSkeleton} /></View>
      ) : (
        <View style={styles.primaryGrid}>
          <Surface style={styles.planPanel}>
            <View style={styles.planHeading}>
              <Text style={styles.eyebrow}>WORKSPACE PLAN</Text>
              {subscription ? (
                <View style={styles.planNameRow}>
                  <Text style={styles.planName}>{subscription.planKey}</Text>
                  <StatusBadge label={subscription.status.replaceAll("_", " ")} tone={subscription.status === "active" ? "green" : "amber"} />
                </View>
              ) : <Text style={styles.planName}>Not configured</Text>}
              <Text style={styles.planDescription}>{subscription ? "Workspace billing plan" : "Workspace billing has not been configured."}</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.workspaceNote}>Member plans and admission fees are managed separately.</Text>
          </Surface>
          <Surface style={styles.billingPanel}>
            <View style={styles.billingIcon}><CalendarDays size={17} color={colors.blue} /></View>
            <Text style={styles.billingTitle}>Next renewal</Text>
            <Text style={styles.renewalDate}>{subscription ? formatDate(subscription.currentPeriodEnd) : "Not scheduled"}</Text>
            <Text style={styles.billingNote}>{subscription ? `Workspace status: ${subscription.status.replaceAll("_", " ")}` : "No workspace subscription record."}</Text>
            <View style={styles.divider} />
            <View style={styles.billingMeta}><CreditCard size={15} color={colors.muted} /><Text style={styles.metaText}>Billing is managed by the workspace owner.</Text></View>
          </Surface>
        </View>
      )}
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
  primaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  planPanel: { flex: 1, minWidth: 300, padding: 22 },
  billingPanel: { width: 290, minWidth: 260, padding: 22 },
  planHeading: { gap: 8 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  planNameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  planName: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  planDescription: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 20 },
  workspaceNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  billingIcon: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft, marginBottom: 17 },
  billingTitle: { color: colors.muted, fontSize: 12 },
  renewalDate: { color: colors.ink, fontSize: 18, fontWeight: "700", marginTop: 5 },
  billingNote: { color: colors.muted, fontSize: 12, marginTop: 5 },
  billingMeta: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metaText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 15 },
  loadingBlocks: { gap: 16 },
  workspaceSkeleton: { height: 190 },
  error: { color: colors.coral, fontSize: 12, padding: 14 },
});