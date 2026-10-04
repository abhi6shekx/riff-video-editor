import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Sparkles,
  Camera,
  Upload,
  AtSign,
  User,
  Instagram,
  Clapperboard,
  Flame,
  Music2,
  Cpu,
  Gamepad2,
  Shirt,
  UtensilsCrossed,
  Palette,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { RiffNavbarLockup } from "@/components/riff-navbar-lockup";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth, isPlatformOwnerEmail } from "@/lib/auth-context";
import { useRiff } from "@/lib/store";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: ProfileOnboardingPage,
  head: () => ({ meta: [{ title: "Create Your Profile · RIFF" }] }),
});

const DEFAULT_AVATARS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=RiffHero&backgroundColor=1e1e24",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=ffd5dc",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aiden&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/micah/svg?seed=Luna&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/bottts/svg?seed=CyberBeast&backgroundColor=4f46e5",
  "https://api.dicebear.com/7.x/initials/svg?seed=RIFF&backgroundColor=d4ff00&textColor=000000",
];

const CONTENT_CATEGORIES = [
  { id: "reels", name: "Viral Reels", icon: Clapperboard, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  { id: "memes", name: "Memes & Humor", icon: Flame, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { id: "music", name: "Music & Beats", icon: Music2, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  { id: "tech", name: "Tech & AI", icon: Cpu, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  { id: "gaming", name: "Gaming & Clips", icon: Gamepad2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  { id: "fashion", name: "Fashion & Style", icon: Shirt, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
  { id: "food", name: "Food & Travel", icon: UtensilsCrossed, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { id: "art", name: "Art & Motion", icon: Palette, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
];

const BIO_TEMPLATES = [
  "🎬 Video Creator & Editor | Creating viral reels daily",
  "😂 Meme lord & humor enthusiast | Culture & trends",
  "⚡ Tech geek, AI explorer & digital artist",
  "🎵 Music producer & sound designer on RIFF",
];

const RESERVED_HANDLES = new Set([
  "admin",
  "owner",
  "riff",
  "riffapp",
  "support",
  "moderator",
  "mod",
  "root",
  "help",
  "api",
  "system",
  "official",
  "null",
  "undefined",
]);

function ProfileOnboardingPage() {
  const navigate = useNavigate();
  const { user, profile: authProfile, updateProfile } = useAuth();
  const riffProfile = useRiff((s) => s.profile);
  const setRiffProfile = useRiff((s) => s.setProfile);
  const people = useRiff((s) => s.people) || [];

  const isOwner = user?.email ? isPlatformOwnerEmail(user.email) : false;

  // Initialize fields with existing user data or Google metadata
  const initialName =
    user?.user_metadata?.full_name ||
    authProfile?.display_name ||
    (isOwner ? riffProfile?.name : "") ||
    "";

  const initialEmail = user?.email || "";
  const suggestedHandle = initialEmail
    ? initialEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "")
    : initialName.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15);

  const initialAvatar =
    authProfile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    (isOwner ? riffProfile?.avatarUrl : undefined) ||
    DEFAULT_AVATARS[0];

  const [name, setName] = useState(initialName || "");
  const [handle, setHandle] = useState(
    (isOwner ? riffProfile?.handle : undefined) || suggestedHandle || ""
  );
  const [bio, setBio] = useState(
    (isOwner ? riffProfile?.bio : undefined) || "Creating awesome videos & reels on RIFF 🎬"
  );
  const [instagramHandle, setInstagramHandle] = useState(
    isOwner ? (riffProfile?.instagramHandle || "") : (authProfile?.instagram_handle || "")
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["reels", "memes"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size should be less than 5MB.");
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        playSound("pop");
        toast.success("Profile photo updated!");
      }
      setIsUploadingPhoto(false);
    };
    reader.onerror = () => {
      toast.error("Failed to read image file.");
      setIsUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  }

  // Live handle uniqueness and validity check
  const handleStatus = useMemo(() => {
    const normalized = handle.trim().toLowerCase();
    if (!normalized) return { valid: false, message: "Handle is required" };
    if (normalized.length < 3) return { valid: false, message: "Minimum 3 characters" };
    if (normalized.length > 20) return { valid: false, message: "Maximum 20 characters" };
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      return { valid: false, message: "Letters, numbers, and _ only" };
    }
    if (RESERVED_HANDLES.has(normalized)) {
      return { valid: false, message: `@${normalized} is reserved` };
    }
    if (normalized === "abhishek" && !isOwner) {
      return { valid: false, message: `@abhishek is reserved for platform owner` };
    }

    // Check existing registered creators in store
    const isTaken = people.some(
      (p) => p.handle.toLowerCase() === normalized && p.id !== user?.id
    );
    if (isTaken && !isOwner) {
      return { valid: false, message: `@${normalized} is already taken` };
    }

    // Check localStorage registered handles
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("riff_registered_handles") || "{}");
        const currentOwner = stored[normalized];
        if (currentOwner && currentOwner !== user?.email && currentOwner !== user?.id) {
          return { valid: false, message: `@${normalized} is already taken` };
        }
      } catch {}
    }

    return { valid: true, message: "Available" };
  }, [handle, isOwner, people, user]);

  useEffect(() => {
    if (user?.user_metadata?.full_name && !name) {
      setName(user.user_metadata.full_name);
    }
    if (user?.user_metadata?.avatar_url && avatarUrl === DEFAULT_AVATARS[0]) {
      setAvatarUrl(user.user_metadata.avatar_url);
    }
  }, [user]);

  function handleHandleChange(val: string) {
    // Sanitize: lowercase, alphanumeric and underscores only, max 20 chars
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
    setHandle(cleaned);
  }

  function toggleCategory(catId: string) {
    playSound("pop");
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  }

  async function handleCompleteProfile(skipValidation = false) {
    if (!skipValidation) {
      if (!name.trim()) {
        toast.error("Please enter your display name.");
        return;
      }
      if (!handleStatus.valid) {
        toast.error(handleStatus.message || "Username handle must be unique and valid.");
        return;
      }
    }

    setIsSubmitting(true);
    playSound("pop");

    const finalName = name.trim() || "RIFF Creator";
    const finalHandle = handle.trim() || "creator";
    const finalBio = bio.trim() || "Creating viral content on RIFF";
    const finalRole = isOwner ? "owner" : "creator";
    const finalInstagram = instagramHandle.trim().replace(/^@/, "");

    try {
      // 1. Update zustand store
      setRiffProfile({
        name: finalName,
        handle: finalHandle,
        bio: finalBio,
        avatarUrl,
        instagramHandle: finalInstagram || undefined,
        role: finalRole,
      });

      // 2. Update auth context profile
      if (updateProfile) {
        await updateProfile({
          display_name: finalName,
          username: finalHandle,
          bio: finalBio,
          avatar_url: avatarUrl,
          instagram_handle: finalInstagram || null,
        });
      }

      // 3. Mark profile creation completed in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("riff_profile_done", "true");
        if (user?.email) {
          localStorage.setItem(`riff_profile_done_${user.email}`, "true");
        }
        try {
          const currentStored = localStorage.getItem("riff_active_user");
          const parsed = currentStored ? JSON.parse(currentStored) : {};
          localStorage.setItem(
            "riff_active_user",
            JSON.stringify({
              ...parsed,
              display_name: finalName,
              username: finalHandle,
              bio: finalBio,
              avatar_url: avatarUrl,
              role: finalRole,
            })
          );
        } catch {}

        try {
          const registered = JSON.parse(localStorage.getItem("riff_registered_handles") || "{}");
          registered[finalHandle.toLowerCase()] = user?.email || user?.id || finalHandle;
          localStorage.setItem("riff_registered_handles", JSON.stringify(registered));
        } catch {}
      }

      // Confetti & celebratory sound
      fireConfetti();
      playSound("cheer");

      toast.success(`🎉 Profile created! Welcome to RIFF, ${finalName}!`);

      // Navigate to homepage feed
      void navigate({ to: "/" });
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error("Could not save profile. Continuing anyway.");
      void navigate({ to: "/" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-dvh bg-bg text-fg py-10 px-4">
      {/* Background ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-96 rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        {/* Header Lockup */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link to="/" className="mb-4 hover:opacity-90 transition-opacity">
            <RiffNavbarLockup size={46} />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-semibold mb-3">
            <Sparkles className="size-3.5" />
            <span>Profile Creation</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-black tracking-tight text-fg">
            Complete Your Creator Profile
          </h1>
          <p className="mt-1 text-xs md:text-sm text-muted max-w-md">
            Set up your public identity, unique handle, and content niches before stepping into the feed.
          </p>
        </div>

        {/* Setup Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-2xl space-y-7">
          {/* 1. Avatar Selection */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-5 pb-6 border-b border-border/60">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            <div
              className="relative group shrink-0 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Click to upload custom profile picture"
            >
              <img
                src={avatarUrl}
                alt="Avatar preview"
                className="size-24 rounded-full border-2 border-accent object-cover shadow-lg bg-raised group-hover:opacity-85 transition-opacity"
                onError={() => setAvatarUrl(DEFAULT_AVATARS[0])}
              />
              <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-accent text-accent-fg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                <Camera className="size-3.5" />
              </div>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Avatar & Profile Photo</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border border-accent/40 bg-accent/10 hover:bg-accent/20 active:scale-95 text-accent text-xs font-semibold cursor-pointer transition-all"
                >
                  <Upload className="size-3" />
                  <span>{isUploadingPhoto ? "Loading..." : "Upload Photo"}</span>
                </button>
              </div>
              <p className="text-xs text-muted">
                Upload your own photo from device, or choose from creator avatar presets below.
              </p>
              {/* Avatar quick presets */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                {DEFAULT_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      playSound("pop");
                      setAvatarUrl(url);
                    }}
                    className={cn(
                      "size-8 rounded-full overflow-hidden border transition-transform hover:scale-110 cursor-pointer",
                      avatarUrl === url ? "border-accent ring-2 ring-accent/30" : "border-border"
                    )}
                    title={`Select Avatar ${i + 1}`}
                  >
                    <img src={url} alt={`Preset ${i}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Display Name & Handle */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-fg mb-1.5">
                Display Name <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Your Name"
                  className="pl-10"
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1.5 flex items-center justify-between">
                <span>Username Handle <span className="text-accent">*</span></span>
                {handle.length >= 3 && (
                  handleStatus.valid ? (
                    <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="size-3" /> @{handle} is available
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="size-3" /> {handleStatus.message}
                    </span>
                  )
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted select-none">
                  @
                </span>
                <Input
                  value={handle}
                  onChange={(e) => handleHandleChange(e.target.value)}
                  placeholder="handle"
                  className={cn(
                    "pl-8 font-mono text-sm transition-colors",
                    handle.length >= 3 && !handleStatus.valid && "border-rose-500/60 focus:border-rose-500 text-rose-300",
                    handle.length >= 3 && handleStatus.valid && "border-emerald-500/40 focus:border-emerald-500"
                  )}
                  maxLength={20}
                />
              </div>
              <p className="text-[10px] text-muted mt-1">
                Unique identifier across RIFF. Letters, numbers, and underscores only.
              </p>
            </div>
          </div>

          {/* 4. Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-fg">Bio / About You</label>
              <span className="text-[10px] text-muted">{bio.length}/160</span>
            </div>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell other creators what content you produce..."
              rows={3}
              className="resize-none"
            />
            {/* Quick bio template pills */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BIO_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playSound("pop");
                    setBio(tmpl);
                  }}
                  className="text-[10px] py-1 px-2.5 rounded-lg border border-border bg-raised hover:border-accent/40 text-muted hover:text-fg transition-colors"
                >
                  + {tmpl.split("|")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Instagram Handle (Optional) */}
          <div>
            <label className="block text-xs font-bold text-fg mb-1.5">
              Instagram Handle (Optional)
            </label>
            <div className="relative">
              <Instagram className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-pink-400 pointer-events-none" />
              <Input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="instagram_username"
                className="pl-10"
                maxLength={30}
              />
            </div>
            <p className="text-[10px] text-muted mt-1">
              Links your reels to your Instagram audience.
            </p>
          </div>

          {/* 6. Content Niches / Hubs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-fg">
                Select Content Niches You Love
              </label>
              <span className="text-[10px] text-muted">
                {selectedCategories.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTENT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-accent bg-accent/15 text-accent shadow-sm"
                        : "border-border bg-raised/40 hover:bg-raised text-muted"
                    )}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              onClick={() => handleCompleteProfile(false)}
              disabled={isSubmitting || !handleStatus.valid}
              className="w-full sm:flex-1 py-3 h-12 text-sm font-bold bg-accent text-accent-fg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 rounded-2xl shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="size-4" />
              <span>{isSubmitting ? "Saving Profile..." : "Create Profile & Enter RIFF"}</span>
              <ArrowRight className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => handleCompleteProfile(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto text-xs text-muted hover:text-fg h-12 px-5 cursor-pointer"
            >
              Skip to Feed
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
