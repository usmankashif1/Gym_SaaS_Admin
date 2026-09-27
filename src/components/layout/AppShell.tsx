import { usePathname, useRouter } from "expo-router";
import { CreditCard, LayoutDashboard, LogOut, Settings, UsersRound, WalletCards } from "lucide-react-native";
import type { PropsWithChildren, ReactNode } from "react";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useAuth } from "@/features/auth/AuthProvider";
import { GymSettingsDialog } from "@/features/settings/GymSettingsDialog";
import { colors, radii } from "@/theme/tokens";

const navigation = [
  { label: "Dashboard", href: "/", Icon: LayoutDashboard },
  { label: "Members", href: "/members", Icon: UsersRound },
  { label: "Payments", href: "/payments", Icon: CreditCard },
  { label: "Subscription", href: "/subscription", Icon: WalletCards },
] as const;

type AppShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  action?: ReactNode;
}>;

export function AppShell({ title, subtitle, action, children }: AppShellProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { gymName, gymLogoUrl, gymRole, session, signOut, updateGymName, updateGymLogo } = useAuth();
  const isCompact = width < 760;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const saveGymSettings = async (name: string, logoFile: File | null) => {
    setSavingSettings(true);
    setSettingsError("");
    try {
      if (name !== gymName) await updateGymName(name);
      if (logoFile) await updateGymLogo(logoFile);
      setSettingsOpen(false);
    } catch (caught) {
      setSettingsError(caught instanceof Error ? caught.message : "Could not update gym details.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <View style={styles.frame}>
      {!isCompact ? (
        <Sidebar
          pathname={pathname}
          gymName={gymName}
          gymLogoUrl={gymLogoUrl}
          email={session?.user.email ?? ""}
          canManageGym={gymRole === "owner"}
          onOpenSettings={() => { setSettingsError(""); setSettingsOpen(true); }}
          onSignOut={() => void signOut()}
        />
      ) : null}
      <View style={styles.main}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isCompact ? <WorkspaceIdentity gymName={gymName} gymLogoUrl={gymLogoUrl} compact /> : null}
          <View style={styles.pageHeader}>
            <View style={styles.headingCopy}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {action ? <View style={styles.headerAction}>{action}</View> : null}
          </View>
          {children}
        </ScrollView>
        {isCompact ? <MobileNavigation pathname={pathname} /> : null}
      </View>
      {settingsOpen ? (
        <GymSettingsDialog
          gymName={gymName}
          gymLogoUrl={gymLogoUrl}
          saving={savingSettings}
          error={settingsError}
          onClose={() => setSettingsOpen(false)}
          onSave={saveGymSettings}
        />
      ) : null}
    </View>
  );
}

function WorkspaceIdentity({ gymName, gymLogoUrl, compact = false }: { gymName: string; gymLogoUrl: string | null; compact?: boolean }) {
  return (
    <View style={[styles.workspaceIdentity, compact && styles.compactIdentity]}>
      <View style={styles.workspaceMark}>
        {gymLogoUrl ? <Image accessibilityLabel={`${gymName} logo`} source={{ uri: gymLogoUrl }} style={styles.workspaceImage} /> : <Text style={styles.workspaceInitial}>G</Text>}
      </View>
      <Text numberOfLines={1} style={[styles.workspaceName, compact && styles.compactWorkspaceName]}>{gymName}</Text>
    </View>
  );
}

function Sidebar({ pathname, gymName, gymLogoUrl, email, canManageGym, onOpenSettings, onSignOut }: { pathname: string; gymName: string; gymLogoUrl: string | null; email: string; canManageGym: boolean; onOpenSettings: () => void; onSignOut: () => void }) {
  const router = useRouter();
  return (
    <View style={styles.sidebar}>
      <WorkspaceIdentity gymName={gymName} gymLogoUrl={gymLogoUrl} />
      <Text style={styles.navCaption}>WORKSPACE</Text>
      <View style={styles.navList}>
        {navigation.map(({ label, href, Icon }) => {
          const selected = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Pressable key={href} accessibilityRole="link" onPress={() => router.push(href)} style={[styles.navItem, selected && styles.navItemSelected]}>
              <Icon size={18} color={selected ? "#C4E8D0" : colors.sidebarMuted} strokeWidth={1.8} />
              <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.sidebarFooter}>
        <Text style={styles.poweredBy}>Powered by <Text style={styles.poweredBrand}>GymFlow</Text></Text>
        <View style={styles.accountCard}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.accountEmail}>{email}</Text>
          {canManageGym ? <Pressable accessibilityLabel="Gym settings" accessibilityRole="button" onPress={onOpenSettings} style={styles.settingsButton}><Settings size={16} color={colors.sidebarMuted} /></Pressable> : null}
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutPressed]}>
          <LogOut size={16} color="#D8948E" />
          <Text style={styles.signOutLabel}>Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MobileNavigation({ pathname }: { pathname: string }) {
  const router = useRouter();
  return (
    <View style={styles.mobileNavigation}>
      {navigation.map(({ label, href, Icon }) => {
        const selected = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Pressable key={href} accessibilityRole="link" onPress={() => router.push(href)} style={styles.mobileNavItem}>
            <Icon size={19} color={selected ? colors.green : colors.muted} strokeWidth={1.8} />
            <Text style={[styles.mobileNavLabel, selected && styles.mobileNavLabelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minHeight: "100%", flexDirection: "row", backgroundColor: colors.canvas },
  sidebar: { width: 232, backgroundColor: colors.sidebar, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 14 },
  workspaceIdentity: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 31, paddingHorizontal: 7 },
  compactIdentity: { marginBottom: 3, paddingHorizontal: 0 },
  workspaceMark: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: "#DDEBE1" },
  workspaceImage: { width: "100%", height: "100%", resizeMode: "cover" },
  workspaceInitial: { color: colors.sidebar, fontSize: 20, fontWeight: "800" },
  workspaceName: { flex: 1, minWidth: 0, color: "#F4F6F4", fontSize: 16, fontWeight: "700" },
  compactWorkspaceName: { color: colors.ink, fontSize: 16 },
  navCaption: { color: "#809087", fontSize: 10, fontWeight: "700", letterSpacing: 1, paddingHorizontal: 9, marginBottom: 11 },
  navList: { gap: 5 },
  navItem: { minHeight: 43, borderRadius: radii.small, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  navItemSelected: { backgroundColor: "#283A31" },
  navLabel: { color: colors.sidebarMuted, fontSize: 13, fontWeight: "500" },
  navLabelSelected: { color: "#F2F7F3", fontWeight: "600" },
  sidebarFooter: { marginTop: "auto", borderTopColor: "#34443B", borderTopWidth: 1, paddingTop: 16, gap: 9 },
  poweredBy: { color: "#87958D", fontSize: 10, paddingHorizontal: 3 },
  poweredBrand: { color: "#A9D8B8", fontWeight: "700" },
  accountCard: { minHeight: 4, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(8, 15, 11, 0.32)", borderWidth: 1, borderColor: "#394A40", borderRadius: 8, paddingLeft: 9, paddingRight: 4 },
  accountEmail: { flex: 1, minWidth: 0, color: "#E2E9E4", fontSize: 11, fontWeight: "500" },
  settingsButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  signOutButton: { width: "100%", minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 7, paddingHorizontal: 11 },
  signOutPressed: { backgroundColor: "rgba(191, 82, 74, 0.16)" },
  signOutLabel: { color: "#F2F7F3", fontSize: 12, fontWeight: "600" },
  main: { flex: 1, minWidth: 0 },
  scrollContent: { width: "100%", maxWidth: 1440, alignSelf: "center", paddingHorizontal: 34, paddingTop: 30, paddingBottom: 42, gap: 24 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  headingCopy: { flex: 1, gap: 5 },
  title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  headerAction: { alignItems: "flex-end" },
  mobileNavigation: { minHeight: 64, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingHorizontal: 4, paddingBottom: 4 },
  mobileNavItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, minHeight: 58 },
  mobileNavLabel: { color: colors.muted, fontSize: 9, fontWeight: "500" },
  mobileNavLabelSelected: { color: colors.green, fontWeight: "700" },
});