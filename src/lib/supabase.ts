import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "https://your-project-id.supabase.co" &&
    !supabaseUrl.includes("your-project-id"),
);

// Resilient Supabase client with dummy fallback URL if unconfigured to prevent crash at import time
export const supabase: any = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/**
 * Upload a media file (Blob / File) to Supabase Storage and return its public URL.
 */
export async function uploadMedia(
  file: Blob | File,
  bucket: "post-media" | "avatars" | "campaign-media" | "community-media",
  path?: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    // If Supabase is not configured yet, convert blob to object URL for local preview
    const url = URL.createObjectURL(file);
    return { url, error: null };
  }

  try {
    const ext = file.type.split("/")[1] || "jpg";
    const filename = path || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
    return { url: data.publicUrl, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Storage upload failed";
    return { url: null, error: message };
  }
}
