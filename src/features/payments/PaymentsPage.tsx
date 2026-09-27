import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, CreditCard } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { PAGE_SIZE } from "@/constants/pagination";
import { usePayments, type PaymentView } from "@/hooks/usePayments";
import { colors } from "@/theme/tokens";
import type { Payment } from "@/types/domain";

const tabs: { id: PaymentView; label: string }[] = [
    { id: "today", label: "Due Today" },
    { id: "overdue", label: "Overdue" },
    { id: "history", label: "Payment History" },
];

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function PaymentsPage() {
    const params = useLocalSearchParams<{ view?: string }>();
    const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
    const view: PaymentView = requestedView === "overdue" || requestedView === "history" ? requestedView : "today";
    const router = useRouter();
    const [pagination, setPagination] = useState<{ view: PaymentView; page: number }>({ view: "today", page: 0 });
    const page = pagination.view === view ? pagination.page : 0;
    const [savingId, setSavingId] = useState("");
    const [actionError, setActionError] = useState("");
    const { payments, total, loading, error, markPaid } = usePayments(view, page);
    const { width } = useWindowDimensions();
    const compact = width < 650;

    const record = async (paymentId: string) => {
        setSavingId(paymentId);
        setActionError("");
        try {
            await markPaid(paymentId);
        } catch (caught) {
            setActionError(caught instanceof Error ? caught.message : "Could not record this payment.");
        } finally {
            setSavingId("");
        }
    };

    return (
        <AppShell title="Payments" subtitle="Track what’s due and keep your records up to date.">
            <View style={styles.tabRow}>
                {tabs.map((tab) => (
                    <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: view === tab.id }} onPress={() => router.push(`/payments?view=${tab.id}`)} style={[styles.tab, view === tab.id && styles.tabSelected]}>
                        <Text style={[styles.tabText, view === tab.id && styles.tabTextSelected]}>{tab.label}</Text>
                    </Pressable>
                ))}
            </View>
            <Surface>
                <View style={styles.listHeader}>
                    <View style={styles.listHeaderCopy}>
                        <Text style={styles.listTitle}>{view === "today" ? "Payments due today" : view === "overdue" ? "Overdue payments" : "Payment history"}</Text>
                        {loading ? <Skeleton style={styles.headerCountSkeleton} /> : <Text style={styles.listSubtitle}>{total} {total === 1 ? "payment" : "payments"}</Text>}
                    </View>
                    {loading ? <Skeleton style={styles.headerBadgeSkeleton} /> : <StatusBadge label={view === "history" ? "Completed" : view === "overdue" ? "Past due" : "Due today"} tone={view === "history" ? "green" : view === "overdue" ? "coral" : "amber"} />}
                </View>
                {error || actionError ? <Text style={styles.errorText}>{error || actionError}</Text> : null}
                {!compact ? <PaymentTableHeader history={view === "history"} /> : null}
                {loading ? (
                    <View style={styles.skeletonList}>{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} style={styles.paymentSkeleton} />)}</View>
                ) : error ? (
                    <EmptyState icon={<CreditCard size={18} color={colors.coral} />} title="Payments unavailable" description={error} />
                ) : payments.length ? (
                    <View>
                        {payments.map((payment) => <PaymentRow key={payment.id} payment={payment} compact={compact} history={view === "history"} busy={savingId === payment.id} onRecord={() => void record(payment.id)} />)}
                    </View>
                ) : (
                    <EmptyState
                        icon={<CreditCard size={18} color={colors.green} />}
                        title={view === "today" ? "All clear for today" : view === "overdue" ? "No overdue payments" : "No payment history yet"}
                        description={view === "today" ? "There are no membership payments due today." : view === "overdue" ? "No member payments need follow-up right now." : "Recorded member payments will appear here."}
                    />
                )}
                {!loading ? <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={(nextPage) => setPagination({ view, page: nextPage })} /> : null}
            </Surface>
        </AppShell>
    );
}

function PaymentTableHeader({ history }: { history: boolean }) {
    return (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.paymentMember]}>MEMBER</Text>
            <Text style={[styles.headerCell, styles.dueDate]}>{history ? "PAID ON" : "DUE DATE"}</Text>
            <Text style={[styles.headerCell, styles.amount]}>AMOUNT</Text>
            <Text style={[styles.headerCell, styles.status]}>STATUS</Text>
            <View style={styles.actionSpace} />
        </View>
    );
}

function PaymentRow({ payment, compact, history, busy, onRecord }: { payment: Payment; compact: boolean; history: boolean; busy: boolean; onRecord: () => void }) {
    return (
        <View style={styles.paymentRow}>
            <View style={styles.paymentMember}>
                <Text numberOfLines={1} style={styles.memberName}>{payment.memberName}</Text>
                {payment.membershipPlanName ? <Text numberOfLines={1} style={styles.planName}>{payment.membershipPlanName}</Text> : null}
                {compact ? <Text style={styles.mobileInfo}>{history ? "Paid" : payment.status === "overdue" ? "Overdue" : "Due today"} · {formatDate(history && payment.paidAt ? payment.paidAt.slice(0, 10) : payment.dueDate)}</Text> : null}
            </View>
            {!compact ? <Text style={[styles.cellText, styles.dueDate]}>{formatDate(history && payment.paidAt ? payment.paidAt.slice(0, 10) : payment.dueDate)}</Text> : null}
            <Text style={[styles.amountText, styles.amount]}>{currency.format(payment.amount)}</Text>
            {!compact ? <View style={styles.status}><StatusBadge label={history ? "Paid" : payment.status === "overdue" ? "Overdue" : "Due today"} tone={history ? "green" : payment.status === "overdue" ? "coral" : "amber"} /></View> : null}
            <View style={styles.actionSpace}>
                {history ? <Text style={styles.recordedLabel}>Recorded</Text> : (
                    <Button variant="secondary" disabled={busy} onPress={onRecord} icon={<Check size={14} color={colors.green} />}>
                        {busy ? "Saving..." : compact ? "Paid" : "Record payment"}
                    </Button>
                )}
            </View>
        </View>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
    tabRow: { flexDirection: "row", alignSelf: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.line, gap: 22, marginTop: -5 },
    tab: { minHeight: 40, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", paddingHorizontal: 1 },
    tabSelected: { borderBottomColor: colors.green },
    tabText: { color: colors.muted, fontSize: 12, fontWeight: "500" },
    tabTextSelected: { color: colors.green, fontWeight: "700" },
    listHeader: { minHeight: 75, paddingHorizontal: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 },
    listHeaderCopy: { gap: 4 },
    listTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
    listSubtitle: { color: colors.muted, fontSize: 10 },
    headerCountSkeleton: { width: 75, height: 12, marginTop: 2 },
    headerBadgeSkeleton: { width: 62, height: 23 },
    tableHeader: { minHeight: 37, backgroundColor: "#F8FAF8", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
    headerCell: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
    paymentMember: { flex: 1, minWidth: 100 },
    dueDate: { width: 115 },
    amount: { width: 88 },
    status: { width: 100 },
    actionSpace: { width: 138, alignItems: "flex-end" },
    paymentRow: { minHeight: 64, borderBottomWidth: 1, borderBottomColor: "#EEF1EF", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 9 },
    memberName: { color: colors.ink, fontSize: 12, fontWeight: "600" },
    planName: { color: colors.muted, fontSize: 10, marginTop: 3 },
    mobileInfo: { color: colors.muted, fontSize: 9, marginTop: 4 },
    cellText: { color: colors.ink, fontSize: 11 },
    amountText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
    recordedLabel: { color: colors.muted, fontSize: 10 },
    errorText: { color: colors.coral, fontSize: 11, paddingHorizontal: 18, paddingBottom: 8 },
    skeletonList: { paddingHorizontal: 18, paddingVertical: 8, gap: 10 },
    paymentSkeleton: { height: 47 },
});