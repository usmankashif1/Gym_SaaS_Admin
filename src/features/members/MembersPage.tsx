import { useRouter } from "expo-router";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, Search, Trash2, UserPlus, UserRoundCheck, UsersRound, X } from "lucide-react-native";
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
import type { MemberInput, NewMemberInput } from "@/services/memberService";
import { colors, radii } from "@/theme/tokens";
import type { Member, MembershipPlan } from "@/types/domain";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
type MemberFormInput = MemberInput & { signupDate?: string };

export function MembersPage() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(0);
  const [dialogMember, setDialogMember] = useState<Member | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState<{ message: string; success: boolean } | null>(null);
  const [checkInError, setCheckInError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { members, total, loading, error, addMember, saveMember, removeMember, checkInMember, checkingInIds, checkedInIds } = useMembers(deferredSearch, page);
  const { plans, admissionFee, loading: plansLoading, error: plansError } = useMembershipPlans(true);
  const { width } = useWindowDimensions();
  const compact = width < 560;

  const openAdd = () => {
    setDialogMember(null);
    setSaveError("");
    setNotice(null);
    setDialogOpen(true);
  };

  const openEdit = (member: Member) => {
    setDialogMember(member);
    setSaveError("");
    setDialogOpen(true);
  };

  const submitMember = async (input: MemberFormInput, memberId?: string) => {
    setSaving(true);
    setSaveError("");
    try {
      if (memberId) await saveMember(memberId, input);
      else {
        if (!input.signupDate) throw new Error("Choose a signup date.");
        await addMember({ ...input, signupDate: input.signupDate } satisfies NewMemberInput);
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

  const confirmDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await removeMember(deleteTarget.id);
      setNotice({ message: `${deleteTarget.name} and their payment records were deleted.`, success: true });
      setPage((current) => members.length === 1 && current > 0 ? current - 1 : current);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "Could not delete this member.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell
      title="Members"
      subtitle="View and manage your gym memberships."
      action={<Button onPress={openAdd} icon={<UserPlus size={15} color="#FFFFFF" />}>Add member</Button>}
    >
      {notice ? <Text accessibilityRole="alert" style={notice.success ? styles.notice : styles.errorText}>{notice.message}</Text> : null}
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
              onDelete={() => { setDeleteTarget(member); setDeleteError(""); }}
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
          admissionFee={admissionFee}
          plansLoading={plansLoading}
          saving={saving}
          error={saveError}
          onClose={() => { setDialogOpen(false); setDialogMember(null); }}
          onGoToPlans={() => { setDialogOpen(false); router.push("/subscription"); }}
          onSave={submitMember}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteMemberDialog
          member={deleteTarget}
          busy={deleting}
          error={deleteError}
          onClose={() => { if (!deleting) { setDeleteTarget(null); setDeleteError(""); } }}
          onConfirm={confirmDeleteMember}
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

function MemberRow({ member, compact, checkingIn, checkedIn, onEdit, onCheckIn, onDelete }: { member: Member; compact: boolean; checkingIn: boolean; checkedIn: boolean; onEdit: () => void; onCheckIn: () => void; onDelete: () => void }) {
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
        <Pressable accessibilityLabel={`Delete ${member.name}`} accessibilityRole="button" onPress={onDelete} style={styles.deleteButton}><Trash2 size={14} color={colors.coral} /></Pressable>
      </View>
    </View>
  );
}

function DeleteMemberDialog({ member, busy, error, onClose, onConfirm }: { member: Member; busy: boolean; error: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>Delete member?</Text>
          <Text style={styles.deleteWarning}>Delete {member.name} and all of their payment records? This cannot be undone.</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.dialogActions}>
            <Button variant="secondary" disabled={busy} onPress={onClose}>Cancel</Button>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void onConfirm()} style={[styles.deleteConfirmButton, busy && styles.disabledAction]}>
              <Text style={styles.deleteConfirmLabel}>{busy ? "Deleting..." : "Delete member"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MemberDialog({ member, plans, admissionFee, plansLoading, saving, error, onClose, onGoToPlans, onSave }: {
  member: Member | null;
  plans: MembershipPlan[];
  admissionFee: number | null;
  plansLoading: boolean;
  saving: boolean;
  error: string;
  onClose: () => void;
  onGoToPlans: () => void;
  onSave: (input: MemberFormInput, memberId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [planId, setPlanId] = useState(member?.planId ?? "");
  const [admissionFeeEnabled, setAdmissionFeeEnabled] = useState<boolean | null>(null);
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState<string | null>(null);
  const [signupDate, setSignupDate] = useState(member?.joinedAt ?? getTodayDate());
  const [validationError, setValidationError] = useState("");
  const availablePlans = plans.filter((plan) => plan.isActive || plan.id === member?.planId);
  const selectedPlan = availablePlans.find((plan) => plan.id === planId) ?? availablePlans[0] ?? null;
  const includeAdmissionFee = admissionFeeEnabled ?? (admissionFee !== null && admissionFee > 0);
  const admissionFeeText = admissionFeeAmount ?? (admissionFee === null ? "" : String(admissionFee));

  const submit = () => {
    if (!name.trim()) { setValidationError("Enter the member’s name."); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setValidationError("Enter a valid email address."); return; }
    if (!selectedPlan) { setValidationError("Create an active membership plan before adding a member."); return; }
    if (!member && (!isValidDateOnly(signupDate) || signupDate > getTodayDate())) {
      setValidationError("Choose a valid signup date no later than today.");
      return;
    }
    const parsedAdmissionFee = includeAdmissionFee ? Number(admissionFeeText) : 0;
    if (!member && includeAdmissionFee && (!Number.isFinite(parsedAdmissionFee) || parsedAdmissionFee <= 0)) {
      setValidationError("Enter an admission fee greater than zero, or turn it off.");
      return;
    }
    setValidationError("");
    void onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), planId: selectedPlan.id, admissionFee: member ? undefined : parsedAdmissionFee, ...(member ? {} : { signupDate }) }, member?.id);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBackdrop} keyboardShouldPersistTaps="handled">
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>{member ? "Edit member" : "Add member"}</Text><Text style={styles.dialogSubtitle}>{member ? "Update this member’s details and plan." : "Add a member and record signup payments."}</Text></View>
            <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
          <DialogField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" />
          <DialogField label="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          {!member ? <SignupDatePicker value={signupDate} onChange={setSignupDate} maxDate={getTodayDate()} /> : null}
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
          {!member ? (
            <View style={styles.admissionFeeSection}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: includeAdmissionFee }}
                onPress={() => setAdmissionFeeEnabled(!includeAdmissionFee)}
                style={styles.admissionFeeToggle}
              >
                <View style={[styles.checkbox, includeAdmissionFee && styles.checkboxSelected]}>
                  {includeAdmissionFee ? <Check size={12} color="#FFFFFF" /> : null}
                </View>
                <Text style={styles.admissionFeeToggleLabel}>Charge admission fee</Text>
                <Text style={styles.admissionFeeToggleValue}>{includeAdmissionFee ? currency.format(Number(admissionFeeText) || 0) : "Waived"}</Text>
              </Pressable>
              {includeAdmissionFee ? <DialogField label="Admission fee" value={admissionFeeText} onChangeText={setAdmissionFeeAmount} placeholder="0.00" keyboardType="decimal-pad" /> : null}
            </View>
          ) : null}
          {!member && selectedPlan ? <Text style={styles.initialPayment}>Membership payment: {currency.format(selectedPlan.price)} · recorded as paid</Text> : null}
          {!member && includeAdmissionFee && Number(admissionFeeText) > 0 ? <Text style={styles.initialPayment}>Admission fee: {currency.format(Number(admissionFeeText))} · recorded as paid</Text> : null}
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

function SignupDatePicker({ value, onChange, maxDate }: { value: string; onChange: (value: string) => void; maxDate: string }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(value.slice(0, 7));
  const todayMonth = maxDate.slice(0, 7);
  const days = getCalendarDays(visibleMonth);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));

  const changeMonth = (offset: number) => setVisibleMonth((month) => shiftMonth(month, offset));

  return (
    <View style={styles.signupDateSection}>
      <Text style={styles.fieldLabel}>Signup date</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Signup date ${formatDate(value)}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.signupDateButton}>
        <CalendarDays size={16} color={colors.green} />
        <Text style={styles.signupDateValue}>{formatDate(value)}</Text>
        <ChevronDown size={16} color={colors.muted} />
      </Pressable>
      {open ? (
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeading}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={visibleMonth <= "0001-01"} onPress={() => changeMonth(-1)} style={styles.calendarArrow}>
              <ChevronLeft size={18} color={visibleMonth <= "0001-01" ? colors.line : colors.ink} />
            </Pressable>
            <Text style={styles.calendarMonth}>{formatMonth(visibleMonth)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={visibleMonth >= todayMonth} onPress={() => changeMonth(1)} style={styles.calendarArrow}>
              <ChevronRight size={18} color={visibleMonth >= todayMonth ? colors.line : colors.ink} />
            </Pressable>
          </View>
          <View style={styles.calendarWeek}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={`${visibleMonth}-week-${weekIndex}`} style={styles.calendarWeek}>
              {week.map((date, dayIndex) => {
                const selected = date === value;
                const future = date !== null && date > maxDate;
                return date ? (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={formatDate(date)}
                    accessibilityState={{ selected, disabled: future }}
                    disabled={future}
                    onPress={() => { onChange(date); setVisibleMonth(date.slice(0, 7)); setOpen(false); }}
                    style={[styles.calendarDay, selected && styles.calendarDaySelected, future && styles.calendarDayDisabled]}
                  >
                    <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected, future && styles.calendarDayTextDisabled]}>{Number(date.slice(8, 10))}</Text>
                  </Pressable>
                ) : <View key={`${visibleMonth}-blank-${weekIndex}-${dayIndex}`} style={styles.calendarDay} />;
              })}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  return day <= getDaysInMonth(year, month);
}

function makeUtcDate(year: number, monthIndex: number, day: number) {
  const date = new Date(0);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

function getDaysInMonth(year: number, month: number) {
  return makeUtcDate(year, month, 0).getUTCDate();
}

function getCalendarDays(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstWeekday = makeUtcDate(year, month - 1, 1).getUTCDay();
  const dayCount = getDaysInMonth(year, month);
  const days: (string | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= dayCount; day += 1) days.push(`${monthValue}-${String(day).padStart(2, "0")}`);
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function shiftMonth(monthValue: string, offset: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const shifted = makeUtcDate(year, month - 1 + offset, 1);
  return `${String(shifted.getUTCFullYear()).padStart(4, "0")}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(monthValue: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${monthValue}-01T12:00:00Z`));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
  listToolbar: { minHeight: 75, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  countBlock: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  countSkeleton: { width: 30, height: 21 },
  memberCount: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  countLabel: { color: colors.muted, fontSize: 14 },
  searchBox: { width: 250, maxWidth: "62%", minHeight: 37, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14 },
  tableHeader: { minHeight: 37, backgroundColor: "#F8FAF8", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingHorizontal: 18, flexDirection: "row", alignItems: "center" },
  headerCell: { color: colors.muted, fontSize: 14, fontWeight: "700", letterSpacing: 0.6 },
  memberColumn: { flex: 2, minWidth: 0 },
  planColumn: { flex: 1, minWidth: 90 },
  joinedColumn: { width: 105 },
  statusColumn: { width: 82, alignItems: "flex-start", marginRight: 32 },
  actionsColumn: { width: 142 },
  memberRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: "#EEF1EF", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8 },
  identityColumn: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberAvatar: { width: 34, height: 34, borderRadius: 18, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.green, fontSize: 14, fontWeight: "700" },
  identityCopy: { flex: 1, minWidth: 0, gap: 3 },
  memberName: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  memberEmail: { color: colors.muted, fontSize: 14 },
  cellText: { color: colors.ink, fontSize: 14 },
  planPrice: { color: colors.muted, fontSize: 14, marginTop: 4 },
  mobileDate: { color: colors.muted, fontSize: 14, marginTop: 4 },
  rowActions: { width: 142, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3 },
  compactRowActions: { width: 96 },
  checkInButton: { minHeight: 31, minWidth: 31, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderRadius: radii.small, paddingHorizontal: 5 },
  checkInCompleted: { backgroundColor: colors.greenSoft },
  disabledAction: { opacity: 0.5 },
  checkInLabel: { color: colors.green, fontSize: 14, fontWeight: "600" },
  checkInLabelCompleted: { color: colors.green },
  editButton: { width: 30, height: 32, borderRadius: radii.small, alignItems: "center", justifyContent: "center" },
  deleteButton: { width: 30, height: 32, borderRadius: radii.small, alignItems: "center", justifyContent: "center" },
  skeletonList: { paddingHorizontal: 18, paddingVertical: 8, gap: 10 },
  memberSkeleton: { height: 49 },
  errorText: { color: colors.coral, fontSize: 14, paddingHorizontal: 18, paddingVertical: 8 },
  notice: { color: colors.green, fontSize: 14, paddingHorizontal: 18, paddingVertical: 8 },
  deleteWarning: { color: colors.muted, fontSize: 14, marginTop: 10 },
  deleteConfirmButton: { minHeight: 40, justifyContent: "center", alignItems: "center", borderRadius: radii.small, backgroundColor: colors.coral, paddingHorizontal: 14 },
  deleteConfirmLabel: { color: colors.surface, fontSize: 14, fontWeight: "600" },
  modalScroll: { flex: 1 },
  modalBackdrop: { flexGrow: 1, padding: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(19, 34, 26, 0.42)" },
  dialog: { width: "100%", maxWidth: 480, padding: 24, backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line },
  dialogHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  dialogTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  dialogSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  dialogField: { gap: 6, marginBottom: 14 },
  signupDateSection: { marginBottom: 14 },
  signupDateButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10 },
  signupDateValue: { flex: 1, color: colors.ink, fontSize: 14 },
  calendarPanel: { marginTop: 7, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, backgroundColor: colors.surface },
  calendarHeading: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarArrow: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  calendarMonth: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  calendarWeek: { flexDirection: "row", justifyContent: "space-around" },
  calendarWeekday: { flex: 1, height: 32, textAlign: "center", textAlignVertical: "center", color: colors.muted, fontSize: 14, fontWeight: "600" },
  calendarDay: { flex: 1, minWidth: 0, height: 36, alignItems: "center", justifyContent: "center", borderRadius: radii.small },
  calendarDaySelected: { backgroundColor: colors.green },
  calendarDayDisabled: { opacity: 0.45 },
  calendarDayText: { color: colors.ink, fontSize: 14 },
  calendarDayTextSelected: { color: colors.surface, fontWeight: "700" },
  calendarDayTextDisabled: { color: colors.muted },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: "600", marginBottom: 7 },
  dialogInput: { height: 40, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 14, color: colors.ink },
  planPicker: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 4 },
  planSkeleton: { height: 35, marginBottom: 6 },
  noPlans: { alignItems: "flex-start", gap: 10, marginBottom: 8 },
  noPlansText: { color: colors.muted, fontSize: 14 },
  planOption: { minHeight: 33, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small },
  planOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  planOptionText: { color: colors.muted, fontSize: 14, fontWeight: "500" },
  planOptionTextSelected: { color: colors.green, fontWeight: "700" },
  admissionFeeSection: { marginTop: 12 },
  admissionFeeToggle: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 9 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: colors.muted, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { borderColor: colors.green, backgroundColor: colors.green },
  admissionFeeToggleLabel: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
  admissionFeeToggleValue: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  initialPayment: { color: colors.green, fontSize: 14, marginTop: 11 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 20 },
});