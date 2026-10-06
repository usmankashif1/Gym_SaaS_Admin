import { useFocusEffect, useRouter } from "expo-router";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Filter, Pencil, Search, Trash2, UserPlus, UserRoundCheck, UsersRound, X } from "lucide-react-native";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { MEMBER_PAGE_SIZE } from "@/constants/pagination";
import { useMembers } from "@/hooks/useMembers";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import { createDayPass, listDayPasses, type DayPass } from "@/services/dayPassService";
import { createMember, type MemberInput, type MemberSortDirection, type MemberSortKey, type NewMemberInput } from "@/services/memberService";
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
  const [sort, setSort] = useState<{ key: MemberSortKey; direction: MemberSortDirection }>({ key: "joined", direction: "desc" });
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [joinedFrom, setJoinedFrom] = useState<string | null>(null);
  const [joinedThrough, setJoinedThrough] = useState<string | null>(null);
  const [planFilter, setPlanFilter] = useState<string | null>(null);
  const [draftStatusFilter, setDraftStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [draftJoinedFrom, setDraftJoinedFrom] = useState<string | null>(null);
  const [draftJoinedThrough, setDraftJoinedThrough] = useState<string | null>(null);
  const [draftPlanFilter, setDraftPlanFilter] = useState<string | null>(null);
  const [statusFilterOpen, setStatusFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"membership" | "day-pass">("membership");
  const [dayPasses, setDayPasses] = useState<DayPass[]>([]);
  const [dayPassPage, setDayPassPage] = useState(0);
  const [dayPassLoading, setDayPassLoading] = useState(false);
  const [dayPassLoadError, setDayPassLoadError] = useState("");
  const [dayPassFiltersOpen, setDayPassFiltersOpen] = useState(false);
  const [dayPassDateFrom, setDayPassDateFrom] = useState<string | null>(null);
  const [dayPassDateThrough, setDayPassDateThrough] = useState<string | null>(null);
  const [dayPassPaymentFilter, setDayPassPaymentFilter] = useState<"all" | DayPass["paymentMethod"]>("all");
  const [dayPassVisitorFilter, setDayPassVisitorFilter] = useState("");
  const [draftDayPassDateFrom, setDraftDayPassDateFrom] = useState<string | null>(null);
  const [draftDayPassDateThrough, setDraftDayPassDateThrough] = useState<string | null>(null);
  const [draftDayPassPaymentFilter, setDraftDayPassPaymentFilter] = useState<"all" | DayPass["paymentMethod"]>("all");
  const [draftDayPassVisitorFilter, setDraftDayPassVisitorFilter] = useState("");
  const router = useRouter();
  const { members, total, loading, error, addMember, saveMember, removeMember, checkInMember, checkingInIds, checkedInIds } = useMembers(deferredSearch, page, sort.key, sort.direction, statusFilter, joinedFrom, joinedThrough, planFilter);
  const { plans, admissionFee, loading: plansLoading, error: plansError } = useMembershipPlans(true);
  const { width } = useWindowDimensions();
  const compact = width < 1000;
  const hasAppliedFilters = statusFilter !== "all" || joinedFrom !== null || joinedThrough !== null || planFilter !== null;
  const hasAppliedDayPassFilters = dayPassDateFrom !== null || dayPassDateThrough !== null || dayPassPaymentFilter !== "all" || Boolean(dayPassVisitorFilter.trim());
  const normalizedDayPassVisitorFilter = dayPassVisitorFilter.trim().toLowerCase();
  const visibleDayPasses = dayPasses.filter((dayPass) =>
    (!dayPassDateFrom || dayPass.visitDate >= dayPassDateFrom)
    && (!dayPassDateThrough || dayPass.visitDate <= dayPassDateThrough)
    && (dayPassPaymentFilter === "all" || dayPass.paymentMethod === dayPassPaymentFilter)
    && (!normalizedDayPassVisitorFilter || [dayPass.visitorName, dayPass.email, dayPass.phone].some((value) => value.toLowerCase().includes(normalizedDayPassVisitorFilter))),
  );
  const pagedDayPasses = visibleDayPasses.slice(dayPassPage * MEMBER_PAGE_SIZE, (dayPassPage + 1) * MEMBER_PAGE_SIZE);

  useFocusEffect(useCallback(() => {
    if (activeTab !== "day-pass") return;
    let current = true;
    setDayPassPage(0);
    setDayPassLoading(true);
    setDayPassLoadError("");
    void listDayPasses()
      .then((result) => { if (current) setDayPasses(result); })
      .catch((caught: unknown) => { if (current) setDayPassLoadError(caught instanceof Error ? caught.message : "Could not load day passes."); })
      .finally(() => { if (current) setDayPassLoading(false); });
    return () => { current = false; };
  }, [activeTab]));

  const toggleFilterPanel = () => {
    if (statusFilterOpen) {
      setStatusFilterOpen(false);
      return;
    }
    setDraftStatusFilter(statusFilter);
    setDraftJoinedFrom(joinedFrom);
    setDraftJoinedThrough(joinedThrough);
    setDraftPlanFilter(planFilter);
    setStatusFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setJoinedFrom(draftJoinedFrom);
    setJoinedThrough(draftJoinedThrough);
    setPlanFilter(draftPlanFilter);
    setPage(0);
    setStatusFilterOpen(false);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setJoinedFrom(null);
    setJoinedThrough(null);
    setPlanFilter(null);
    setDraftStatusFilter("all");
    setDraftJoinedFrom(null);
    setDraftJoinedThrough(null);
    setDraftPlanFilter(null);
    setPage(0);
    setStatusFilterOpen(false);
  };

  const openDayPass = () => {
    setActiveTab("day-pass");
    router.push("/day-pass");
  };

  const toggleDayPassFilterPanel = () => {
    if (dayPassFiltersOpen) { setDayPassFiltersOpen(false); return; }
    setDraftDayPassDateFrom(dayPassDateFrom);
    setDraftDayPassDateThrough(dayPassDateThrough);
    setDraftDayPassPaymentFilter(dayPassPaymentFilter);
    setDraftDayPassVisitorFilter(dayPassVisitorFilter);
    setDayPassFiltersOpen(true);
  };

  const applyDayPassFilters = () => {
    setDayPassDateFrom(draftDayPassDateFrom);
    setDayPassDateThrough(draftDayPassDateThrough);
    setDayPassPaymentFilter(draftDayPassPaymentFilter);
    setDayPassVisitorFilter(draftDayPassVisitorFilter);
    setDayPassPage(0);
    setDayPassFiltersOpen(false);
  };

  const clearDayPassFilters = () => {
    setDayPassDateFrom(null);
    setDayPassDateThrough(null);
    setDayPassPaymentFilter("all");
    setDayPassVisitorFilter("");
    setDraftDayPassDateFrom(null);
    setDraftDayPassDateThrough(null);
    setDraftDayPassPaymentFilter("all");
    setDraftDayPassVisitorFilter("");
    setDayPassPage(0);
    setDayPassFiltersOpen(false);
  };

  const openAdd = () => {
    router.push("/add-member");
  };

  const sortMembers = (key: MemberSortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key ? current.direction === "asc" ? "desc" : "asc" : key === "joined" ? "desc" : "asc",
    }));
    setPage(0);
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
      action={
        <View style={styles.headerActions}>
          <Button onPress={openDayPass} icon={<CalendarDays size={15} color="#FFFFFF" />}>+ Day Pass</Button>
          <Button onPress={openAdd} icon={<UserPlus size={15} color="#FFFFFF" />}>Add member</Button>
        </View>
      }
    >
      {notice ? <Text accessibilityRole="alert" style={notice.success ? styles.notice : styles.errorText}>{notice.message}</Text> : null}
      <Surface>
        <View style={styles.sectionTabs}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeTab === "membership" }} onPress={() => setActiveTab("membership")} style={[styles.subTab, activeTab === "membership" && styles.subTabActive]}>
            <Text style={[styles.subTabText, activeTab === "membership" && styles.subTabTextActive]}>Members</Text>
          </Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: activeTab === "day-pass" }} onPress={() => setActiveTab("day-pass")} style={[styles.subTab, activeTab === "day-pass" && styles.subTabActive]}>
            <Text style={[styles.subTabText, activeTab === "day-pass" && styles.subTabTextActive]}>Day Pass</Text>
          </Pressable>
        </View>
        {activeTab === "membership" ? (
          <>
        <View style={[styles.listToolbar, compact && styles.compactListToolbar, statusFilterOpen && styles.listToolbarOpen]}>
          <View style={styles.countBlock}>
            <View style={styles.countIcon}><UsersRound size={20} color={colors.green} /></View>
            <View style={styles.countCopy}>
              {loading ? <Skeleton style={styles.countSkeleton} /> : <Text style={styles.memberCount}>{total.toLocaleString()}</Text>}
              <Text style={styles.countLabel}>Total Members</Text>
            </View>
          </View>
          <View style={[styles.toolbarControls, compact && styles.compactToolbarControls]}>
            <View style={[styles.searchBox, compact && styles.compactSearchBox]}>
              <Search size={15} color={colors.muted} />
              <TextInput
                accessibilityLabel="Search members"
                placeholder="Search members..."
                placeholderTextColor="#89948D"
                value={search}
                onChangeText={(value) => { setSearch(value); setPage(0); }}
                style={styles.searchInput}
              />
              {search ? <Pressable accessibilityLabel="Clear search" onPress={() => { setSearch(""); setPage(0); }}><X size={15} color={colors.muted} /></Pressable> : null}
            </View>
            <View style={[styles.filterControls, compact && styles.compactFilterControls]}>
              <View style={[styles.statusFilterWrap, compact && styles.compactStatusFilterWrap, statusFilterOpen && styles.statusFilterWrapOpen]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Filter members" accessibilityState={{ expanded: statusFilterOpen }} onPress={toggleFilterPanel} style={styles.statusFilterButton}>
                  <Filter size={15} color={colors.muted} />
                  <Text numberOfLines={1} style={styles.statusFilterLabel}>{statusFilter === "all" ? "All Status" : statusFilter === "active" ? "Active" : "Inactive"}{planFilter ? " · Plan" : ""}{joinedFrom || joinedThrough ? " · Joined" : ""}</Text>
                  <ChevronDown size={15} color={colors.muted} />
                </Pressable>
                {statusFilterOpen ? (
                  <ScrollView style={[styles.statusFilterMenu, { width: Math.min(360, width - 32) }]} contentContainerStyle={styles.statusFilterMenuContent} keyboardShouldPersistTaps="handled">
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Status</Text>
                    {(["all", "active", "inactive"] as const).map((value) => (
                      <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: draftStatusFilter === value }} onPress={() => setDraftStatusFilter(value)} style={styles.filterRadioOption}>
                        <View style={[styles.radioOuter, draftStatusFilter === value && styles.radioOuterSelected]}>{draftStatusFilter === value ? <View style={styles.radioInner} /> : null}</View>
                        <Text style={styles.statusFilterOptionText}>{value === "all" ? "All statuses" : value === "active" ? "Active" : "Inactive"}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Joined date</Text>
                    <SignupDatePicker label="From" value={draftJoinedFrom} onChange={(value) => { setDraftJoinedFrom(value); if (draftJoinedThrough && value > draftJoinedThrough) setDraftJoinedThrough(value); }} onClear={() => setDraftJoinedFrom(null)} maxDate={getTodayDate()} />
                    <SignupDatePicker label="Through" value={draftJoinedThrough} onChange={(value) => { setDraftJoinedThrough(value); if (draftJoinedFrom && value < draftJoinedFrom) setDraftJoinedFrom(value); }} onClear={() => setDraftJoinedThrough(null)} maxDate={getTodayDate()} />
                  </View>
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Membership plan</Text>
                    <Pressable accessibilityRole="radio" accessibilityState={{ checked: draftPlanFilter === null }} onPress={() => setDraftPlanFilter(null)} style={styles.filterRadioOption}>
                      <View style={[styles.radioOuter, draftPlanFilter === null && styles.radioOuterSelected]}>{draftPlanFilter === null ? <View style={styles.radioInner} /> : null}</View>
                      <Text style={styles.statusFilterOptionText}>All plans</Text>
                    </Pressable>
                    {plansLoading ? <Skeleton style={styles.planSkeleton} /> : null}
                    {plans.map((plan) => (
                      <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: draftPlanFilter === plan.id }} onPress={() => setDraftPlanFilter(plan.id)} style={styles.filterRadioOption}>
                        <View style={[styles.radioOuter, draftPlanFilter === plan.id && styles.radioOuterSelected]}>{draftPlanFilter === plan.id ? <View style={styles.radioInner} /> : null}</View>
                        <Text numberOfLines={1} style={styles.filterRadioLabel}>{plan.name} · {currency.format(plan.price)}</Text>
                        {!plan.isActive ? <Text style={styles.inactivePlanLabel}>Inactive</Text> : null}
                      </Pressable>
                    ))}
                    {!plans.length && !plansLoading ? <Text style={styles.filterEmptyText}>No membership plans available.</Text> : null}
                  </View>
                  <View style={styles.filterFooter}>
                    <Pressable accessibilityRole="button" onPress={() => { setDraftStatusFilter("all"); setDraftJoinedFrom(null); setDraftJoinedThrough(null); setDraftPlanFilter(null); }} style={styles.filterClearOption}>
                      <Text style={styles.filterClearText}>Clear selections</Text>
                    </Pressable>
                    <Button onPress={applyFilters}>Apply</Button>
                  </View>
                  </ScrollView>
                ) : null}
              </View>
              {hasAppliedFilters ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear applied filters" onPress={clearFilters} style={styles.clearFiltersButton}>
                  <X size={15} color={colors.green} />
                  <Text style={styles.clearFiltersLabel}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
        {plansError || checkInError ? <Text style={styles.errorText}>{plansError || checkInError}</Text> : null}
        {!compact ? <MemberTableHeader sortKey={sort.key} sortDirection={sort.direction} onSort={sortMembers} /> : null}
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
        {!loading ? <Pagination page={page} total={total} pageSize={MEMBER_PAGE_SIZE} onPageChange={setPage} /> : null}
          </>
        ) : (
          <>
            <View style={[styles.dayPassToolbar, compact && styles.compactDayPassToolbar, dayPassFiltersOpen && styles.dayPassToolbarOpen]}>
              <Text style={styles.dayPassTitle}>Day Pass visitors</Text>
              <View style={[styles.dayPassFilterControls, compact && styles.compactDayPassFilterControls]}>
                <View style={[styles.statusFilterWrap, compact && styles.compactStatusFilterWrap, dayPassFiltersOpen && styles.statusFilterWrapOpen]}>
                  <Pressable accessibilityRole="button" accessibilityLabel="Filter day pass visitors" accessibilityState={{ expanded: dayPassFiltersOpen }} onPress={toggleDayPassFilterPanel} style={styles.statusFilterButton}>
                    <Filter size={15} color={colors.muted} />
                    <Text numberOfLines={1} style={styles.statusFilterLabel}>{hasAppliedDayPassFilters ? "Filters applied" : "All Day Passes"}</Text>
                    <ChevronDown size={15} color={colors.muted} />
                  </Pressable>
                  {dayPassFiltersOpen ? (
                    <ScrollView style={[styles.statusFilterMenu, { width: Math.min(360, width - 32) }]} contentContainerStyle={styles.statusFilterMenuContent} keyboardShouldPersistTaps="handled">
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Visitor</Text>
                        <TextInput accessibilityLabel="Search day pass visitors" placeholder="Name, email, or phone" placeholderTextColor="#89948D" value={draftDayPassVisitorFilter} onChangeText={setDraftDayPassVisitorFilter} style={styles.filterSearchInput} />
                      </View>
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Visit date</Text>
                        <SignupDatePicker label="From" value={draftDayPassDateFrom} onChange={(value) => { setDraftDayPassDateFrom(value); if (draftDayPassDateThrough && value > draftDayPassDateThrough) setDraftDayPassDateThrough(value); }} onClear={() => setDraftDayPassDateFrom(null)} maxDate={getTodayDate()} />
                        <SignupDatePicker label="Through" value={draftDayPassDateThrough} onChange={(value) => { setDraftDayPassDateThrough(value); if (draftDayPassDateFrom && value < draftDayPassDateFrom) setDraftDayPassDateFrom(value); }} onClear={() => setDraftDayPassDateThrough(null)} maxDate={getTodayDate()} />
                      </View>
                      <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Payment type</Text>
                        {(["all", "cash", "bank", "other"] as const).map((value) => (
                          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: draftDayPassPaymentFilter === value }} onPress={() => setDraftDayPassPaymentFilter(value)} style={styles.filterRadioOption}>
                            <View style={[styles.radioOuter, draftDayPassPaymentFilter === value && styles.radioOuterSelected]}>{draftDayPassPaymentFilter === value ? <View style={styles.radioInner} /> : null}</View>
                            <Text style={styles.statusFilterOptionText}>{value === "all" ? "All payment types" : value === "other" ? "Other" : value === "bank" ? "Bank" : "Cash"}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <View style={styles.filterFooter}>
                        <Pressable accessibilityRole="button" onPress={() => { setDraftDayPassDateFrom(null); setDraftDayPassDateThrough(null); setDraftDayPassPaymentFilter("all"); setDraftDayPassVisitorFilter(""); }} style={styles.filterClearOption}><Text style={styles.filterClearText}>Clear selections</Text></Pressable>
                        <Button onPress={applyDayPassFilters}>Apply</Button>
                      </View>
                    </ScrollView>
                  ) : null}
                </View>
                {hasAppliedDayPassFilters ? <Pressable accessibilityRole="button" accessibilityLabel="Clear day pass filters" onPress={clearDayPassFilters} style={styles.clearFiltersButton}><X size={15} color={colors.green} /><Text style={styles.clearFiltersLabel}>Clear filters</Text></Pressable> : null}
              </View>
            </View>
            {dayPassLoadError ? <Text style={styles.errorText}>{dayPassLoadError}</Text> : null}
            {dayPassLoading ? (
              <View style={styles.skeletonList}>{[0, 1, 2].map((item) => <Skeleton key={item} style={styles.memberSkeleton} />)}</View>
            ) : visibleDayPasses.length ? (
              <>
                {!compact ? <DayPassTableHeader /> : null}
                <View>{pagedDayPasses.map((dayPass) => <DayPassRow key={dayPass.id} dayPass={dayPass} compact={compact} />)}</View>
                <Pagination page={dayPassPage} total={visibleDayPasses.length} pageSize={MEMBER_PAGE_SIZE} onPageChange={setDayPassPage} />
              </>
            ) : (
              <EmptyState icon={<CalendarDays size={18} color={colors.green} />} title={hasAppliedDayPassFilters ? "No matching day passes" : "No day passes yet"} description={hasAppliedDayPassFilters ? "Try adjusting or clearing your filters." : "Paid visitor passes will appear here."} />
            )}
          </>
        )}
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

export function DayPassPage() {
  const router = useRouter();
  const { dayPassFee, loading: feeLoading, error: feeError } = useMembershipPlans(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const returnToMembers = () => { if (router.canGoBack()) router.back(); else router.replace("/members"); };

  const submitDayPass = async (input: Parameters<typeof createDayPass>[0]) => {
    setSaving(true);
    setError("");
    try {
      await createDayPass(input);
      returnToMembers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record this Day Pass.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Add Day Pass" subtitle="Enter visitor details and select the number of paid days.">
      {feeError ? <Text style={styles.errorText}>{feeError}</Text> : null}
      <Surface>
        <DayPassDialog fee={dayPassFee} feeLoading={feeLoading} saving={saving} error={error} fullScreen onClose={returnToMembers} onManageFee={() => router.push("/subscription")} onSave={submitDayPass} />
      </Surface>
    </AppShell>
  );
}

export function AddMemberPage() {
  const router = useRouter();
  const { plans, admissionFee, loading: plansLoading, error: plansError } = useMembershipPlans(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const saveNewMember = async (input: MemberFormInput) => {
    if (!input.signupDate) {
      setSaveError("Choose a signup date.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await createMember({ ...input, signupDate: input.signupDate } satisfies NewMemberInput);
      router.replace("/members");
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Could not add this member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Add member" subtitle="Choose an existing plan. Membership validity follows its configured duration.">
      {plansError ? <Text style={styles.errorText}>{plansError}</Text> : null}
      <MemberDialog
        key="add-member-screen"
        member={null}
        plans={plans}
        admissionFee={admissionFee}
        plansLoading={plansLoading}
        saving={saving}
        error={saveError}
        fullScreen
        onClose={() => router.back()}
        onGoToPlans={() => router.push("/subscription")}
        onSave={saveNewMember}
      />
    </AppShell>
  );
}

function MemberTableHeader({ sortKey, sortDirection, onSort }: { sortKey: MemberSortKey; sortDirection: MemberSortDirection; onSort: (key: MemberSortKey) => void }) {
  const headers: { key: MemberSortKey; label: string }[] = [
    { key: "name", label: "MEMBER" },
    { key: "plan", label: "PLAN" },
    { key: "joined", label: "JOINED" },
    { key: "status", label: "STATUS" },
  ];
  return (
    <View style={styles.tableHeader}>
      {headers.map(({ key, label }) => (
        <View key={key} style={[styles.tableColumn, styles.columnDivider, key === "name" ? styles.memberColumn : key === "plan" ? styles.planColumn : key === "joined" ? styles.joinedColumn : styles.statusColumn]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Sort by ${label.toLowerCase()}`} accessibilityState={{ selected: sortKey === key }} onPress={() => onSort(key)} style={styles.sortHeaderCell}>
            <Text style={styles.headerCell}>{label}</Text>
            {sortKey === key ? sortDirection === "asc" ? <ArrowUp size={13} color={colors.green} /> : <ArrowDown size={13} color={colors.green} /> : <ArrowUpDown size={13} color={colors.muted} />}
          </Pressable>
        </View>
      ))}
      <View style={[styles.tableColumn, styles.actionsColumn]}><Text style={styles.headerCell}>ACTIONS</Text></View>
    </View>
  );
}

function DayPassTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <View style={[styles.dayPassNameColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.headerCell}>VISITOR</Text></View>
      <View style={[styles.dayPassDateColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.headerCell}>VISIT DATE</Text></View>
      <View style={[styles.dayPassAmountColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.headerCell}>AMOUNT PAID</Text></View>
      <View style={[styles.dayPassMethodColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.headerCell}>PAYMENT TYPE</Text></View>
      <View style={[styles.dayPassStatusColumn, styles.tableColumn]}><Text style={styles.headerCell}>STATUS</Text></View>
    </View>
  );
}

function DayPassRow({ dayPass, compact }: { dayPass: DayPass; compact: boolean }) {
  const method = dayPass.paymentMethod === "other" ? dayPass.paymentMethodDetails || "Other" : dayPass.paymentMethod;
  if (compact) {
    return (
      <View style={styles.dayPassCompactRow}>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.memberName}>{dayPass.visitorName}</Text>
          <Text numberOfLines={1} style={styles.memberEmail}>{dayPass.email || dayPass.phone || "Visitor"}</Text>
          <Text style={styles.mobileDate}>{formatDate(dayPass.visitDate)} · {method}</Text>
        </View>
        <View style={styles.dayPassCompactAmount}>
          <Text style={styles.cellText}>{currency.format(dayPass.amount)}</Text>
          <StatusBadge label="Paid" tone="green" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.dayPassRow}>
      <View style={[styles.dayPassNameColumn, styles.tableColumn, styles.columnDivider]}>
        <Text numberOfLines={1} style={styles.memberName}>{dayPass.visitorName}</Text>
        {dayPass.email || dayPass.phone ? <Text numberOfLines={1} style={styles.memberEmail}>{dayPass.email || dayPass.phone}</Text> : null}
      </View>
      <View style={[styles.dayPassDateColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.cellText}>{formatDate(dayPass.visitDate)}</Text></View>
      <View style={[styles.dayPassAmountColumn, styles.tableColumn, styles.columnDivider]}><Text style={styles.cellText}>{currency.format(dayPass.amount)}</Text></View>
      <View style={[styles.dayPassMethodColumn, styles.tableColumn, styles.columnDivider]}><Text numberOfLines={1} style={styles.cellText}>{method}</Text></View>
      <View style={[styles.dayPassStatusColumn, styles.tableColumn]}><StatusBadge label="Paid" tone="green" /></View>
    </View>
  );
}

function DayPassDialog({ fee, feeLoading, saving, error, fullScreen = false, onClose, onManageFee, onSave }: {
  fee: number | null;
  feeLoading: boolean;
  saving: boolean;
  error: string;
  fullScreen?: boolean;
  onClose: () => void;
  onManageFee: () => void;
  onSave: (input: Parameters<typeof createDayPass>[0]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [durationDropdownOpen, setDurationDropdownOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank" | "other">("cash");
  const [paymentMethodDetails, setPaymentMethodDetails] = useState("");
  const [validationError, setValidationError] = useState("");

  const submit = () => {
    if (!name.trim()) { setValidationError("Enter the visitor’s name."); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setValidationError("Enter a valid email address."); return; }
    if (fee === null || fee <= 0) { setValidationError("Set the Day Pass fee in Plans & fees first."); return; }
    if (durationDays === null) { setValidationError("Choose how many days the visitor is paying for."); return; }
    setValidationError("");
    void onSave({ visitorName: name.trim(), email: email.trim(), phone: phone.trim(), amount: Math.round(fee * durationDays * 100) / 100, paymentMethod, paymentMethodDetails: paymentMethod === "other" ? paymentMethodDetails.trim() : "" });
  };

  const formContent = (
        <View style={[styles.dialog, fullScreen && styles.fullScreenDialog]}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>New Day Pass</Text><Text style={styles.dialogSubtitle}>Visitor details and payment.</Text></View>
            <Pressable accessibilityLabel="Close dialog" disabled={saving} onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Name" value={name} onChangeText={setName} placeholder="Visitor name" />
          <DialogField label="Email (optional)" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" />
          <DialogField label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <View style={styles.dayPassFeeBox}>
            <View style={styles.dayPassFeeCopy}>
              <Text style={styles.fieldLabel}>Day Pass fee per day</Text>
              <Text style={styles.dayPassFeeValue}>{feeLoading ? "Loading..." : fee === null ? "Not set" : currency.format(fee)}</Text>
            </View>
            {fee === null && !feeLoading ? <Button variant="secondary" onPress={onManageFee}>Set fee</Button> : null}
          </View>
          <Text style={styles.fieldLabel}>Number of days</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Select Day Pass duration" accessibilityState={{ expanded: durationDropdownOpen }} onPress={() => setDurationDropdownOpen((open) => !open)} style={styles.dropdownButton}>
            <Text style={[styles.dropdownButtonText, durationDays === null && styles.dropdownPlaceholder]}>{durationDays === null ? "Select 1–30 days" : `${durationDays} ${durationDays === 1 ? "day" : "days"} · ${fee === null ? "" : currency.format(Math.round(fee * durationDays * 100) / 100)}`}</Text>
            <ChevronDown size={16} color={colors.muted} />
          </Pressable>
          {durationDropdownOpen ? (
            <ScrollView style={styles.dropdownMenu} keyboardShouldPersistTaps="handled">
              {Array.from({ length: 30 }, (_, index) => index + 1).map((days) => (
                <Pressable key={days} accessibilityRole="radio" accessibilityState={{ checked: durationDays === days }} onPress={() => { setDurationDays(days); setDurationDropdownOpen(false); }} style={[styles.durationOption, durationDays === days && styles.dropdownOptionSelected]}>
                  <Text style={styles.planOptionText}>{days} {days === 1 ? "Day" : "Days"}</Text>
                  <Text style={styles.durationPrice}>{fee === null ? "—" : currency.format(Math.round(fee * days * 100) / 100)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {durationDays !== null && fee !== null ? <Text style={styles.initialPayment}>Total price: {currency.format(Math.round(fee * durationDays * 100) / 100)}</Text> : null}
          <Text style={styles.fieldLabel}>Payment type</Text>
          <View style={styles.paymentMethodOptions}>
            {(["cash", "bank", "other"] as const).map((method) => (
              <Pressable key={method} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method }} onPress={() => setPaymentMethod(method)} style={[styles.paymentMethodOption, paymentMethod === method && styles.paymentMethodOptionSelected]}>
                <Text style={[styles.paymentMethodText, paymentMethod === method && styles.paymentMethodTextSelected]}>{method[0].toUpperCase()}{method.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          {paymentMethod === "other" ? <DialogField label="Payment details (optional)" value={paymentMethodDetails} onChangeText={setPaymentMethodDetails} placeholder="Describe the payment method" /> : null}
          {validationError || error ? <Text style={styles.errorText}>{validationError || error}</Text> : null}
          <View style={styles.dialogActions}>
            <Button variant="secondary" disabled={saving} onPress={onClose}>Cancel</Button>
            <Button disabled={saving || feeLoading || fee === null || durationDays === null} onPress={submit}>{saving ? "Submitting..." : "Submit and Pay"}</Button>
          </View>
        </View>
  );

  if (fullScreen) return <View style={styles.fullScreenForm}>{formContent}</View>;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBackdrop} keyboardShouldPersistTaps="handled">
        {formContent}
      </ScrollView>
    </Modal>
  );
}

function MemberRow({ member, compact, checkingIn, checkedIn, onEdit, onCheckIn, onDelete }: { member: Member; compact: boolean; checkingIn: boolean; checkedIn: boolean; onEdit: () => void; onCheckIn: () => void; onDelete: () => void }) {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={[styles.memberRow, !compact && styles.tableRow]}>
      <View style={[styles.memberColumn, styles.tableColumn, !compact && styles.columnDivider, styles.identityColumn]}>
        <View style={styles.memberAvatar}><Text style={styles.memberInitials}>{initials}</Text></View>
        <View style={styles.identityCopy}>
          <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
          <Text numberOfLines={1} style={styles.memberEmail}>{member.email || member.phone}</Text>
        </View>
      </View>
      <View style={[styles.planColumn, !compact && styles.tableColumn, !compact && styles.columnDivider]}>
        <Text numberOfLines={1} style={styles.cellText}>{member.plan}</Text>
        {member.planPrice !== null ? <Text style={styles.planPrice}>{currency.format(member.planPrice)} · {member.planDurationMonths} {member.planDurationMonths === 1 ? "month" : "months"}</Text> : null}
        {compact ? <Text style={styles.mobileDate}>Joined {formatDate(member.joinedAt)}</Text> : null}
      </View>
      {!compact ? <View style={[styles.joinedColumn, styles.tableColumn, styles.columnDivider]}><View style={styles.joinedCell}><CalendarDays size={15} color={colors.muted} /><Text style={styles.cellText}>{formatDate(member.joinedAt)}</Text></View></View> : null}
      <View style={[styles.statusColumn, !compact && styles.tableColumn, !compact && styles.columnDivider]}><StatusBadge label={member.status === "active" ? "Active" : "Inactive"} tone={member.status === "active" ? "green" : "neutral"} /></View>
      <View style={[!compact && styles.tableColumn, styles.rowActions, compact && styles.compactRowActions]}>
        <Pressable
          accessibilityLabel={checkedIn ? `${member.name} checked in today` : `Check in ${member.name}`}
          accessibilityRole="button"
          disabled={member.status !== "active" || checkingIn || checkedIn}
          onPress={onCheckIn}
          style={[styles.checkInButton, (checkingIn || checkedIn) && styles.checkInCompleted, member.status !== "active" && styles.disabledAction]}
        >
          {checkingIn ? <Text style={styles.checkInLabel}>...</Text> : checkedIn ? <Check size={14} color={colors.green} /> : <UserRoundCheck size={14} color={member.status === "active" ? colors.green : colors.muted} />}
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

function MemberDialog({ member, plans, admissionFee, plansLoading, saving, error, fullScreen = false, onClose, onGoToPlans, onSave }: {
  member: Member | null;
  plans: MembershipPlan[];
  admissionFee: number | null;
  plansLoading: boolean;
  saving: boolean;
  error: string;
  fullScreen?: boolean;
  onClose: () => void;
  onGoToPlans: () => void;
  onSave: (input: MemberFormInput, memberId?: string) => Promise<void>;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [planId, setPlanId] = useState(member?.planId ?? "");
  const [planDropdownOpen, setPlanDropdownOpen] = useState(false);
  const [admissionFeeEnabled, setAdmissionFeeEnabled] = useState<boolean | null>(null);
  const [admissionFeeAmount, setAdmissionFeeAmount] = useState<string | null>(null);
  const todayDate = useTodayDate();
  const [selectedSignupDate, setSelectedSignupDate] = useState<string | null>(null);
  const signupDate = member?.joinedAt ?? selectedSignupDate ?? todayDate;
  const [validationError, setValidationError] = useState("");
  const availablePlans = plans.filter((plan) => plan.isActive || plan.id === member?.planId);
  const selectedPlan = availablePlans.find((plan) => plan.id === planId) ?? (member ? availablePlans[0] ?? null : null);
  const includeAdmissionFee = admissionFeeEnabled ?? (admissionFee !== null && admissionFee > 0);
  const admissionFeeText = admissionFeeAmount ?? (admissionFee === null ? "" : String(admissionFee));

  const submit = () => {
    if (!name.trim()) { setValidationError("Enter the member’s name."); return; }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) { setValidationError("Enter a valid email address."); return; }
    if (!selectedPlan) { setValidationError("Select an existing membership plan."); return; }
    if (!member && (!isValidDateOnly(signupDate) || signupDate > todayDate)) {
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

  const formContent = (
    <View style={[styles.dialog, fullScreen && styles.fullScreenDialog]}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>{member ? "Edit member" : "Add member"}</Text><Text style={styles.dialogSubtitle}>{member ? "Update this member’s details and plan." : "Add a member and record signup payments."}</Text></View>
            <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Full name" value={name} onChangeText={setName} placeholder="Full name" />
          <DialogField label="Email address" value={email} onChangeText={setEmail} placeholder="Email address" keyboardType="email-address" />
          <DialogField label="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          {!member ? <SignupDatePicker label="Signup date" value={signupDate} onChange={setSelectedSignupDate} maxDate={todayDate} /> : null}
          <Text style={styles.fieldLabel}>Membership plan</Text>
          {plansLoading ? <Skeleton style={styles.planSkeleton} /> : member ? availablePlans.length ? (
            <View style={styles.planPicker}>
              {availablePlans.map((plan) => {
                const selected = (selectedPlan?.id ?? planId) === plan.id;
                return (
                  <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPlanId(plan.id)} style={[styles.planOption, selected && styles.planOptionSelected]}>
                    <Text style={[styles.planOptionText, selected && styles.planOptionTextSelected]}>{plan.name} · {currency.format(plan.price)} · {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.noPlans}>
              <Text style={styles.noPlansText}>No active membership plans yet.</Text>
              <Button variant="secondary" onPress={onGoToPlans}>Manage plans</Button>
            </View>
          ) : plans.length ? (
            <View style={styles.dropdownField}>
              <Pressable accessibilityRole="button" accessibilityLabel="Select membership plan" accessibilityState={{ expanded: planDropdownOpen }} onPress={() => setPlanDropdownOpen((open) => !open)} style={styles.dropdownButton}>
                <Text numberOfLines={1} style={[styles.dropdownButtonText, !selectedPlan && styles.dropdownPlaceholder]}>{selectedPlan ? `${selectedPlan.name} · ${currency.format(selectedPlan.price)} · ${selectedPlan.durationMonths} ${selectedPlan.durationMonths === 1 ? "month" : "months"}` : "Select a membership plan"}</Text>
                <ChevronDown size={16} color={colors.muted} />
              </Pressable>
              {planDropdownOpen ? (
                <ScrollView style={styles.dropdownMenu} keyboardShouldPersistTaps="handled">
                  {plans.map((plan) => {
                    const selected = plan.id === selectedPlan?.id;
                    return (
                      <Pressable key={plan.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { setPlanId(plan.id); setPlanDropdownOpen(false); }} style={[styles.dropdownOption, selected && styles.dropdownOptionSelected]}>
                        <View style={styles.dropdownOptionCopy}>
                          <Text numberOfLines={1} style={styles.planOptionText}>{plan.name}</Text>
                          <Text style={styles.dropdownOptionDetail}>{currency.format(plan.price)} · {plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"}</Text>
                        </View>
                        <Text style={[styles.dropdownOptionStatus, plan.isActive && styles.dropdownOptionStatusActive]}>{plan.isActive ? "Active" : "Inactive"}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
          ) : (
            <View style={styles.noPlans}>
              <Text style={styles.noPlansText}>No membership plans have been created yet.</Text>
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
          {!member && selectedPlan ? <Text style={styles.initialPayment}>Membership payment: {currency.format(selectedPlan.price)} · {selectedPlan.durationMonths} {selectedPlan.durationMonths === 1 ? "month" : "months"} · recorded as paid</Text> : null}
          {!member && includeAdmissionFee && Number(admissionFeeText) > 0 ? <Text style={styles.initialPayment}>Admission fee: {currency.format(Number(admissionFeeText))} · recorded as paid</Text> : null}
          {validationError || error ? <Text style={styles.errorText}>{validationError || error}</Text> : null}
          <View style={styles.dialogActions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button disabled={saving || plansLoading || !selectedPlan} onPress={submit}>{saving ? "Saving..." : member ? "Save changes" : "Add & record payment"}</Button>
          </View>
    </View>
  );

  if (fullScreen) return <View style={styles.fullScreenForm}>{formContent}</View>;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalBackdrop} keyboardShouldPersistTaps="handled">
        {formContent}
      </ScrollView>
    </Modal>
  );
}

function DialogField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.dialogField}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#89948D" style={styles.dialogInput} /></View>;
}

function SignupDatePicker({ label, value, onChange, onClear, maxDate }: { label: string; value: string | null; onChange: (value: string) => void; onClear?: () => void; maxDate: string }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState((value ?? maxDate).slice(0, 7));
  const todayMonth = maxDate.slice(0, 7);
  const days = getCalendarDays(visibleMonth);
  const weeks = Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7));

  const changeMonth = (offset: number) => setVisibleMonth((month) => shiftMonth(month, offset));

  return (
    <View style={styles.signupDateSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.signupDateControlRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${value ? formatDate(value) : "any date"}`} accessibilityState={{ expanded: open }} onPress={() => setOpen((current) => !current)} style={styles.signupDateButton}>
          <CalendarDays size={16} color={colors.green} />
          <Text style={styles.signupDateValue}>{value ? formatDate(value) : "Any date"}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
        {value && onClear ? <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label.toLowerCase()} date`} onPress={onClear} style={styles.clearDateButton}><X size={15} color={colors.muted} /></Pressable> : null}
      </View>
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

function useTodayDate() {
  const [todayDate, setTodayDate] = useState(getTodayDate);

  useEffect(() => {
    const timer = setInterval(() => {
      const currentDate = getTodayDate();
      setTodayDate((previousDate) => previousDate === currentDate ? previousDate : currentDate);
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  return todayDate;
}

function getTodayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTabs: { height: 50, flexDirection: "row", alignItems: "flex-end", gap: 28, paddingHorizontal: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  subTab: { minHeight: 48, justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent", paddingHorizontal: 2 },
  subTabActive: { borderBottomColor: colors.green },
  subTabText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  subTabTextActive: { color: colors.green, fontWeight: "700" },
  listToolbar: { minHeight: 76, marginHorizontal: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E0EEE4", borderRadius: 12, backgroundColor: "#F0F8F3", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  listToolbarOpen: { zIndex: 20, elevation: 20 },
  compactListToolbar: { flexWrap: "wrap", paddingVertical: 10 },
  countBlock: { flexDirection: "row", alignItems: "center", gap: 12 },
  countIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#E0F2E7", alignItems: "center", justifyContent: "center" },
  countCopy: { gap: 2 },
  countSkeleton: { width: 30, height: 21 },
  memberCount: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  countLabel: { color: colors.muted, fontSize: 14 },
  toolbarControls: { flex: 1, flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 },
  compactToolbarControls: { width: "100%", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  searchBox: { width: 375, maxWidth: "58%", minHeight: 44, borderWidth: 1, borderColor: "#D5E1D9", borderRadius: 8, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  compactSearchBox: { flexBasis: "100%", flexGrow: 0, width: "auto", maxWidth: "100%" },
  searchInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14 },
  filterControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactFilterControls: { width: "100%", justifyContent: "flex-end" },
  statusFilterWrap: { width: 200, position: "relative", zIndex: 1 },
  compactStatusFilterWrap: { flex: 1, width: "auto", minWidth: 0 },
  statusFilterWrapOpen: { zIndex: 30, elevation: 30 },
  statusFilterButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: "#D5E1D9", borderRadius: 8, backgroundColor: colors.surface },
  statusFilterLabel: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "600" },
  statusFilterMenu: { position: "absolute", zIndex: 40, elevation: 40, top: 48, right: 0, maxHeight: 520, borderWidth: 1, borderColor: "#D5E1D9", borderRadius: 8, backgroundColor: colors.surface, shadowColor: "#19251F", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  statusFilterMenuContent: { padding: 12, paddingBottom: 8 },
  filterSection: { gap: 3, paddingBottom: 11, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  filterSectionTitle: { color: colors.muted, fontSize: 14, fontWeight: "700", textTransform: "uppercase", marginBottom: 3 },
  filterSearchInput: { minHeight: 40, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, color: colors.ink, fontSize: 14 },
  filterRadioOption: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 },
  radioOuter: { width: 18, height: 18, borderWidth: 1, borderColor: colors.muted, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  radioOuterSelected: { borderColor: colors.green },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green },
  filterRadioLabel: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14 },
  inactivePlanLabel: { color: colors.muted, fontSize: 14 },
  filterEmptyText: { color: colors.muted, fontSize: 14, paddingVertical: 8 },
  filterClearOption: { minHeight: 34, justifyContent: "center", paddingHorizontal: 4 },
  filterClearText: { color: colors.green, fontSize: 14, fontWeight: "600" },
  filterFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  clearFiltersButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 9, borderWidth: 1, borderColor: "#CFE5D5", borderRadius: 8, backgroundColor: colors.surface },
  clearFiltersLabel: { color: colors.green, fontSize: 14, fontWeight: "600" },
  statusFilterOption: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 5 },
  statusFilterOptionSelected: { backgroundColor: "#E8F5EC" },
  statusFilterOptionText: { color: colors.ink, fontSize: 14 },
  statusFilterOptionTextSelected: { color: colors.green, fontWeight: "700" },
  tableHeader: { minHeight: 46, backgroundColor: "#F8FAF8", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#D4DDD7", paddingHorizontal: 0, flexDirection: "row", alignItems: "stretch" },
  tableRow: { paddingHorizontal: 0, gap: 0, alignItems: "stretch", borderBottomColor: "#DCE3DE" },
  tableColumn: { justifyContent: "center", alignItems: "flex-start", paddingHorizontal: 12 },
  columnDivider: { borderRightWidth: 1, borderRightColor: "#CBD6CF" },
  sortHeaderCell: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  headerCell: { color: colors.muted, fontSize: 14, fontWeight: "700", letterSpacing: 0.6, textAlign: "left" },
  memberColumn: { flex: 2.3, minWidth: 0, justifyContent: "center", alignItems: "flex-start" },
  planColumn: { flex: 1.4, minWidth: 90, justifyContent: "center", alignItems: "flex-start" },
  joinedColumn: { flex: 1.25, justifyContent: "center", alignItems: "flex-start" },
  statusColumn: { flex: 1, justifyContent: "center", alignItems: "flex-start" },
  actionsColumn: { flex: 1.3, justifyContent: "center", alignItems: "center" },
  dayPassNameColumn: { flex: 1.7, minWidth: 0 },
  dayPassDateColumn: { flex: 1.2 },
  dayPassAmountColumn: { flex: 1.1 },
  dayPassMethodColumn: { flex: 1, minWidth: 0 },
  dayPassStatusColumn: { width: 92 },
  dayPassToolbar: { minHeight: 56, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  compactDayPassToolbar: { flexWrap: "wrap", paddingVertical: 8 },
  dayPassToolbarOpen: { zIndex: 20, elevation: 20 },
  dayPassFilterControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactDayPassFilterControls: { width: "100%", justifyContent: "flex-end" },
  dayPassTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  memberRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: "#EEF1EF", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8 },
  dayPassRow: { minHeight: 67, borderBottomWidth: 1, borderBottomColor: "#DCE3DE", paddingHorizontal: 0, flexDirection: "row", alignItems: "stretch" },
  dayPassCompactRow: { minHeight: 76, borderBottomWidth: 1, borderBottomColor: "#EEF1EF", paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  dayPassCompactAmount: { alignItems: "flex-end", gap: 6 },
  identityColumn: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 10 },
  joinedCell: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  memberInitials: { color: colors.green, fontSize: 14, fontWeight: "700" },
  identityCopy: { maxWidth: "78%", minWidth: 0, gap: 3 },
  memberName: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  memberEmail: { color: colors.muted, fontSize: 14 },
  cellText: { color: colors.ink, fontSize: 14, textAlign: "left" },
  planPrice: { color: colors.muted, fontSize: 14, marginTop: 4 },
  mobileDate: { color: colors.muted, fontSize: 14, marginTop: 4 },
  rowActions: { flex: 1.3, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  compactRowActions: { width: 96 },
  checkInButton: { width: 44, height: 44, minWidth: 44, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: "#EFF8F2", paddingHorizontal: 0 },
  checkInCompleted: { backgroundColor: colors.greenSoft },
  disabledAction: { opacity: 0.5 },
  checkInLabel: { color: colors.green, fontSize: 14, fontWeight: "600" },
  editButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#F1F4F2", alignItems: "center", justifyContent: "center" },
  deleteButton: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#FFF0F0", alignItems: "center", justifyContent: "center" },
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
  fullScreenForm: { width: "100%", alignItems: "center" },
  fullScreenDialog: { maxWidth: 720 },
  dialogHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  dialogTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  dialogSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  dialogField: { gap: 6, marginBottom: 14 },
  dayPassFeeBox: { minHeight: 58, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dayPassFeeCopy: { flex: 1, minWidth: 0 },
  dayPassFeeValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  paymentMethodOptions: { flexDirection: "row", gap: 8, marginBottom: 14 },
  paymentMethodOption: { minHeight: 36, flex: 1, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, backgroundColor: colors.surface },
  paymentMethodOptionSelected: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  paymentMethodText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  paymentMethodTextSelected: { color: colors.green },
  signupDateSection: { marginBottom: 14 },
  signupDateControlRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  signupDateButton: { minHeight: 40, flex: 1, flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10 },
  clearDateButton: { width: 36, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radii.small },
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
  dropdownField: { marginBottom: 14 },
  dropdownButton: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, backgroundColor: colors.surface },
  dropdownButtonText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14, fontWeight: "600" },
  dropdownPlaceholder: { color: colors.muted, fontWeight: "400" },
  dropdownMenu: { maxHeight: 250, marginTop: 6, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, backgroundColor: colors.surface },
  dropdownOption: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  dropdownOptionSelected: { backgroundColor: colors.greenSoft },
  dropdownOptionCopy: { flex: 1, minWidth: 0, gap: 3 },
  dropdownOptionDetail: { color: colors.muted, fontSize: 14 },
  dropdownOptionStatus: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  dropdownOptionStatusActive: { color: colors.green },
  durationOption: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  durationPrice: { color: colors.ink, fontSize: 14, fontWeight: "600" },
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