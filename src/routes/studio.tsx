import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Film,
  Flame,
  Image as ImageIcon,
  Layers,
  Redo2,
  ShieldAlert,
  Sparkles,
  Undo2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { useRiff } from "@/lib/store";
import { useStudio } from "@/lib/studio/store";
import { CanvasPreview } from "@/components/studio/CanvasPreview";
import { MultiTrackTimeline } from "@/components/studio/MultiTrackTimeline";
import { StudioPanels } from "@/components/studio/StudioPanels";
import { ExportModal } from "@/components/studio/ExportModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TEMPLATES } from "@/lib/seed";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sounds";
import { fireConfetti } from "@/lib/confetti";
import { toast } from "sonner";
import { generateAiAutoEdit } from "@/lib/studio/ai-tools";
import type { AspectRatio } from "@/lib/studio/types";

export type StudioSearch = {
  remix?: string;
  template?: string;
  brief?: string;
};

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): StudioSearch => ({
    remix: typeof search.remix === "string" ? search.remix : undefined,
    template: typeof search.template === "string" ? search.template : undefined,
    brief: typeof search.brief === "string" ? search.brief : undefined,
  }),
  component: StudioPage,
  head: () => ({ meta: [{ title: "RIFF Studio · Reel Editor" }] }),
});

const ASPECT_RATIOS: { id: AspectRatio; label: string }[] = [
  { id: "9:16", label: "9:16 Reel" },
  { id: "1:1", label: "1:1 Square" },
  { id: "4:5", label: "4:5 Portrait" },
  { id: "16:9", label: "16:9 Cinema" },
];

function StudioPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const posts = useRiff((s) => s.posts);
  const categories = useRiff((s) => s.categories);
  const submitContent = useRiff((s) => s.submitContent);
  const rawProfile = useRiff((s) => s.profile);
  const profile = rawProfile || { name: "You", handle: "you", role: "creator" };

  const isAdminRole =
    profile.role === "admin" || profile.role === "super_admin" || profile.role === "owner";

  // Studio Store
  const project = useStudio((s) => s.project);
  const setAspectRatio = useStudio((s) => s.setAspectRatio);
  const applyRemix = useStudio((s) => s.applyRemix);
  const applyTemplate = useStudio((s) => s.applyTemplate);
  const undo = useStudio((s) => s.undo);
  const redo = useStudio((s) => s.redo);
  const undoStack = useStudio((s) => s.undoStack);
  const redoStack = useStudio((s) => s.redoStack);
  const addClips = useStudio((s) => s.addClips);
  const addTextLayer = useStudio((s) => s.addTextLayer);

  // Editor mode
  const [editorMode, setEditorMode] = useState<"reel" | "post">("reel");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Quick Meme Post state (for traditional 1:1 post tab)
  const [selectedPostImage, setSelectedPostImage] = useState("/memes/desk.jpg");
  const [postTopCaption, setPostTopCaption] = useState("CLIENT: QUICK 5 MIN SYNC");
  const [postBottomCaption, setPostBottomCaption] = useState("2 HOURS LATER... 💀");
  const [postCategoryId, setPostCategoryId] = useState("cat_relatable");
  const [postHashtags, setPostHashtags] = useState("#relatable #viral");
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Handle URL Search Params: Remix or Template
  useEffect(() => {
    if (search.remix) {
      const targetPost = posts.find((p) => p.id === search.remix);
      if (targetPost) {
        applyRemix({
          authorHandle: targetPost.authorHandle,
          authorName: targetPost.authorName,
          reelId: targetPost.id,
          mediaUrl: targetPost.mediaUrl,
          caption: targetPost.caption,
        });
        toast.info(`Remixing @${targetPost.authorHandle}'s Reel! Structure & timing loaded.`);
      }
    } else if (search.template) {
      applyTemplate(search.template);
    }
  }, [search.remix, search.template, posts, applyRemix, applyTemplate]);

  // Custom Image File Upload for Post
  function handleImageFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedPostImage(url);
      toast.success("Custom image loaded into meme editor!");
    }
  }

  // Quick Meme Post Submission
  function handleQuickPostSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPostSubmitting(true);

    const hashtags = postHashtags
      .split(/[\s,]+/)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .filter((t) => t.length > 1);

    submitContent({
      type: "post",
      mediaUrl: selectedPostImage,
      caption: `${postTopCaption} ${postBottomCaption}`,
      topCaption: postTopCaption,
      bottomCaption: postBottomCaption,
      categoryId: postCategoryId,
      hashtags,
      aspectRatio: "1:1",
    });

    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 40);
    setPostSubmitting(false);

    if (isAdminRole) {
      toast.success("⚡ Admin Post auto-approved and published live to feed!");
    } else {
      toast.success("Post submitted to moderators for review!");
    }
    void navigate({ to: "/" });
  }

  // Convert current Meme into an Animated Reel Project
  function handleConvertMemeToReel() {
    addClips([
      {
        name: "Meme Slide",
        sourceUrl: selectedPostImage,
        mediaType: "image",
        duration: 4.5,
        sourceStart: 0,
        sourceEnd: 4.5,
        speed: 1.0,
        volume: 100,
        muted: false,
        rotation: 0,
        transitionIn: { type: "zoom", duration: 0.5 },
      },
    ]);

    if (postTopCaption || postBottomCaption) {
      addTextLayer({
        text: `${postTopCaption}\n${postBottomCaption}`,
        timelineStart: 0,
        timelineEnd: 4.5,
        x: 50,
        y: 75,
        fontSize: 32,
        fontFamily: "Impact",
        color: "#FFFFFF",
        strokeColor: "#000000",
        strokeWidth: 4,
        animation: "pop",
        style: "meme_impact",
        bgColor: "rgba(0,0,0,0.6)",
      });
    }

    setEditorMode("reel");
    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 30);
    toast.success("Meme transferred into Reel Studio! Add music, sound effects and stickers.");
  }

  // 1-Click AI Auto Edit Trigger
  function handleAiAutoEdit() {
    const sources = project.clips.map((c) => ({ url: c.sourceUrl, label: c.name }));
    const autoProj = generateAiAutoEdit(sources);
    useStudio.setState((s) => ({
      project: {
        ...s.project,
        ...autoProj,
        updatedAt: Date.now(),
      },
      currentTime: 0,
    }));
    playSound("cheer");
    fireConfetti(window.innerWidth / 2, window.innerHeight / 2, 35);
    toast.success("AI Smart Montage generated with synced beats & transitions!");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 pt-3 pb-24 space-y-4">
      {/* Studio Header Ribbon */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 gap-3">
        {/* Title & Pro Badge */}
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent to-pink-500 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]">
            <Film className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-black tracking-tight text-fg">
                RIFF Studio
              </h1>
              <span className="rounded-full bg-gradient-to-r from-accent/20 to-pink-500/20 border border-accent/40 px-2 py-0.5 text-[9px] font-black text-accent uppercase tracking-wider">
                Studio Suite
              </span>
            </div>
            <p className="text-[11px] text-muted">
              Mobile-first creator editor • Non-destructive multi-track timeline & AI tools
            </p>
          </div>
        </div>

        {/* Central Controls: Mode Switch, Aspect Ratio & AI Shortcut */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-2xl bg-surface border border-white/10 p-1">
            <button
              type="button"
              onClick={() => setEditorMode("reel")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                editorMode === "reel"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                  : "text-muted hover:text-fg",
              )}
            >
              <Clapperboard className="size-3.5" />
              <span>RIFF Reel</span>
            </button>

            <button
              type="button"
              onClick={() => setEditorMode("post")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                editorMode === "post"
                  ? "bg-accent text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  : "text-muted hover:text-fg",
              )}
            >
              <ImageIcon className="size-3.5" />
              <span>Quick Meme</span>
            </button>
          </div>

          {/* Aspect Ratio Switcher (when in reel mode) */}
          {editorMode === "reel" && (
            <div className="hidden sm:flex items-center rounded-2xl bg-surface border border-white/10 p-1">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setAspectRatio(r.id)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all",
                    project.aspectRatio === r.id
                      ? "bg-white/15 text-accent shadow-sm"
                      : "text-muted hover:text-fg",
                  )}
                >
                  {r.id}
                </button>
              ))}
            </div>
          )}

          {/* Undo / Redo Buttons */}
          {editorMode === "reel" && (
            <div className="flex items-center rounded-2xl bg-surface border border-white/10 p-1">
              <button
                type="button"
                onClick={undo}
                disabled={undoStack.length === 0}
                className="p-1.5 text-muted hover:text-fg disabled:opacity-30 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={redoStack.length === 0}
                className="p-1.5 text-muted hover:text-fg disabled:opacity-30 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="size-3.5" />
              </button>
            </div>
          )}

          {/* AI Auto Edit Button */}
          {editorMode === "reel" && (
            <button
              type="button"
              onClick={handleAiAutoEdit}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-accent/20 to-cyan-500/20 border border-accent/40 px-3 py-1.5 text-xs font-bold text-accent hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)]"
              title="Auto Edit Clips into Viral Reel"
            >
              <Wand2 className="size-3.5" />
              <span className="hidden md:inline">AI Auto-Edit</span>
            </button>
          )}

          {/* Theme Switcher */}
          <ThemeSwitcher variant="compact" />

          {/* Export Reel Button */}
          {editorMode === "reel" && (
            <Button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="rounded-2xl bg-gradient-to-r from-accent via-cyan-400 to-mint text-black font-black text-xs px-4 sm:px-6 shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              Export Reel
            </Button>
          )}
        </div>
      </div>

      {/* User Content Creation Pipeline Step Banner */}
      <div className="rounded-2xl border border-border bg-surface px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex items-center gap-2 font-bold text-fg">
          <span className="flex size-6 items-center justify-center rounded-lg bg-accent/20 text-accent font-mono text-[11px]">1</span>
          <span>Create {editorMode === "post" ? "Meme Post" : "RIFF Reel"}</span>
        </div>
        <ArrowRight className="size-3.5 text-muted hidden sm:block" />
        <div className="flex items-center gap-2 font-bold text-fg">
          <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 font-mono text-[11px]">2</span>
          <span>Category Reward</span>
        </div>
        <ArrowRight className="size-3.5 text-muted hidden sm:block" />
        <div className="flex items-center gap-2 font-bold text-fg">
          <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300 font-mono text-[11px]">3</span>
          <span>Admin Review</span>
        </div>
        <ArrowRight className="size-3.5 text-muted hidden sm:block" />
        <div className="flex items-center gap-2 font-bold text-emerald-400">
          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-[11px]">4</span>
          <span>LIVE Feed & Points</span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIFF REEL STUDIO VIEW                                        */}
      {/* ------------------------------------------------------------- */}
      {editorMode === "reel" && (
        <div className="space-y-4">
          {/* Top Row: Preview Canvas (Left) + Studio Panels (Right) */}
          <div className="grid gap-4 md:grid-cols-12 items-start">
            {/* Live Canvas Viewport (5 cols on desktop, full width on mobile) */}
            <div className="md:col-span-5 flex flex-col items-center">
              <CanvasPreview className="w-full max-w-[420px]" />
            </div>

            {/* Studio Tools & Settings Drawer (7 cols on desktop) */}
            <div className="md:col-span-7">
              <StudioPanels />
            </div>
          </div>

          {/* Bottom Row: Full-width Interactive Multi-Track Timeline */}
          <div className="w-full">
            <MultiTrackTimeline />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK MEME POST VIEW (Classic Fast Top/Bottom Meme Maker)     */}
      {/* ------------------------------------------------------------- */}
      {editorMode === "post" && (
        <form onSubmit={handleQuickPostSubmit} className="grid gap-6 md:grid-cols-12 max-w-4xl mx-auto">
          {/* Left: Meme Canvas Preview */}
          <div className="md:col-span-6 space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-black border border-white/10 shadow-2xl flex items-center justify-center p-2">
              <img
                src={selectedPostImage}
                alt="Meme"
                className="size-full object-cover rounded-2xl"
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none">
                <p
                  className="font-impact text-center text-xl sm:text-2xl font-black uppercase text-white leading-tight"
                  style={{
                    textShadow:
                      "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {postTopCaption}
                </p>
                <p
                  className="font-impact text-center text-xl sm:text-2xl font-black uppercase text-white leading-tight"
                  style={{
                    textShadow:
                      "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.9)",
                  }}
                >
                  {postBottomCaption}
                </p>
              </div>
            </div>

            {/* Template Selector Carousel */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-muted">
                  Choose Base Visual or Upload Custom Image:
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-accent hover:underline">
                  <Upload className="size-3" />
                  <span>Upload Custom</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedPostImage(tmpl.src)}
                    className={cn(
                      "size-12 shrink-0 overflow-hidden rounded-xl border transition-all",
                      selectedPostImage === tmpl.src
                        ? "border-accent ring-2 ring-accent/40"
                        : "border-white/10 opacity-70 hover:opacity-100",
                    )}
                  >
                    <img src={tmpl.src} alt={tmpl.label} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Meme Captions & Category Input */}
          <div className="md:col-span-6 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-xl backdrop-blur-xl space-y-3">
              <h3 className="text-xs font-bold text-fg flex items-center gap-2">
                <Flame className="size-3.5 text-accent" />
                <span>Meme Punchline Captions</span>
              </h3>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Top Headline</label>
                <Input
                  value={postTopCaption}
                  onChange={(e) => setPostTopCaption(e.target.value)}
                  placeholder="e.g. CLIENT: QUICK 5 MIN SYNC"
                  className="text-xs bg-raised border-white/10 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Bottom Punchline</label>
                <Input
                  value={postBottomCaption}
                  onChange={(e) => setPostBottomCaption(e.target.value)}
                  placeholder="e.g. 2 HOURS LATER... 💀"
                  className="text-xs bg-raised border-white/10 rounded-xl"
                />
              </div>
            </div>

            {/* Category Reward */}
            <div className="rounded-3xl border border-accent/30 bg-surface/90 p-5 shadow-xl backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <Zap className="size-3.5 text-accent fill-accent" />
                  <span>Category & Points Reward</span>
                </label>
                <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  +100 RIFF Points upon Approval
                </Badge>
              </div>

              <select
                value={postCategoryId}
                onChange={(e) => setPostCategoryId(e.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-raised p-3 text-xs font-bold text-fg focus:outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-surface">
                    {cat.icon} {cat.name} (+{cat.approvalPoints} pts)
                  </option>
                ))}
              </select>
            </div>

            {/* Hashtags */}
            <div className="rounded-3xl border border-white/10 bg-surface/90 p-5 shadow-xl backdrop-blur-xl space-y-2">
              <label className="block text-xs font-medium text-muted">Hashtags</label>
              <Input
                value={postHashtags}
                onChange={(e) => setPostHashtags(e.target.value)}
                placeholder="#office #relatable"
                className="text-xs bg-raised border-white/10 rounded-xl"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                type="submit"
                size="lg"
                disabled={postSubmitting}
                className="flex-1 rounded-2xl bg-gradient-to-r from-accent via-cyan-400 to-mint text-black font-black text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                {postSubmitting ? "Submitting..." : "Submit Meme Post"}
              </Button>

              <button
                type="button"
                onClick={handleConvertMemeToReel}
                className="flex items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-bold text-accent hover:bg-accent/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,240,255,0.15)]"
                title="Convert this image meme into an animated Reel with beats and zoom"
              >
                <Sparkles className="size-4" />
                <span>Make Reel from Meme</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Export & Render Modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </main>
  );
}
