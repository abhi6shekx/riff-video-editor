import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRiff } from "@/lib/store";
import { toast } from "sonner";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { Check, ImagePlus, Send, Sparkles } from "lucide-react";

type ContentType = "post" | "reel";

const categories = [
  "Relatable",
  "Dark Humor",
  "Gaming",
  "Sports",
  "Movies",
  "Music",
  "Relationships",
  "Tech",
  "Food",
  "Gen-Z",
  "India",
  "Education",
  "Animals",
];

export function CreateContent() {
  const navigate = useNavigate();
  const submitContent = useRiff((s) => s.submitContent);
  const riffCategories = useRiff((s) => s.categories);
  const profile = useRiff((s) => s.profile);
  const isAdminRole = profile.role === "admin" || profile.role === "super_admin" || profile.role === "owner";

  const [type, setType] = useState<ContentType | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [hashtags, setHashtags] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  function selectMedia(file: File) {
    if (!file.type.startsWith("image/")) return;
    setMediaUrl(URL.createObjectURL(file));
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      selectMedia(file);
    }
  }

  const isValid = Boolean(mediaUrl && caption.trim() && category);

  const handleSubmit = () => {
    if (!isValid) {
      if (!mediaUrl) toast.error("Please add an image for your post!");
      else if (!caption.trim()) toast.error("Please write a caption!");
      else if (!category) toast.error("Please select a category!");
      return;
    }

    const matchedCat =
      riffCategories.find(
        (c) =>
          c.name.toLowerCase() === category.toLowerCase() ||
          c.slug === category.toLowerCase().replace(/\s+/g, "-") ||
          c.id.toLowerCase().includes(category.toLowerCase().replace(/\s+/g, "")),
      ) || riffCategories.find((c) => c.isDefault && c.status === "active") || riffCategories[0];

    if (matchedCat && matchedCat.status !== "active") {
      toast.error(`Category "${matchedCat.name}" is currently disabled for new submissions.`);
      return;
    }

    if (matchedCat && matchedCat.allowedTypes === "reel") {
      toast.error(`Category "${matchedCat.name}" only accepts 9:16 Video Reels, not standard image posts.`);
      return;
    }

    const parsedHashtags = hashtags
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((t) => (t.startsWith("#") ? t : `#${t}`));

    submitContent({
      type: "post",
      mediaUrl: mediaUrl || "",
      caption,
      categoryId: matchedCat?.id || "cat_relatable",
      hashtags: parsedHashtags,
      aspectRatio: "1:1",
    });

    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 35);

    if (isAdminRole) {
      toast.success("⚡ Admin post auto-approved and published live to feed!");
    } else {
      toast.success("Post submitted for review! Moderators will review your post soon.");
    }
    void navigate({ to: "/" });
  };

  if (!type) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-8 pb-32">
        <div className="mb-8">
          <Link to="/" className="text-sm text-white/40 hover:text-white">
            ← Back
          </Link>
          <h1 className="mt-4 text-3xl font-black">Create on RIFF</h1>
          <p className="mt-1 text-sm text-white/40">What are you creating today?</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            onClick={() => setType("post")}
            className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left transition hover:border-[#d4ff00]/60 hover:bg-white/[0.06]"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4ff00] text-2xl font-black text-black">
              +
            </div>
            <h2 className="text-xl font-bold">Create Post</h2>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Share a meme, image, thought or carousel with the RIFF community.
            </p>
          </button>

          <Link
            to="/reel-studio"
            className="group rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left transition hover:border-[#d4ff00]/60 hover:bg-white/[0.06]"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d4ff00] text-2xl font-black text-black">
              ▶
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Create Reel</h2>
              <span className="rounded-full bg-[#d4ff00]/15 px-2 py-0.5 text-[10px] font-black uppercase text-[#d4ff00] border border-[#d4ff00]/30">
                Video Editor &amp; Studio
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/40">
              Vertical reels &amp; video editor. Multi-track clips, trending audio, voiceover, PIP, text animations, filters &amp; export.
            </p>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 pb-36">
      {/* Header Bar: Top Submit Button visible ONLY on Desktop */}
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
        <button onClick={() => setType(null)} className="text-sm font-semibold text-white/50 hover:text-white transition-colors">
          ← Back
        </button>

        <h1 className="text-base font-extrabold text-white font-display">Create Post</h1>

        {/* Desktop-only Header Submit Action */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="hidden md:flex items-center gap-1.5 rounded-xl bg-[#d4ff00] px-4 py-2 text-xs font-black text-black disabled:opacity-40 hover:brightness-105 transition-all shadow-[0_0_15px_rgba(212,255,0,0.3)]"
        >
          <Send className="size-3.5" />
          <span>Post</span>
        </button>
        <div className="w-12 md:hidden" /> {/* Spacer for balanced header title centering on mobile */}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* MEDIA UPLOAD AREA */}
        <section>
          <div
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/20 bg-white/[0.03] transition hover:border-[#d4ff00]/60 hover:bg-white/[0.05]"
          >
            {mediaUrl ? (
              <img src={mediaUrl} alt="Post preview" className="h-full w-full object-contain" />
            ) : (
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d4ff00]/10 text-[#d4ff00] border border-[#d4ff00]/30">
                  <ImagePlus className="size-8" />
                </div>
                <p className="font-bold text-white text-base">Tap to add image</p>
                <p className="mt-1 text-xs text-white/40">JPG, PNG or WebP supported</p>
              </div>
            )}
          </div>

          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </section>

        {/* DETAILS & FORM */}
        <section className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-semibold text-white/60">Caption</label>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write a funny caption or meme title..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#d4ff00]/60"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-white/60">Category (Required)</label>
              {category && <span className="text-[11px] font-bold text-[#d4ff00]">Selected: {category}</span>}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {riffCategories
                .filter((c) => c.status === "active" && c.allowedTypes !== "reel")
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all ${
                      category === cat.name
                        ? "border-[#d4ff00] bg-[#d4ff00]/15 text-[#d4ff00] shadow-[0_0_12px_rgba(212,255,0,0.2)]"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/30"
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0 ml-1">
                      +{cat.approvalPoints}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-white/60">Hashtags</label>
            <input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#gaming #meme #relatable"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-[#d4ff00]/60"
            />
          </div>

          {/* REVIEW NOTICE */}
          <div className="rounded-2xl border border-[#d4ff00]/20 bg-[#d4ff00]/5 p-4">
            <p className="text-xs font-bold text-[#d4ff00] flex items-center gap-1.5">
              <Sparkles className="size-3.5 inline" /> Admin Review & Reward
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              Your selected category is a suggestion. RIFF moderators review and reward approved posts with creator points!
            </p>
          </div>
        </section>
      </div>

      {/* SINGLE STICKY SUBMISSION BAR ON MOBILE ONLY */}
      <div className="fixed bottom-[66px] inset-x-0 z-30 border-t border-white/15 bg-[#080808]/95 p-3.5 backdrop-blur-xl md:hidden">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full rounded-2xl py-3.5 text-sm font-black transition-all flex items-center justify-center gap-2 ${
            isValid
              ? "bg-[#d4ff00] text-black shadow-[0_0_20px_rgba(212,255,0,0.4)] active:scale-[0.98]"
              : "bg-white/15 text-white/60 border border-white/10 disabled:opacity-40"
          }`}
        >
          <Send className="size-4" />
          <span>{isValid ? "Submit Post Now 🚀" : "Fill required fields to Post"}</span>
        </button>
      </div>
    </div>
  );
}
