import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string | null;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, username, role, active, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        setProfileError("Não foi possível carregar seu perfil.");
        return;
      }
      setProfile((data as UserProfile) ?? null);
      setProfileError(null);
    } catch {
      setProfileError("Não foi possível carregar seu perfil.");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
        if (data.session?.user) {
          void loadProfile(data.session.user.id);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        // Must stay synchronous: no await inside this callback.
        setSession(nextSession);
        if (nextSession?.user) {
          void loadProfile(nextSession.user.id);
        } else {
          setProfile(null);
          setProfileError(null);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    const handle = username.trim();
    if (!handle || !password) {
      return { error: "Usuário ou senha incorretos." };
    }

    const { data: email, error: lookupError } = await supabase.rpc(
      "login_email_for_username",
      { p_username: handle }
    );

    if (lookupError) {
      return { error: "Não foi possível entrar. Tente novamente." };
    }

    if (!email) {
      return { error: "Usuário ou senha incorretos." };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email as string,
      password,
    });

    if (error) {
      return { error: "Usuário ou senha incorretos." };
    }

    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      profileError,
      isAdmin: profile?.role === "admin",
      signIn,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, profileError, signIn, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}