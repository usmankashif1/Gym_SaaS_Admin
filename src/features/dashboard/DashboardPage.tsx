import { useRouter } from "expo-router";
import { Activity, ArrowRight, CalendarClock, CircleAlert, UsersRound, WalletCards } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { useDashboard } from "@/hooks/useDashboard";
import { colors } from "@/theme/tokens";
import type { Payment } from "@/types/domain";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function DashboardPage() {
    const { summary, dueTodayPayments, overduePayments, dueTodayCount, overdueCount, loading, error } = useDashboard();
    const { width } = useWindowDimensions();
    const columns = width < 900 ? 2 : 3;

    if (loading) return <DashboardLoading columns={columns} />;

    const metrics = summary ? [
        { label: "Active members", value: summary.activeMembers.toLocaleString(), note: "Current active memberships", icon: <UsersRound size={18} color={colors.green} />, tone: "green" as const },
        { label: "Today check-in", value: summary.checkInsToday.toLocaleString(), note: "Unique members checked in today", icon: <Activity size={18} color={colors.blue} />, tone: "blue" as const },
        { label: "Revenue this month", value: currency.format(summary.revenueThisMonth), note: "Payments recorded as paid", icon: <WalletCards size={18} color={colors.green} />, tone: "green" as const },
        { label: "Overdue recovery", value: currency.format(summary.overdueAmount), note: "Unpaid amount past due", icon: <CircleAlert size={18} color={colors.coral} />, tone: "coral" as const },
        { label: "Due today expected", value: currency.format(summary.dueTodayAmount), note: "Unpaid amount due today", icon: <CalendarClock size={18} color={colors.amber} />, tone: "amber" as const },
    ] : [];
    const metricRows = Array.from({ length: Math.ceil(metrics.length / columns) }, (_, rowIndex) => metrics.slice(rowIndex * columns, (rowIndex + 1) * columns));

    return (
        <AppShell title="Dashboard" subtitle="Your gym at a glance.">
            {error || !summary ? (
                <Text style={styles.errorText}>{error || "Could not load dashboard data."}</Text>
            ) : (
                <>
                    <View style={styles.metricGrid}>
                        {metricRows.map((row, rowIndex) => (
                            <View key={`metric-row-${rowIndex}`} style={styles.metricRow}>
                                {row.map((metric) => <MetricCard key={metric.label} {...metric} />)}
                                {row.length < columns ? <View style={styles.metricSpacer} /> : null}
                                {row.length < columns - 1 ? <View style={styles.metricSpacer} /> : null}
                            </View>
                        ))}
                    </View>
                    <View style={styles.paymentLists}>
                        <MemberPaymentList title="Memberships due today" count={dueTodayCount} payments={dueTodayPayments} view="today" />
                        <MemberPaymentList title="Overdue memberships" count={overdueCount} payments={overduePayments} view="overdue" />
                    </View>
                </>
            )}
        </AppShell>
    );
}

function DashboardLoading({ columns }: { columns: number }) {
    const rowCount = Math.ceil(5 / columns);
    return (
        <AppShell title="Dashboard" subtitle="Your gym at a glance.">
            <View style={styles.metricGrid}>
                {Array.from({ length: rowCount }, (_, rowIndex) => {
                    const cardsInRow = Math.min(columns, 5 - rowIndex * columns);
                    return (
                        <View key={`skeleton-row-${rowIndex}`} style={styles.metricRow}>
                            {Array.from({ length: cardsInRow }, (_, cardIndex) => <Skeleton key={cardIndex} style={styles.metricSkeleton} />)}
                            {cardsInRow < columns ? <View style={styles.metricSpacer} /> : null}
                            {cardsInRow < columns - 1 ? <View style={styles.metricSpacer} /> : null}
                        </View>
                    );
                })}
            </View>
            <View style={styles.paymentLists}>
                <Skeleton style={styles.listSkeleton} />
                <Skeleton style={styles.listSkeleton} />
            </View>
        </AppShell>
    );
}

function MetricCard({ label, value, note, icon, tone }: {
    label: string;
    value: string;
    note: string;
    icon: React.ReactNode;
    tone: "green" | "blue" | "amber" | "coral";
}) {
    const toneStyles = {
        green: { iconBackground: colors.greenSoft, accent: colors.green },
        blue: { iconBackground: colors.blueSoft, accent: colors.blue },
        amber: { iconBackground: colors.amberSoft, accent: colors.amber },
        coral: { iconBackground: colors.coralSoft, accent: colors.coral },
    };
    const currentTone = toneStyles[tone];

    return (
        <Surface style={styles.metricSurface}>
            <View style={styles.metricCard}>
                <View style={[{ backgroundColor: currentTone.accent }]} />
                <View style={styles.metricTop}>
                    <Text style={styles.metricLabel}>{label}</Text>
                    <View style={[styles.metricIcon, { backgroundColor: currentTone.iconBackground }]}>{icon}</View>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.metricValue}>{value}</Text>
                <Text style={styles.metricNote}>{note}</Text>
            </View>
        </Surface>
    );
}

function MemberPaymentList({ title, count, payments, view }: { title: string; count: number; payments: Payment[]; view: "today" | "overdue" }) {
    const router = useRouter();
    const visiblePayments = payments.slice(0, 5);

    return (
        <Surface style={styles.paymentListCard}>
            <View style={styles.paymentListHeader}>
                <View style={styles.paymentListTitleGroup}>
                    <Text style={styles.paymentListTitle}>{title}</Text>
                    <Text style={styles.paymentListCount}>{count} {count === 1 ? "member" : "members"}</Text>
                </View>
                <Pressable accessibilityRole="link" onPress={() => router.push(`/payments?view=${view}`)} style={styles.viewListButton}>
                    <Text style={styles.viewListLabel}>View list</Text>
                    <ArrowRight size={14} color={colors.green} />
                </Pressable>
            </View>
            {visiblePayments.length ? visiblePayments.map((payment) => (
                <View key={payment.id} style={styles.memberPaymentRow}>
                    <View style={styles.memberPaymentCopy}>
                        <Text numberOfLines={1} style={styles.memberPaymentName}>{payment.memberName}</Text>
                        <Text numberOfLines={1} style={styles.memberPaymentPlan}>{payment.membershipPlanName || "Membership"} · Due {formatDate(payment.dueDate)}</Text>
                    </View>
                    <Text style={styles.memberPaymentAmount}>{currency.format(payment.amount)}</Text>
                </View>
            )) : <Text style={styles.noMemberPayments}>No memberships {view === "today" ? "due today" : "overdue"}.</Text>}
            {count > visiblePayments.length ? <Text style={styles.moreMembers}>Showing {visiblePayments.length} of {count}</Text> : null}
        </Surface>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
    metricGrid: { gap: 16 },
    metricRow: { flexDirection: "row", gap: 16 },
    metricSurface: { flex: 1, minWidth: 0, borderRadius: 10, overflow: "hidden" },
    metricSpacer: { flex: 1 },
    metricSkeleton: { flex: 1, minWidth: 0, height: 168, borderRadius: 10 },
    metricCard: { flex: 1, minHeight: 168, padding: 22, position: "relative", justifyContent: "space-between", borderWidth: 2, borderRadius: 10, borderColor: colors.sidebarMuted },
    metricTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    metricLabel: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
    metricIcon: { width: 38, height: 38, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    metricValue: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: "800", marginTop: 18 },
    metricNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 8 },
    paymentLists: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    paymentListCard: { flex: 1, minWidth: 300 },
    paymentListHeader: { minHeight: 70, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    paymentListTitleGroup: { flex: 1, gap: 4 },
    paymentListTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
    paymentListCount: { color: colors.muted, fontSize: 11 },
    viewListButton: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 6 },
    viewListLabel: { color: colors.green, fontSize: 11, fontWeight: "600" },
    memberPaymentRow: { minHeight: 54, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 },
    memberPaymentCopy: { flex: 1, minWidth: 0, gap: 4 },
    memberPaymentName: { color: colors.ink, fontSize: 12, fontWeight: "600" },
    memberPaymentPlan: { color: colors.muted, fontSize: 10 },
    memberPaymentAmount: { color: colors.ink, fontSize: 11, fontWeight: "600" },
    noMemberPayments: { color: colors.muted, fontSize: 11, paddingHorizontal: 18, paddingBottom: 18 },
    moreMembers: { color: colors.muted, fontSize: 10, paddingHorizontal: 18, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line },
    listSkeleton: { flex: 1, minWidth: 300, height: 250 },
    errorText: { color: colors.coral, fontSize: 12 },
});