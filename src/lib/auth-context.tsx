import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";
import type { Database } from "./database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = "creator" | "brand" | "admin";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: (info?: { email?: string; name?: string; avatarUrl?: string }) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    options: {
      username: string;
      displayName: string;
      role: UserRole;
      instagramHandle?: string;
    },
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fallback demo profile for local unconfigured states
const DEMO_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "you",
  display_name: "You",
  avatar_url: "/memes/cat.jpg",
  bio: "Creator on RIFF",
  role: "creator",
  is_verified: true,
  instagram_handle: "you.riff",
  instagram_verified: true,
  followers_count: 1240,
  following_count: 88,
  campaigns_completed: 4,
  total_earnings: 12400.0,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    if (!isSupabaseConfigured) {
      setProfile(DEMO_PROFILE);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        // If profile doesn't exist yet, create default
        const newProfile: Database["public"]["Tables"]["profiles"]["Insert"] = {
          id: userId,
          username: `user_${userId.substring(0, 6)}`,
          display_name: "Creator",
          role: "creator",
        };
        const { data: created } = await supabase
          .from("profiles")
          .insert(newProfile as any)
          .select()
          .single();
        if (created) setProfile(created as Profile);
      }
    } catch {
      setProfile(DEMO_PROFILE);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }: any) => {
      const session = data?.session;
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      // Local fallback for smooth testing
      const testUser = {
        id: "local_user_" + Math.random().toString(36).substring(2, 9),
        email,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as any;
      setUser(testUser);
      setProfile({
        ...DEMO_PROFILE,
        id: testUser.id,
        display_name: email.split("@")[0] || "Creator",
        username: (email.split("@")[0] || "creator").toLowerCase().replace(/[^a-z0-9_]/g, ""),
      });
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signInWithGoogle(info?: { email?: string; name?: string; avatarUrl?: string }) {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      return { error: error?.message ?? null };
    }

    const email = info?.email?.trim() || "creator@gmail.com";
    const name = info?.name?.trim() || "Google Creator";
    const username = (email.split("@")[0] || "google_creator").toLowerCase().replace(/[^a-z0-9_]/g, "");
    const avatarUrl =
      info?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4285f4`;

    const googleUser = {
      id: "google_user_" + Math.random().toString(36).substring(2, 9),
      email,
      app_metadata: {},
      user_metadata: { full_name: name, avatar_url: avatarUrl },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;

    const newProfile: Profile = {
      ...DEMO_PROFILE,
      id: googleUser.id,
      display_name: name,
      username,
      avatar_url: avatarUrl,
    };

    setUser(googleUser);
    setProfile(newProfile);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("riff_active_user", JSON.stringify(newProfile));
      } catch {}
    }
    return { error: null };
  }

  async function signUp(
    email: string,
    password: string,
    options: {
      username: string;
      displayName: string;
      role: UserRole;
      instagramHandle?: string;
    },
  ) {
    if (!isSupabaseConfigured) {
      return { error: "Supabase credentials not configured in .env" };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: options.username,
          display_name: options.displayName,
          role: options.role,
        },
      },
    });

    if (error) return { error: error.message };

    if (data.user) {
      // Create profile row in database
      const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: data.user.id,
        username: options.username,
        display_name: options.displayName,
        role: options.role,
        instagram_handle: options.instagramHandle || null,
      };

      await supabase.from("profiles").insert(profileInsert);

      // Initialize creator wallet
      await supabase.from("wallets").insert({
        user_id: data.user.id,
        available_balance: 0,
        pending_balance: 0,
        lifetime_earnings: 0,
        total_withdrawn: 0,
      });

      // If brand, initialize brand profile
      if (options.role === "brand") {
        await supabase.from("brands").insert({
          owner_id: data.user.id,
          company_name: options.displayName,
        } as any);
      }
    }

    return { error: null };
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!profile) return { error: "No active profile to update" };
    if (!isSupabaseConfigured) {
      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      return { error: null };
    }
    const { error } = await supabase
      .from("profiles")
      .update(updates as any)
      .eq("id", profile.id);
    if (error) return { error: error.message };
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
    return { error: null };
  }

  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? "creator",
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
