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
import { useRiff } from "./store";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = "creator" | "brand" | "moderator" | "admin" | "super_admin" | "owner";

export const PLATFORM_OWNER_EMAIL = "abhishekgawadeag.92@gmail.com";

export function isPlatformOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return (
    normalized === PLATFORM_OWNER_EMAIL ||
    normalized === "abhishekgawade@gmail.com" ||
    normalized.startsWith("abhishekgawadeag.92") ||
    normalized.startsWith("abhishekgawade")
  );
}

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

// Default authentic profile for local unconfigured states (Abhishek Gawade - Platform Owner)
const DEFAULT_PROFILE: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "abhishek",
  display_name: "Abhishek Gawade",
  avatar_url: "/memes/cat.jpg",
  bio: "Platform Owner & Founder · RIFF Studio",
  role: "owner",
  is_verified: true,
  instagram_handle: "abhishek.riff",
  instagram_verified: true,
  followers_count: 12480,
  following_count: 482,
  campaigns_completed: 12,
  total_earnings: 284000.0,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    if (!isSupabaseConfigured) {
      setProfile(DEFAULT_PROFILE);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const p = data as Profile;
        setProfile(p);
        useRiff.getState().setProfile({
          name: p.display_name,
          handle: p.username,
          role: p.role,
          bio: p.bio || undefined,
          instagramHandle: p.instagram_handle || undefined,
        });
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
        if (created) {
          const cp = created as Profile;
          setProfile(cp);
          useRiff.getState().setProfile({
            name: cp.display_name,
            handle: cp.username,
            role: cp.role,
          });
        }
      }
    } catch {
      setProfile(DEFAULT_PROFILE);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("riff_active_user");
          if (cached) {
            const parsed = JSON.parse(cached);
            const isOwner = isPlatformOwnerEmail(parsed.email) || isPlatformOwnerEmail(parsed.username) || parsed.username === "abhishek";
            if (isOwner) {
              parsed.role = "owner";
              parsed.display_name = "Abhishek Gawade";
              parsed.username = "abhishek";
              parsed.bio = "Platform Owner & Founder · RIFF Studio";
            }
            setProfile(parsed);
            useRiff.getState().setProfile({
              name: parsed.display_name,
              handle: parsed.username,
              role: parsed.role,
              bio: parsed.bio || undefined,
              instagramHandle: parsed.instagram_handle || undefined,
            });
            setLoading(false);
            return;
          }
        } catch {}
      }
      setProfile(DEFAULT_PROFILE);
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
      const isOwner = isPlatformOwnerEmail(email);
      const derivedName = isOwner ? "Abhishek Gawade" : (email.split("@")[0] || "Creator");
      const derivedUsername = isOwner ? "abhishek" : derivedName.toLowerCase().replace(/[^a-z0-9_]/g, "");
      const derivedRole: UserRole = isOwner ? "owner" : "creator";
      const localUser = {
        id: isOwner ? "owner_abhishek" : ("local_user_" + Math.random().toString(36).substring(2, 9)),
        email,
        app_metadata: {},
        user_metadata: { full_name: derivedName },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as any;
      const localProfile: Profile = {
        ...DEFAULT_PROFILE,
        id: localUser.id,
        display_name: derivedName,
        username: derivedUsername,
        role: derivedRole,
        bio: isOwner ? "Platform Owner & Founder · RIFF Studio" : "Creator on RIFF",
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}&backgroundColor=d4ff00`,
      };
      setUser(localUser);
      setProfile(localProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("riff_active_user", JSON.stringify(localProfile));
        } catch {}
      }
      useRiff.getState().setProfile({
        name: derivedName,
        handle: derivedUsername,
        role: derivedRole,
        bio: localProfile.bio,
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

    const email = info?.email?.trim() || PLATFORM_OWNER_EMAIL;
    const isOwner = isPlatformOwnerEmail(email);
    const name = info?.name?.trim() || (isOwner ? "Abhishek Gawade" : "Google Creator");
    const username = isOwner ? "abhishek" : ((email.split("@")[0] || "google_creator").toLowerCase().replace(/[^a-z0-9_]/g, ""));
    const assignedRole: UserRole = isOwner ? "owner" : "creator";
    const avatarUrl =
      info?.avatarUrl ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=4285f4`;

    const googleUser = {
      id: isOwner ? "owner_abhishek" : ("google_user_" + Math.random().toString(36).substring(2, 9)),
      email,
      app_metadata: {},
      user_metadata: { full_name: name, avatar_url: avatarUrl },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as any;

    const newProfile: Profile = {
      ...DEFAULT_PROFILE,
      id: googleUser.id,
      display_name: name,
      username,
      avatar_url: avatarUrl,
      role: assignedRole,
      bio: isOwner ? "Platform Owner & Founder · RIFF Studio" : "Creator on RIFF",
    };

    setUser(googleUser);
    setProfile(newProfile);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("riff_active_user", JSON.stringify(newProfile));
      } catch {}
    }
    useRiff.getState().setProfile({
      name,
      handle: username,
      role: assignedRole,
      bio: newProfile.bio,
    });
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
    const isOwner = isPlatformOwnerEmail(email) || options.username.toLowerCase() === "abhishek";
    const assignedRole: UserRole = isOwner ? "owner" : options.role;
    const finalDisplayName = isOwner ? "Abhishek Gawade" : options.displayName;
    const finalUsername = isOwner ? "abhishek" : options.username;

    if (!isSupabaseConfigured) {
      const newUser = {
        id: isOwner ? "owner_abhishek" : ("usr_" + Math.random().toString(36).substring(2, 9)),
        email,
        app_metadata: {},
        user_metadata: {
          username: finalUsername,
          display_name: finalDisplayName,
          role: assignedRole,
        },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as any;
      const newProfile: Profile = {
        ...DEFAULT_PROFILE,
        id: newUser.id,
        username: finalUsername,
        display_name: finalDisplayName,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(finalDisplayName)}&backgroundColor=d4ff00`,
        bio: isOwner
          ? "Platform Owner & Founder · RIFF Studio"
          : `${assignedRole === "creator" ? "Creator" : assignedRole === "brand" ? "Brand Partner" : "Administrator"} on RIFF`,
        role: assignedRole,
        is_verified: isOwner,
        instagram_handle: options.instagramHandle || (isOwner ? "abhishek.riff" : null),
        instagram_verified: isOwner,
        followers_count: isOwner ? 12480 : 0,
        following_count: isOwner ? 482 : 0,
        campaigns_completed: isOwner ? 12 : 0,
        total_earnings: isOwner ? 284000 : 0,
        created_at: new Date().toISOString(),
      };
      setUser(newUser);
      setProfile(newProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("riff_active_user", JSON.stringify(newProfile));
        } catch {}
      }
      useRiff.getState().setProfile({
        name: finalDisplayName,
        handle: finalUsername,
        role: assignedRole,
        bio: newProfile.bio,
        instagramHandle: newProfile.instagram_handle || undefined,
      });
      return { error: null };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: finalUsername,
          display_name: finalDisplayName,
          role: assignedRole,
        },
      },
    });

    if (error) return { error: error.message };

    if (data.user) {
      // Create profile row in database
      const profileInsert: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: data.user.id,
        username: finalUsername,
        display_name: finalDisplayName,
        role: assignedRole,
        instagram_handle: options.instagramHandle || (isOwner ? "abhishek.riff" : null),
      };

      await supabase.from("profiles").insert(profileInsert);

      // Initialize creator wallet
      await supabase.from("wallets").insert({
        user_id: data.user.id,
        available_balance: isOwner ? 284000 : 0,
        pending_balance: 0,
        lifetime_earnings: isOwner ? 284000 : 0,
        total_withdrawn: 0,
      });

      // If brand, initialize brand profile
      if (assignedRole === "brand") {
        await supabase.from("brands").insert({
          owner_id: data.user.id,
          company_name: finalDisplayName,
        } as any);
      }

      useRiff.getState().setProfile({
        name: finalDisplayName,
        handle: finalUsername,
        role: assignedRole,
        instagramHandle: options.instagramHandle || (isOwner ? "abhishek.riff" : undefined),
      });
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
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("riff_active_user");
      } catch {}
    }
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
