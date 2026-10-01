import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, WalletCards } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { useRevenue } from "@/hooks/useRevenue";
import type { RevenueMonth } from "@/services/revenueService";
import { colors } from "@/theme/tokens";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compactCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonthFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });

export function RevenuePage() {
    const { data, error, loading, retry } = useRevenue();
    const { width } = useWindowDimensions();
    const [selectedMonthStart, setSelectedMonthStart] = useState("");
    const columns = width < 900 ? 2 : 4;

    const months = data?.months ?? [];
    const selectedMonth = months.find((month) => month.monthStart === selectedMonthStart)
        ?? months[0];
    const selectedMonthIndex = selectedMonth ? months.indexOf(selectedMonth) : -1;
    const hasCollectedRevenue = months.some((month) => month.total > 0);
    const maxRevenue = Math.max(0, ...months.map((month) => month.total));

    const metrics = data && selectedMonth ? [
        {
            label: "Total Revenue",
            value: currency.format(selectedMonth.total),
            note: "Collected in selected month",
            icon: <WalletCards size={18} color={colors.green} />,
            tone: "green" as const,
            monthLabel: formatMonth(selectedMonth.monthStart),
            onPrevious: selectedMonthIndex < months.length - 1 ? () => setSelectedMonthStart(months[selectedMonthIndex + 1].monthStart) : undefined,
            onNext: selectedMonthIndex > 0 ? () => setSelectedMonthStart(months[selectedMonthIndex - 1].monthStart) : undefined,
        },
        {
            label: "Collected Today",
            value: currency.format(data.collectedToday),
            note: "Payments marked paid today",
            icon: <CalendarDays size={18} color={colors.blue} />,
            tone: "blue" as const,
        },
        {
            label: "Due Today",
            value: currency.format(data.dueToday),
            note: "Unpaid memberships due today",
            icon: <CalendarClock size={18} color={colors.amber} />,
            tone: "amber" as const,
        },
        {
            label: "Overdue",
            value: currency.format(data.overdue),
            note: "Unpaid memberships past due",
            icon: <CircleAlert size={18} color={colors.coral} />,
            tone: "coral" as const,
        },
    ] : [];
    const metricRows = Array.from({ length: Math.ceil(metrics.length / columns) }, (_, rowIndex) => metrics.slice(rowIndex * columns, (rowIndex + 1) * columns));

    return (
        <AppShell title="Revenue" subtitle="Track collected payments and membership dues.">
            {error ? (
                <View style={styles.errorRow}>
                    <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>
                    <Button variant="secondary" onPress={retry}>Try again</Button>
                </View>
            ) : null}

            {loading && !data ? <RevenueLoading columns={columns} /> : null}

            {data ? (
                <>
                    <View style={styles.metricGrid}>
                        {metricRows.map((row, rowIndex) => (
                            <View key={`revenue-row-${rowIndex}`} style={styles.metricRow}>
                                {row.map((metric) => <MetricCard key={metric.label} {...metric} />)}
                                {row.length < columns ? <View style={styles.metricSpacer} /> : null}
                            </View>
                        ))}
                    </View>

                    <Surface style={styles.monthSurface}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Monthly collections</Text>
                                <Text style={styles.sectionSubtitle}>Select a month to update Total Revenue.</Text>
                            </View>
                            <Text style={styles.monthCount}>{months.length} {months.length === 1 ? "month" : "months"}</Text>
                        </View>
                        {hasCollectedRevenue ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthChart}>
                                {months.map((month) => (
                                    <MonthColumn
                                        key={month.monthStart}
                                        month={month}
                                        selected={month.monthStart === selectedMonth?.monthStart}
                                        maxRevenue={maxRevenue}
                                        onPress={() => setSelectedMonthStart(month.monthStart)}
                                    />
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyState}>
                                <EmptyState icon={<WalletCards size={18} color={colors.green} />} title="No revenue recorded yet" description="Payments marked as paid will appear here by month." />
                            </View>
                        )}
                        {error ? <Text style={styles.refreshNote}>Showing the last successfully loaded figures.</Text> : null}
                    </Surface>
                </>
            ) : null}
        </AppShell>
    );
}

function MetricCard({ label, value, note, icon, tone, monthLabel, onPrevious, onNext }: {
    label: string;
    value: string;
    note: string;
    icon: ReactNode;
    tone: "green" | "blue" | "amber" | "coral";
    monthLabel?: string;
    onPrevious?: () => void;
    onNext?: () => void;
}) {
    const toneStyles = {
        green: { iconBackground: colors.greenSoft, accent: colors.green },
        blue: { iconBackground: colors.blueSoft, accent: colors.blue },
        amber: { iconBackground: colors.amberSoft, accent: colors.amber },
        coral: { iconBackground: colors.coralSoft, accent: colors.coral },
    }[tone];

    return (
        <Surface style={styles.metricSurface}>
            <View style={styles.metricCard}>
                <View style={[{ backgroundColor: toneStyles.accent }]} />
                <View style={styles.metricTop}>
                    <Text style={styles.metricLabel}>{label}</Text>
                    <View style={[styles.metricIcon, { backgroundColor: toneStyles.iconBackground }]}>{icon}</View>
                </View>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.metricValue}>{value}</Text>
                {monthLabel ? (
                    <View style={styles.monthSelector}>
                        <Pressable accessibilityLabel="Previous available month" accessibilityRole="button" disabled={!onPrevious} onPress={onPrevious} style={[styles.monthArrow, !onPrevious && styles.monthArrowDisabled]}>
                            <ChevronLeft size={15} color={onPrevious ? colors.ink : colors.muted} />
                        </Pressable>
                        <Text numberOfLines={1} style={styles.selectedMonth}>{monthLabel}</Text>
                        <Pressable accessibilityLabel="Next available month" accessibilityRole="button" disabled={!onNext} onPress={onNext} style={[styles.monthArrow, !onNext && styles.monthArrowDisabled]}>
                            <ChevronRight size={15} color={onNext ? colors.ink : colors.muted} />
                        </Pressable>
                    </View>
                ) : <Text style={styles.metricNote}>{note}</Text>}
            </View>
        </Surface>
    );
}

function MonthColumn({ month, selected, maxRevenue, onPress }: { month: RevenueMonth; selected: boolean; maxRevenue: number; onPress: () => void }) {
    const barHeight = month.total === 0 || maxRevenue === 0 ? 4 : Math.max(5, Math.round((month.total / maxRevenue) * 78));

    return (
        <Pressable accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`${formatMonth(month.monthStart)} revenue ${currency.format(month.total)}`} onPress={onPress} style={[styles.monthColumn, selected && styles.monthColumnSelected]}>
            <View style={styles.barArea}>
                <View style={[styles.bar, { height: barHeight, backgroundColor: selected ? colors.green : "#9CCDB0" }]} />
            </View>
            <Text style={[styles.monthColumnLabel, selected && styles.monthColumnLabelSelected]}>{shortMonthFormatter.format(new Date(`${month.monthStart}T12:00:00Z`))}</Text>
            <Text numberOfLines={1} style={styles.monthColumnValue}>{compactCurrency.format(month.total)}</Text>
        </Pressable>
    );
}

function RevenueLoading({ columns }: { columns: number }) {
    const rows = Math.ceil(4 / columns);
    return (
        <>
            <View style={styles.metricGrid}>
                {Array.from({ length: rows }, (_, rowIndex) => (
                    <View key={`revenue-skeleton-row-${rowIndex}`} style={styles.metricRow}>
                        {Array.from({ length: Math.min(columns, 4 - rowIndex * columns) }, (_, cardIndex) => <Skeleton key={cardIndex} style={styles.metricSkeleton} />)}
                    </View>
                ))}
            </View>
            <Skeleton style={styles.chartSkeleton} />
        </>
    );
}

function formatMonth(value: string) {
    return monthFormatter.format(new Date(`${value}T12:00:00Z`));
}

const styles = StyleSheet.create({
    metricGrid: { gap: 12 },
    metricRow: { flexDirection: "row", gap: 12 },
    metricSpacer: { flex: 1 },
    metricSurface: { flex: 1, minWidth: 0 },
    metricCard: { minHeight: 158, paddingHorizontal: 16, paddingVertical: 14, overflow: "hidden", borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.surface },

    metricTop: { minHeight: 29, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 7 },
    metricLabel: { flex: 1, color: colors.muted, fontSize: 14, fontWeight: "600" },
    metricIcon: { width: 30, height: 30, borderRadius: 7, alignItems: "center", justifyContent: "center" },
    metricValue: { marginTop: 12, color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: "700" },
    metricNote: { marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 15 },
    monthSelector: { marginTop: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 },
    monthArrow: { width: 25, height: 25, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.muted, borderRadius: 6 },
    monthArrowDisabled: { opacity: 0.6 },
    selectedMonth: { flex: 1, color: colors.muted, fontSize: 14, textAlign: "center" },
    monthSurface: { overflow: "hidden",borderWidth: 1, borderColor: colors.muted, borderRadius: 8, backgroundColor: colors.surface   },
    sectionHeader: { minHeight: 68, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 18 },
    sectionHeading: { flex: 1, gap: 4 },
    sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
    sectionSubtitle: { color: colors.ink, fontSize: 14 },
    monthCount: { color: colors.muted, fontSize: 14 },
    monthChart: { minHeight: 159, alignItems: "flex-end", gap: 7, paddingHorizontal: 12, paddingBottom: 14, },
    monthColumn: { width: 84, minHeight: 138, alignItems: "center", justifyContent: "flex-end", gap: 5, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: "transparent" },
    monthColumnSelected: { backgroundColor: "#F5FAF6", borderColor: "#DCEDE1" },
    barArea: { width: 22, height: 82, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", backgroundColor: "#F2F6F3", borderRadius: 4 },
    bar: { width: "100%", borderRadius: 4 },
    monthColumnLabel: { color: colors.muted, fontSize: 14 },
    monthColumnLabelSelected: { color: colors.green, fontWeight: "700" },
    monthColumnValue: { maxWidth: 76, color: colors.ink, fontSize: 14, fontWeight: "600" },
    emptyState: { paddingHorizontal: 18, paddingBottom: 16 },
    refreshNote: { paddingHorizontal: 18, paddingBottom: 14, color: colors.amber, fontSize: 14 },
    errorRow: { minHeight: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderWidth: 1, borderColor: colors.coralSoft, borderRadius: 8, backgroundColor: colors.surface },
    errorText: { flex: 1, color: colors.coral, fontSize: 14, lineHeight: 17 },
    metricSkeleton: { flex: 1, minWidth: 0, height: 158 },
    chartSkeleton: { height: 230 },
});