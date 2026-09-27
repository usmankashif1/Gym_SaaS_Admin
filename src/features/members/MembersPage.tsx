import { useRouter } from "expo-router";
import { Check, Pencil, Search, UserPlus, UserRoundCheck, UsersRound, X } from "lucide-react-native";
import { useDeferredValue, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { PAGE_SIZE } from "@/constants/pagination";
import { useMembers } from "@/hooks/useMembers";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import type { MemberInput } from "@/services/memberService";
import { colors, radii } from "@/theme/tokens";
import type { Member, MembershipPlan } from "@/types/domain";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function MembersPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(0);
  const [dialogMember, setDialogMember] = useState<Member | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const router = useRouter();
  const { members, total, loading, error, addMember, saveMember, checkInMember, checkingInIds, checkedInIds } = useMembers(deferredSearch, page);
  const { plans, loading: plansLoading, error: plansError } = useMembershipPlans(true);
  const { width } = useWindowDimensions();
  const compact = width < 560;

  const openAdd = () => {
    setDialogMember(null);
    setSaveError("");
    setDialogOpen(true);
  };

  const openEdit = (member: Member) => {
    setDialogMember(member);
    setSaveError("");
    setDialogOpen(true);
  };

  const submitMember = async (input: MemberInput, memberId?: string) => {
    setSaving(true);
    setSaveError("");
    try {
      if (memberId) await saveMember(memberId, input);
      else {
        await addMember(input);
        setSearch("");
        setPage(0);
      }
      setDialogOpen(false);
      setDialogMember(null);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not save this member.");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async (member: Member) => {
    setCheckInError("");
    try {
      await checkInMember(member.id);
    } catch (caught) {
      setCheckInError(caught instanceof Error ? caught.message : "Could not check in this member.");
    }
  };

  return (
    <AppShell
      title="Members"
      subtitle="View and manage your gym memberships."
      action={<Button onPress={openAdd} icon={<UserPlus size={15} color="#FFFFFF" />}>Add member</Button>}
    >
      <Surface>
        <View style={styles.listToolbar}>
          <View style={styles.countBlock}>
            {loading ? <Skeleton style={styles.countSkeleton} /> : <Text style={styles.memberCount}>{total.toLocaleString()}</Text>}
            <Text style={styles.countLabel}>members</Text>
          </View>
          <View style={styles.searchBox}>
            <Search size={15} color={colors.muted} />
            <TextInput
              accessibilityLabel="Search members"
              placeholder="Search members"
              placeholderTextColor="#89948D"
              value={search}
              onChangeText={(value) => { setSearch(value); setPage(0); }}
              style={styles.searchInput}
            />
            {search ? <Pressable accessibilityLabel="Clear search" onPress={() => setSearch("")}><X size={15} color={colors.muted} /></Pressable> : null}
          </View>
        </View>
        {plansError || checkInError ? <Text style={styles.errorText}>{plansError || checkInError}</Text> : null}
        {!compact ? <MemberTableHeader /> : null}
        {loading ? (
          <View style={styles.skeletonList}>{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} style={styles.memberSkeleton} />)}</View>
        ) : error ? (
          <EmptyState icon={<UsersRound size={18} color={colors.coral} />} title="Members unavailable" description={error} />
        ) : members.length ? (
          <View>{members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              compact={compact}
              checkingIn={checkingInIds.has(member.id)}
              checkedIn={checkedInIds.has(member.id)}
              onEdit={() => openEdit(member)}
              onCheckIn={() => void handleCheckIn(member)}
            />
          ))}</View>
        ) : (
          <EmptyState
            icon={<UsersRound size={18} color={colors.green} />}
            title={search ? "No matching members" : "No members yet"}
            description={search ? "Try another name, email, or plan." : "Add your first member to start building your roster."}
          />
        )}
        {!loading ? <Pagination page={page} total={total} pageSize={PAGE_SIZE} onPageChange={setPage} /> : null}
      </Surface>
      {dialogOpen ? (
        <MemberDialog
          key={dialogMember?.id ?? "new-member"}
          member={dialogMember}
          plans={plans}
          plansLoading={plansLoading}
          saving={saving}
          error={saveError}
          onClose={() => { setDialogOpen(false); setDialogMember(null); }}
          onGoToPlans={() => { setDialogOpen(false); router.push("/subscription"); }}
          onSave={submitMember}
        />
      ) : null}
    </AppShell>
  );
}

function MemberTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerCell, styles.memberColumn]}>MEMBER</Text>
      <Text style={[styles.headerCell, styles.planColumn]}>PLAN</Text>
      <Text style={[styles.headerCell, styles.joinedColumn]}>JOINED</Text>
      <Text style={[styles.headerCell, styles.statusColumn]}>STATUS</Text>
      <View style={styles.actionsColumn} />
    </View>
  );
}

function MemberRow({ member, compact, checkingIn, checkedIn, onEdit, onCheckIn }: { member: Member; compact: boolean; checkingIn: boolean; checkedIn: boolean; onEdit: () => void; onCheckIn: () => void }) {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={styles.memberRow}>
      <View style={[styles.memberColumn, styles.identityColumn]}>
        <View style={styles.memberAvatar}><Text style={styles.memberInitials}>{initials}</Text></View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
          <Text numberOfLines={1} style={styles.memberEmail}>{member.email || member.phone}</Text>
        </View>
      </View>
      <View style={styles.planColumn}>
        <Text numberOfLines={1} style={styles.cellText}>{member.plan}</Text>
        {member.planPrice !== null ? <Text style={styles.planPrice}>{currency.format(member.planPrice)} / mo</Text> : null}
        {compact ? <Text style={styles.mobileDate}>Joined {formatDate(member.joinedAt)}</Text> : null}
      </View>
      {!compact ? <Text style={[styles.cellText, styles.joinedColumn]}>{formatDate(member.joinedAt)}</Text> : null}
      <View style={styles.statusColumn}><StatusBadge label={member.status === "active" ? "Active" : "Inactive"} tone={member.status === "active" ? "green" : "neutral"} /></View>
      <View style={[styles.rowActions, compact && styles.compactRowActions]}>
        <Pressable
          accessibilityLabel={checkedIn ? `${member.name} checked in today` : `Check in ${member.name}`}
          accessibilityRole="button"
          disabled={member.status !== "active" || checkingIn || checkedIn}
          onPress={onCheckIn}
          style={[styles.checkInButton, (checkingIn || checkedIn) && styles.checkInCompleted, member.status !== "active" && styles.disabledAction]}
        >
          {checkingIn ? <Text style={styles.checkInLabel}>...</Text> : checkedIn ? <Check size={14} color={colors.green} /> : <UserRoundCheck size={14} color={member.status === "active" ? colors.green : colors.muted} />}
          {!compact ? <Text style={[styles.checkInLabel, checkedIn && styles.checkInLabelCompleted]}>{checkingIn ? "Saving" : checkedIn ? "Checked in" : "Check in"}</Text> : null}
        </Pressable>
        <Pressable accessibilityLabel={`Edit ${member.name}`} accessibilityRole="button" onPress={onEdit} style={styles.editButton}><Pencil size={14} color={colors.muted} /></Pressable>
      </View>
    </View>
  );
}

function MemberDialog({ member, plans, plansLoading, saving, error, onClose, onGoToPlans, onSave }: {
  member: Member | null;
  plans: MembershipPlan[];
  plansLoading: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onGoToPlans: () => void;
  onSave: (input: MemberInput, memberId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [planId, setPlanId] = useState(member?.planId ?? "");
  const [validationError, setValidationError] = useState("");
  const availablePlans = plans.filter((plan) => plan.isActive || plan.id === member?.planId);
  const selectedPlan = availablePlans.find((plan) => plan.id === planId) ?? availablePlans[0] ?? null;

  const submit = () => {
    if (!name.trim()) { setValidationError("Enter the member’s name."); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setValidationError("Enter a valid email address."); return; }
    if (!selectedPlan) { setValidationError("Create an active membership plan before adding a member."); return; }
    setValidationError("");
    void onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), planId: selectedPlan.id }, member?.id);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBackdrop} keyboardShouldPersistTaps="handled">
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>{member ? "Edit member" : "Add member"}</Text><Text style={styles.dialogSubtitle}>{member ? "Update this member’s details and plan." : "Add a member and record their first payment."}</Text></View>
            <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
          <DialogField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" />
          <DialogField label="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <Text style={styles.fieldLabel}>Membership plan</Text>
          {plansLoading ? <Skeleton style={styles.planSkeleton} /> : availablePlans.length ? (
            <View style={styles.planPicker}>
              {availablePlans.map((plan) => {
                const selected = (selectedPlan?.id ?? planId) === plan.id;
                return (
                  <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPlanId(plan.id)} style={[styles.planOption, selected && styles.planOptionSelected]}>
                    <Text style={[styles.planOptionText, selected && styles.planOptionTextSelected]}>{plan.name} · {currency.format(plan.price)}/mo</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.noPlans}>
              <Text style={styles.noPlansText}>No active membership plans yet.</Text>
              <Button variant="secondary" onPress={onGoToPlans}>Manage plans</Button>
            </View>
          )}
          {!member && selectedPlan ? <Text style={styles.initialPayment}>Initial payment: {currency.format(selectedPlan.price)} · recorded as paid</Text> : null}
          {validationError || error ? <Text style={styles.errorText}>{validationError || error}</Text> : null}
          <View style={styles.dialogActions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button disabled={saving || plansLoading || !selectedPlan} onPress={submit}>{saving ? "Saving..." : member ? "Save changes" : "Add & record payment"}</Button>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

function DialogField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.dialogField}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#89948D" style={styles.dialogInput} /></View>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
  listToolbar: { minHeight: 75, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  countBlock: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  countSkeleton: { width: 30, height: 21 },
  memberCount: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  countLabel: { color: colors.muted, fontSize: 11 },
  searchBox: { width: 250, maxWidth: "62%", minHeight: 37, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 12 },
  tableHeader: { minHeight: 37, backgroundColor: "#F8FAF8", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  headerCell: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.6 },
  memberColumn: { flex: 2, minWidth: 0 },
  planColumn: { flex: 1, minWidth: 90 },
  joinedColumn: { width: 105 },
  statusColumn: { width: 82, alignItems: "flex-start" },
  actionsColumn: { width: 96 },
  memberRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: "#EEF1EF", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8 },
  identityColumn: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.green, fontSize: 10, fontWeight: "700" },
  identityCopy: { flex: 1, minWidth: 0, gap: 3 },
  memberName: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  memberEmail: { color: colors.muted, fontSize: 10 },
  cellText: { color: colors.ink, fontSize: 11 },
  planPrice: { color: colors.muted, fontSize: 9, marginTop: 4 },
  mobileDate: { color: colors.muted, fontSize: 9, marginTop: 4 },
  rowActions: { width: 96, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
  compactRowActions: { width: 60 },
  checkInButton: { minHeight: 31, minWidth: 31, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radii.small, paddingHorizontal: 5 },
  checkInCompleted: { backgroundColor: colors.greenSoft },
  disabledAction: { opacity: 0.5 },
  checkInLabel: { color: colors.green, fontSize: 9, fontWeight: "600" },
  checkInLabelCompleted: { color: colors.green },
  editButton: { width: 30, height: 32, borderRadius: radii.small, alignItems: "center", justifyContent: "center" },
  skeletonList: { paddingHorizontal: 18, paddingVertical: 8, gap: 10 },
  memberSkeleton: { height: 49 },
  errorText: { color: colors.coral, fontSize: 11, paddingHorizontal: 18, paddingVertical: 8 },
  modalScroll: { flex: 1 },
  modalBackdrop: { flexGrow: 1, padding: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(19, 34, 26, 0.42)" },
  dialog: { width: "100%", maxWidth: 480, padding: 24, backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line },
  dialogHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  dialogTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  dialogSubtitle: { color: colors.muted, fontSize: 11, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  dialogField: { gap: 6, marginBottom: 14 },
  fieldLabel: { color: colors.ink, fontSize: 11, fontWeight: "600", marginBottom: 7 },
  dialogInput: { height: 40, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 12, color: colors.ink },
  planPicker: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 4 },
  planSkeleton: { height: 35, marginBottom: 6 },
  noPlans: { alignItems: "flex-start", gap: 10, marginBottom: 8 },
  noPlansText: { color: colors.muted, fontSize: 11 },
  planOption: { minHeight: 33, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small },
  planOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  planOptionText: { color: colors.muted, fontSize: 10, fontWeight: "500" },
  planOptionTextSelected: { color: colors.green, fontWeight: "700" },
  initialPayment: { color: colors.green, fontSize: 10, marginTop: 11 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 20 },
});