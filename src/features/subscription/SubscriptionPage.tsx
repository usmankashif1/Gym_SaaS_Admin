import { CalendarDays, CreditCard, Pause, Pencil, Play, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Surface } from "@/components/ui/Surface";
import { useMembershipPlans } from "@/hooks/useMembershipPlans";
import { useSubscription } from "@/hooks/useSubscription";
import { updateGymAdmissionFee } from "@/services/gymService";
import { createMembershipPlan, setMembershipPlanActive, updateMembershipPlan } from "@/services/membershipPlanService";
import { colors, radii } from "@/theme/tokens";
import type { MembershipPlan } from "@/types/domain";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
type PlanInput = Pick<MembershipPlan, "name" | "price">;

export function SubscriptionPage() {
  const { subscription, loading, error } = useSubscription();
  const { plans, canManage, admissionFee, setAdmissionFee, loading: plansLoading, error: plansError, replacePlan } = useMembershipPlans(true);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [admissionFeeDraft, setAdmissionFeeDraft] = useState<string | null>(null);
  const [savingAdmissionFee, setSavingAdmissionFee] = useState(false);
  const [admissionFeeError, setAdmissionFeeError] = useState("");
  if (error) {
    return (
      <AppShell title="Subscription" subtitle="Workspace billing and member plans.">
        <Text style={styles.error}>{error}</Text>
      </AppShell>
    );
  }

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
    const parsedFee = Number(admissionFeeDraft ?? admissionFee ?? 0);
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      setAdmissionFeeError("Enter a fee of zero or greater.");
      return;
    }
    setSavingAdmissionFee(true);
    setAdmissionFeeError("");
    try {
      const savedFee = await updateGymAdmissionFee(parsedFee);
      setAdmissionFee(savedFee);
      setAdmissionFeeDraft(null);
    } catch (caught) {
      setAdmissionFeeError(caught instanceof Error ? caught.message : "Could not save the admission fee.");
    } finally {
      setSavingAdmissionFee(false);
    }
  };

  return (
    <AppShell title="Subscription" subtitle="Workspace billing and member plans.">
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loadingBlocks}><Skeleton style={styles.workspaceSkeleton} /></View>
      ) : (
        <>
          <View style={styles.primaryGrid}>
            <WorkspacePlan subscription={subscription} />
            <Surface style={styles.billingPanel}>
              <View style={styles.billingIcon}><CalendarDays size={17} color={colors.blue} /></View>
              <Text style={styles.billingTitle}>Next renewal</Text>
              <Text style={styles.renewalDate}>{subscription ? formatDate(subscription.currentPeriodEnd) : "Not scheduled"}</Text>
              <Text style={styles.billingNote}>{subscription ? `Workspace status: ${subscription.status.replaceAll("_", " ")}` : "No workspace subscription record."}</Text>
              <View style={styles.divider} />
              <View style={styles.billingMeta}><CreditCard size={15} color={colors.muted} /><Text style={styles.metaText}>Billing is managed by the workspace owner.</Text></View>
            </Surface>
          </View>
        </>
      )}

      <Surface style={styles.admissionFeePanel}>
        <View style={styles.admissionFeeHeading}>
          <Text style={styles.sectionTitle}>Admission fee</Text>
          <Text style={styles.sectionDescription}>Default one-time fee for new members. Set to zero to disable it.</Text>
        </View>
        {canManage ? (
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
          </View>
        ) : <Text style={styles.admissionFeeValue}>{admissionFee === null ? "Loading..." : currency.format(admissionFee)}</Text>}
        {admissionFeeError ? <Text style={styles.error}>{admissionFeeError}</Text> : null}
      </Surface>

      <Surface>
        <View style={styles.catalogHeader}>
          <View style={styles.usageTitleGroup}>
            <Text style={styles.sectionTitle}>Membership plans</Text>
            <Text style={styles.sectionDescription}>Plan names and monthly pricing used for member signups.</Text>
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

function WorkspacePlan({ subscription }: { subscription: ReturnType<typeof useSubscription>["subscription"] }) {
  return (
    <Surface style={styles.planPanel}>
      <View style={styles.planTopline}>
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
      </View>
      <View style={styles.divider} />
      <Text style={styles.sectionLabel}>Membership plans</Text>
      <Text style={styles.workspaceNote}>Member plans below are managed separately from workspace billing.</Text>
    </Surface>
  );
}

function MembershipPlanRow({ plan, canManage, onEdit, onToggle }: { plan: MembershipPlan; canManage: boolean; onEdit: () => void; onToggle: () => void }) {
  return (
    <View style={styles.planRow}>
      <View style={styles.planRowCopy}>
        <Text style={styles.planRowName}>{plan.name}</Text>
        <Text style={styles.planRowPrice}>{currency.format(plan.price)} / month</Text>
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
  const [validationError, setValidationError] = useState("");

  const submit = () => {
    const parsedPrice = Number(price);
    if (name.trim().length < 2) { setValidationError("Enter a plan name with at least two characters."); return; }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) { setValidationError("Enter a price greater than zero."); return; }
    setValidationError("");
    void onSave({ name: name.trim(), price: parsedPrice }, plan?.id);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View><Text style={styles.dialogTitle}>{plan ? "Edit membership plan" : "Add membership plan"}</Text><Text style={styles.dialogSubtitle}>Monthly pricing is charged when the member joins.</Text></View>
            <Pressable accessibilityLabel="Close dialog" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <DialogField label="Plan name" value={name} onChangeText={setName} placeholder="e.g. Strength" />
          <DialogField label="Monthly price" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

const styles = StyleSheet.create({
  primaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  planPanel: { flex: 1, minWidth: 300, padding: 22 },
  billingPanel: { width: 290, minWidth: 260, padding: 22 },
  planTopline: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 20 },
  planHeading: { flex: 1, gap: 8 },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  planNameRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
  planName: { color: colors.ink, fontSize: 22, fontWeight: "700" },
  planDescription: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 20 },
  sectionLabel: { color: colors.ink, fontSize: 11, fontWeight: "700", marginBottom: 8 },
  workspaceNote: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  billingIcon: { width: 32, height: 32, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft, marginBottom: 17 },
  billingTitle: { color: colors.muted, fontSize: 11 },
  renewalDate: { color: colors.ink, fontSize: 17, fontWeight: "700", marginTop: 5 },
  billingNote: { color: colors.muted, fontSize: 10, marginTop: 5 },
  billingMeta: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  metaText: { flex: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  usageTitleGroup: { gap: 4 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  sectionDescription: { color: colors.muted, fontSize: 10 },
  admissionFeePanel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, padding: 20 },
  admissionFeeHeading: { flex: 1, minWidth: 220, gap: 5 },
  admissionFeeControls: { flexDirection: "row", alignItems: "center", gap: 9 },
  admissionFeeInput: { width: 120, height: 38, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 12, color: colors.ink },
  admissionFeeValue: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  catalogHeader: { minHeight: 77, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 14 },
  planRow: { minHeight: 63, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  planRowCopy: { flex: 1, gap: 4 },
  planRowName: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  planRowPrice: { color: colors.muted, fontSize: 10 },
  planActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  iconButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: radii.small },
  loadingBlocks: { gap: 16 },
  workspaceSkeleton: { height: 190 },
  planSkeletonList: { padding: 18, gap: 9 },
  planRowSkeleton: { height: 42 },
  error: { color: colors.coral, fontSize: 11, padding: 14 },
  modalBackdrop: { flex: 1, minHeight: "100%", padding: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(19, 34, 26, 0.42)" },
  dialog: { width: "100%", maxWidth: 460, padding: 24, backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line },
  dialogHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 },
  dialogTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  dialogSubtitle: { color: colors.muted, fontSize: 11, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  dialogField: { gap: 6, marginBottom: 14 },
  fieldLabel: { color: colors.ink, fontSize: 11, fontWeight: "600", marginBottom: 7 },
  dialogInput: { height: 40, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 10, fontSize: 12, color: colors.ink },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 20 },
});