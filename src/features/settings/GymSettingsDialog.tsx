import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { GymLogoPicker } from "@/components/forms/GymLogoPicker";
import { Button } from "@/components/ui/Button";
import { colors, radii } from "@/theme/tokens";

export function GymSettingsDialog({ gymName, gymLogoUrl, saving, error, onClose, onSave }: {
  gymName: string;
  gymLogoUrl: string | null;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (name: string, logoFile: File | null) => Promise<void>;
}) {
  const [name, setName] = useState(gymName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");

  const submit = () => {
    const normalizedName = name.trim();
    if (normalizedName.length < 2 || normalizedName.length > 100) {
      setValidationError("Gym name must be between 2 and 100 characters.");
      return;
    }
    setValidationError("");
    void onSave(normalizedName, logoFile);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView style={styles.modalScroll} contentContainerStyle={styles.backdrop} keyboardShouldPersistTaps="handled">
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Gym settings</Text>
              <Text style={styles.subtitle}>Update the name and logo shown in your workspace.</Text>
            </View>
            <Pressable accessibilityLabel="Close settings" onPress={onClose} style={styles.closeButton}><X size={17} color={colors.muted} /></Pressable>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Gym name</Text>
            <TextInput value={name} onChangeText={setName} maxLength={100} placeholder="Gym name" placeholderTextColor="#89948D" style={styles.input} />
          </View>
          <GymLogoPicker file={logoFile} currentLogoUrl={gymLogoUrl} onChange={setLogoFile} />
          {validationError || error ? <Text accessibilityRole="alert" style={styles.error}>{validationError || error}</Text> : null}
          <View style={styles.actions}>
            <Button variant="secondary" onPress={onClose}>Cancel</Button>
            <Button disabled={saving} onPress={submit}>{saving ? "Saving..." : "Save changes"}</Button>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalScroll: { flex: 1 },
  backdrop: { flexGrow: 1, padding: 18, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(19, 34, 26, 0.42)" },
  dialog: { width: "100%", maxWidth: 460, padding: 24, backgroundColor: colors.surface, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 21 },
  title: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  closeButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  field: { gap: 7, marginBottom: 16 },
  label: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  input: { height: 42, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 11, fontSize: 12, color: colors.ink },
  error: { color: colors.coral, fontSize: 11, marginTop: 6 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 9, marginTop: 10 },
});