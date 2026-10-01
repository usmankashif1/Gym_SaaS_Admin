import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { GymLogoPicker } from "@/components/forms/GymLogoPicker";
import { useAuth } from "@/features/auth/AuthProvider";
import { colors, radii } from "@/theme/tokens";

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [gymName, setGymName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "sign-up") {
        const signedIn = await signUp(email.trim(), password, gymName.trim(), logoFile);
        if (!signedIn) setMessage(logoFile ? "Confirm your email, then sign in here to finish uploading the selected logo." : "Check your inbox to confirm your email, then sign in.");
      } else {
        await signIn(email.trim(), password, logoFile);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = Boolean(email.trim() && password.length >= 6 && (mode === "sign-in" || gymName.trim()));

  return (
    <View style={styles.page}>
      <View style={styles.form}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>G</Text></View>
          <Text style={styles.brandName}>GymFlow</Text>
        </View>
        <Text style={styles.eyebrow}>GYM MANAGEMENT</Text>
        <Text style={styles.title}>{mode === "sign-in" ? "Welcome back" : "Set up your workspace"}</Text>
        <Text style={styles.subtitle}>{mode === "sign-in" ? "Sign in to manage your gym." : "Create an account for your gym team."}</Text>

        {mode === "sign-up" ? <Field label="Gym name" value={gymName} onChangeText={setGymName} placeholder="Your gym name" /> : null}
        {mode === "sign-up" ? <GymLogoPicker file={logoFile} onChange={setLogoFile} /> : null}
        <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry />

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        <Pressable accessibilityRole="button" disabled={!canSubmit || busy} onPress={() => void submit()} style={[styles.submit, (!canSubmit || busy) && styles.submitDisabled]}>
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitLabel}>{mode === "sign-in" ? "Sign in" : "Create account"}</Text>}
        </Pressable>
        <View style={styles.switchRow}>
          <Text style={styles.switchCopy}>{mode === "sign-in" ? "New to GymFlow?" : "Already have an account?"}</Text>
          <Pressable onPress={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setMessage(""); }}>
            <Text style={styles.switchAction}>{mode === "sign-in" ? "Create account" : "Sign in"}</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.footer}>GymFlow · Memberships, payments, and a clearer picture of your gym.</Text>
    </View>
  );
}

function Field({ label, ...inputProps }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput {...inputProps} autoCapitalize="none" autoCorrect={false} placeholderTextColor="#99A39D" style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: "100%", backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center", padding: 24 },
  form: { width: "100%", maxWidth: 420, padding: 32, borderWidth: 1, borderColor: colors.line, borderRadius: radii.medium, backgroundColor: colors.surface },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 34 },
  brandMark: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#A6DDB8" },
  brandMarkText: { color: colors.sidebar, fontSize: 18, fontWeight: "800" },
  brandName: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  eyebrow: { color: colors.green, fontSize: 14, fontWeight: "700", letterSpacing: 1, marginBottom: 9 },
  title: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 14, marginTop: 6, marginBottom: 25 },
  field: { gap: 7, marginBottom: 16 },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  input: { minHeight: 43, borderWidth: 1, borderColor: "#DDE3DF", borderRadius: radii.small, paddingHorizontal: 12, color: colors.ink, fontSize: 14 },
  submit: { height: 44, borderRadius: radii.small, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, marginTop: 5 },
  submitDisabled: { opacity: 0.55 },
  submitLabel: { color: colors.surface, fontSize: 14, fontWeight: "700" },
  error: { color: colors.coral, fontSize: 14, marginBottom: 12 },
  message: { color: colors.green, fontSize: 14, marginBottom: 12 },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 20 },
  switchCopy: { color: colors.muted, fontSize: 14 },
  switchAction: { color: colors.green, fontSize: 14, fontWeight: "700" },
  footer: { position: "absolute", bottom: 20, color: colors.muted, fontSize: 14, textAlign: "center" },
});