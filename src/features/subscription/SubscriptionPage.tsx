import { ChevronDown, CreditCard, Pause, Pencil, Play, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import { updateGymAdmissionFee, updateGymDayPassFee } from "@/services/gymService";
import { createMembershipPlan, setMembershipPlanActive, updateMembershipPlan } from "@/services/membershipPlanService";
import { colors, radii } from "@/theme/tokens";
import type { MembershipPlan } from "@/types/domain";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
type PlanInput = Pick<MembershipPlan, "name" | "price" | "durationMonths">;

export function SubscriptionPage() {
  const { plans, canManage, admissionFee, setAdmissionFee, dayPassFee, setDayPassFee, loading: plansLoading, error: plansError, replacePlan } = useMembershipPlans(true);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [editingAdmissionFee, setEditingAdmissionFee] = useState(false);
  const [admissionFeeDraft, setAdmissionFeeDraft] = useState<string | null>(null);
  const [savingAdmissionFee, setSavingAdmissionFee] = useState(false);
  const [admissionFeeError, setAdmissionFeeError] = useState("");
  const [editingDayPassFee, setEditingDayPassFee] = useState(false);
  const [dayPassFeeDraft, setDayPassFeeDraft] = useState<string | null>(null);
  const [dayPassFeeError, setDayPassFeeError] = useState("");
  const [savingDayPassFee, setSavingDayPassFee] = useState(false);
  const savePlan = async (input: PlanInput, planId?: string) => {
    setSaving(true);
    setActionError("");
    try {
      const saved = planId ? await updateMembershipPlan(planId, input) : await createMembershipPlan(input);
      replacePlan(saved);
      setDialogOpen(false);
      setEditingPlan(null);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not save this plan.");
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = async (plan: MembershipPlan) => {
    setActionError("");
    try {
      const saved = await setMembershipPlanActive(plan.id, !plan.isActive);
      replacePlan(saved);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not update this plan.");
    }
  };

  const saveAdmissionFee = async () => {
    const draft = admissionFeeDraft?.trim() ?? "";
    const parsedFee = Number(draft);
    if (!draft || !Number.isFinite(parsedFee) || parsedFee < 0) {
      setAdmissionFeeError("Enter a fee of zero or greater.");
      return;
    }
    setSavingAdmissionFee(true);
    setAdmissionFeeError("");
    try {
      const savedFee = await updateGymAdmissionFee(parsedFee);
      setAdmissionFee(savedFee);
      setAdmissionFeeDraft(null);
      setEditingAdmissionFee(false);
    } catch (caught) {
      setAdmissionFeeError(caught instanceof Error ? caught.message : "Could not save the admission fee.");
    } finally {
      setSavingAdmissionFee(false);
    }
  };

  const saveDayPassFee = async () => {
    const draft = dayPassFeeDraft?.trim() ?? "";
    const parsedFee = Number(draft);
    if (!draft || !Number.isFinite(parsedFee) || parsedFee <= 0) {
      setDayPassFeeError("Enter a day pass fee greater than zero.");
      return;
    }
    setSavingDayPassFee(true);
    setDayPassFeeError("");
    try {
      const savedFee = await updateGymDayPassFee(parsedFee);
      setDayPassFee(savedFee);
      setDayPassFeeDraft(null);
      setEditingDayPassFee(false);
    } catch (caught) {
      setDayPassFeeError(caught instanceof Error ? caught.message : "Could not save the day pass fee.");
    } finally {
      setSavingDayPassFee(false);
    }
  };

  return (
    <AppShell title="Plans & fees" subtitle="Manage member plans and gym fees.">
      <Surface style={styles.admissionFeePanel}>
        <View style={styles.admissionFeeHeading}>
          <Text style={styles.sectionTitle}>Admission fee</Text>
          <Text style={styles.sectionDescription}>Default one-time fee for new members. Set to zero to disable it.</Text>
        </View>
        {canManage && editingAdmissionFee ? (
          <View style={styles.admissionFeeControls}>
            <TextInput
              accessibilityLabel="Default admission fee"
              value={admissionFeeDraft ?? (admissionFee === null ? "" : String(admissionFee))}
              onChangeText={(value) => { setAdmissionFeeDraft(value); setAdmissionFeeError(""); }}
              placeholder="0.00"
              placeholderTextColor="#89948D"
              keyboardType="decimal-pad"
              style={styles.admissionFeeInput}
            />
            <Button disabled={plansLoading || savingAdmissionFee || admissionFee === null} onPress={() => void saveAdmissionFee()}>
              {savingAdmissionFee ? "Saving..." : "Save fee"}
            </Button>
            <Button variant="secondary" disabled={savingAdmissionFee} onPress={() => { setAdmissionFeeDraft(null); setAdmissionFeeError(""); setEditingAdmissionFee(false); }}>
              Cancel
            </Button>
          </View>
        ) : (
          <View style={styles.admissionFeeControls}>
            <Text style={styles.admissionFeeValue}>{admissionFee === null ? "Loading..." : currency.format(admissionFee)}</Text>
            {canManage ? (
              <Button
                disabled={plansLoading || admissionFee === null}
                icon={<Pencil size={15} color="#FFFFFF" />}
                onPress={() => { setAdmissionFeeDraft(String(admissionFee)); setAdmissionFeeError(""); setEditingAdmissionFee(true); }}
              >
                Edit
              </Button>
            ) : null}
          </View>
        )}
        {admissionFeeError ? <Text style={styles.error}>{admissionFeeError}</Text> : null}
      </Surface>

      <Surface style={styles.admissionFeePanel}>
        <View style={styles.admissionFeeHeading}>
          <Text style={styles.sectionTitle}>Day Pass fee</Text>
          <Text style={styles.sectionDescription}>Default price for a single-day visitor pass.</Text>
        </View>
        {canManage && editingDayPassFee ? (
          <View style={styles.admissionFeeControls}>
            <TextInput
              accessibilityLabel="Default Day Pass fee"
              value={dayPassFeeDraft ?? (dayPassFee === null ? "" : String(dayPassFee))}
              onChangeText={(value) => { setDayPassFeeDraft(value); setDayPassFeeError(""); }}
              placeholder="0.00"
              placeholderTextColor="#89948D"
              keyboardType="decimal-pad"
              style={styles.admissionFeeInput}
            />
            <Button disabled={plansLoading || savingDayPassFee} onPress={() => void saveDayPassFee()}>{savingDayPassFee ? "Saving..." : "Save fee"}</Button>
            <Button variant="secondary" disabled={savingDayPassFee} onPress={() => { setDayPassFeeDraft(null); setDayPassFeeError(""); setEditingDayPassFee(false); }}>
              Cancel
            </Button>
          </View>
        ) : (
          <View style={styles.admissionFeeControls}>
            <Text style={styles.admissionFeeValue}>{plansLoading ? "Loading..." : dayPassFee === null ? "Not set" : currency.format(dayPassFee)}</Text>
            {canManage ? (
              <Button
                disabled={plansLoading}
                icon={<Pencil size={15} color="#FFFFFF" />}
                onPress={() => { setDayPassFeeDraft(dayPassFee === null ? "" : String(dayPassFee)); setDayPassFeeError(""); setEditingDayPassFee(true); }}
              >
                {dayPassFee === null ? "Set fee" : "Edit"}
              </Button>
            ) : null}
          </View>
        )}
        {dayPassFeeError ? <Text style={styles.error}>{dayPassFeeError}</Text> : null}
      </Surface>

      <Surface>
        <View style={styles.catalogHeader}>
          <View style={styles.usageTitleGroup}>
            <Text style={styles.sectionTitle}>Membership plans</Text>
            <Text style={styles.sectionDescription}>Existing plans, their duration, and the final signup price.</Text>
          </View>
          {canManage ? <Button onPress={() => { setEditingPlan(null); setActionError(""); setDialogOpen(true); }} icon={<Plus size={15} color="#FFFFFF" />}>Add plan</Button> : null}
        </View>
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        {plansLoading ? (
          <View style={styles.planSkeletonList}>{[0, 1, 2].map((item) => <Skeleton key={item} style={styles.planRowSkeleton} />)}</View>
        ) : plansError ? (
          <EmptyState icon={<CreditCard size={18} color={colors.coral} />} title="Membership plans unavailable" description={plansError} />
        ) : plans.length ? (
          <View>
            {plans.map((plan) => (
              <MembershipPlanRow
                key={plan.id}
                plan={plan}
                canManage={canManage}
                onEdit={() => { setEditingPlan(plan); setDialogOpen(true); }}
                onToggle={() => void togglePlan(plan)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={<CreditCard size={18} color={colors.green} />}
            title="No membership plans yet"
            description={canManage ? "Create a plan before adding members." : "Ask the workspace owner to create a membership plan."}
          />
        )}
      </Surface>

      {dialogOpen ? <PlanDialog key={editingPlan?.id ?? "new-plan"} plan={editingPlan} saving={saving} error={actionError} onClose={() => { setDialogOpen(false); setEditingPlan(null); }} onSave={savePlan} /> : null}
    </AppShell>
  );
}

function MembershipPlanRow({ plan, canManage, onEdit, onToggle }: { plan: MembershipPlan; canManage: boolean; onEdit: () => void; onToggle: () => void }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planRowCopy}>
        <Text style={styles.planRowName}>{plan.name}</Text>
        <Text style={styles.planRowPrice}>{plan.durationMonths} {plan.durationMonths === 1 ? "month" : "months"} · {currency.format(plan.price)}</Text>
      </View>
      <StatusBadge label={plan.isActive ? "Active" : "Inactive"} tone={plan.isActive ? "green" : "neutral"} />
      {canManage ? (
        <View style={styles.planActions}>
          <Pressable accessibilityLabel={`Edit ${plan.name}`} accessibilityRole="button" onPress={onEdit} style={styles.iconButton}><Pencil size={15} color={colors.muted} /></Pressable>
          <Pressable accessibilityLabel={`${plan.isActive ? "Deactivate" : "Activate"} ${plan.name}`} accessibilityRole="button" onPress={onToggle} style={styles.iconButton}>
            {plan.isActive ? <Pause size={15} color={colors.coral} /> : <Play size={15} color={colors.green} />}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function PlanDialog({ plan, saving, error, onClose, onSave }: { plan: MembershipPlan | null; saving: boolean; error: string; onClose: () => void; onSave: (input: PlanInput, planId?: string) => Promise<void> }) {
  const [name, setName] = useState(plan?.name ?? "");
  const [price, setPrice] = useState(plan ? String(plan.price) : "");
  const [durationMonths, setDurationMonths] = useState(plan?.durationMonths ?? 1);
  const [durationOpen, setDurationOpen] = useState(false);
  const [validationError, setValidationError] = useState("");

  const submit = () => {
    const parsedPrice = Number(price);
    if (name.trim().length < 2) { setValidationError("Enter a plan name with at least two characters."); return; }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) { setValidationError("Enter a price greater than zero."); return; }
    if (!Number.isInteger(durationMonths) || durationMonths < 1) { setValidationError("Choose a duration of at least one month."); return; }
    setValidationError("");
    void onSave({ name: name.trim(), price: parsedPrice, durationMonths }, plan?.id);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>{plan ? "Edit membership plan" : "Add membership plan"}</Text><Text style={styles.dialogSubtitle}>Set a duration and enter the final plan price.</Text></View>
            <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Plan name" value={name} onChangeText={setName} placeholder="e.g. Strength" />
          <Text style={styles.fieldLabel}>Duration</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Select plan duration in months" accessibilityState={{ expanded: durationOpen }} onPress={() => setDurationOpen((open) => !open)} style={styles.durationButton}>
            <Text style={styles.durationButtonText}>{durationMonths} {durationMonths === 1 ? "Month" : "Months"}</Text>
            <ChevronDown size={16} color={colors.muted} />
          </Pressable>
          {durationOpen ? (
            <ScrollView style={styles.durationMenu} keyboardShouldPersistTaps="handled">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((months) => (
                <Pressable key={months} accessibilityRole="radio" accessibilityState={{ checked: durationMonths === months }} onPress={() => { setDurationMonths(months); setDurationOpen(false); }} style={[styles.durationOption, durationMonths === months && styles.durationOptionSelected]}>
                  <Text style={[styles.durationOptionText, durationMonths === months && styles.durationOptionTextSelected]}>{months} {months === 1 ? "Month" : "Months"}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <DialogField label="Price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
          {validationError || error ? <Text style={styles.error}>{validationError || error}</Text> : null}
          <View style={styles.dialogActions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button disabled={saving} onPress={submit}>{saving ? "Saving..." : plan ? "Save plan" : "Create plan"}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DialogField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return <View style={styles.dialogField}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} placeholderTextColor="#89948D" style={styles.dialogInput} /></View>;
}

const styles = StyleSheet.create({
  usageTitleGroup: { gap: 4 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  sectionDescription: { color: colors.muted, fontSize: 14 },
  admissionFeePanel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 20 },
  admissionFeeHeading: { flex: 1, minWidth: 220, gap: 5 },
  admissionFeeControls: { flexDirection: "row", alignItems: "center", gap: 9 },
  admissionFeeInput: { width: 120, height: 38, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 14, color: colors.ink },
  admissionFeeValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  catalogHeader: { minHeight: 77, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 },
  planRow: { minHeight: 63, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  planRowCopy: { flex: 1, gap: 4 },
  planRowName: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  planRowPrice: { color: colors.muted, fontSize: 14 },
  planActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  iconButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radii.small },
  planSkeletonList: { padding: 18, gap: 9 },
  planRowSkeleton: { height: 42 },
  error: { color: colors.coral, fontSize: 14, padding: 14 },
  modalBackdrop: { flex: 1, minHeight: "100%", padding: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(19, 34, 26, 0.42)" },
  dialog: { width: "100%", maxWidth: 460, padding: 24, backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line },
  dialogHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  dialogTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  dialogSubtitle: { color: colors.muted, fontSize: 14, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  dialogField: { gap: 6, marginBottom: 14 },
  durationButton: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, marginBottom: 14 },
  durationButtonText: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  durationMenu: { maxHeight: 220, marginTop: -7, marginBottom: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, backgroundColor: colors.surface },
  durationOption: { minHeight: 38, justifyContent: "center", paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  durationOptionSelected: { backgroundColor: colors.greenSoft },
  durationOptionText: { color: colors.ink, fontSize: 14 },
  durationOptionTextSelected: { color: colors.green, fontWeight: "700" },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: "600", marginBottom: 7 },
  dialogInput: { height: 40, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 14, color: colors.ink },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 20 },
});