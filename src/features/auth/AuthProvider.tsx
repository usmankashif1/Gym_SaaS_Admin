import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

import { supabase } from "@/lib/supabase";
import { getCurrentGym, updateGymName as saveGymName, uploadGymLogo } from "@/services/gymService";

type AuthContextValue = {
  isConfigured: boolean;
  ready: boolean;
  session: Session | null;
  gymName: string;
  gymLogoUrl: string | null;
  gymRole: string | null;
  signIn: (email: string, password: string, logoFile?: File | null) => Promise<void>;
  signUp: (email: string, password: string, gymName: string, logoFile?: File | null) => Promise<boolean>;
  updateGymName: (name: string) => Promise<void>;
  updateGymLogo: (file: File) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [gymName, setGymName] = useState("Gym workspace");
  const [gymLogoUrl, setGymLogoUrl] = useState<string | null>(null);
  const [gymRole, setGymRole] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const refreshGymProfile = async () => {
      try {
        const gym = await getCurrentGym();
        if (mounted) {
          setGymName(gym.name);
          setGymLogoUrl(gym.logoUrl);
          setGymRole(gym.role);
        }
      } catch {
        if (mounted) {
          setGymName("Gym workspace");
          setGymLogoUrl(null);
          setGymRole(null);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
      if (nextSession) setTimeout(() => void refreshGymProfile(), 0);
      else {
        setGymName("Gym workspace");
        setGymLogoUrl(null);
        setGymRole(null);
      }
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setSession(null);
      else setSession(data.session);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    isConfigured: supabase !== null,
    ready,
    session,
    gymName,
    gymLogoUrl,
    gymRole,
    signIn: async (email, password, logoFile) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (logoFile) setGymLogoUrl(await uploadGymLogo(logoFile));
    },
    signUp: async (email, password, newGymName, logoFile) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { gym_name: newGymName } },
      });
      if (error) throw error;
      if (data.session && logoFile) setGymLogoUrl(await uploadGymLogo(logoFile));
      return data.session !== null;
    },
    updateGymName: async (name) => {
      const savedName = await saveGymName(name);
      setGymName(savedName);
    },
    updateGymLogo: async (file) => {
      setGymLogoUrl(await uploadGymLogo(file));
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}