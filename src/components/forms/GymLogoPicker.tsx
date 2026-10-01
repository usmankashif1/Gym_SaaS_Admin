import { ImagePlus, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

type GymLogoPickerProps = {
  file: File | null;
  currentLogoUrl?: string | null;
  onChange: (file: File | null) => void;
};

export function GymLogoPicker({ file, currentLogoUrl = null, onChange }: GymLogoPickerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseLogo = () => {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = "image/png,image/jpeg,image/webp";
    picker.onchange = () => {
      const selected = picker.files?.[0];
      if (!selected) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type)) {
        setError("Choose a PNG, JPEG, or WebP image.");
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        setError("The gym logo must be 2 MB or smaller.");
        return;
      }
      setError("");
      setPreview(URL.createObjectURL(selected));
      onChange(selected);
    };
    picker.click();
  };

  const imageUri = preview ?? currentLogoUrl;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Gym logo <Text style={styles.optional}>Optional</Text></Text>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={chooseLogo} style={styles.picker}>
          <View style={styles.preview}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <ImagePlus size={18} color={colors.green} />}
          </View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.title}>{file?.name ?? (currentLogoUrl ? "Change gym logo" : "Upload gym logo")}</Text>
            <Text style={styles.hint}>PNG, JPEG, WebP · up to 2 MB</Text>
          </View>
        </Pressable>
        {file ? <Pressable accessibilityLabel="Remove selected gym logo" onPress={() => { setPreview(null); setError(""); onChange(null); }} style={styles.clear}><X size={15} color={colors.muted} /></Pressable> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 7, marginBottom: 16 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  optional: { color: colors.muted, fontSize: 14, fontWeight: "400" },
  row: { flexDirection: "row", alignItems: "center", gap: 7 },
  picker: { flex: 1, minWidth: 0, minHeight: 56, borderWidth: 1, borderColor: "#DDE3DF", borderStyle: "dashed", borderRadius: radii.small, padding: 8, flexDirection: "row", alignItems: "center", gap: 9 },
  preview: { width: 38, height: 38, borderRadius: 6, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: colors.greenSoft },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  hint: { color: colors.muted, fontSize: 14 },
  clear: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  error: { color: colors.coral, fontSize: 14 },
});