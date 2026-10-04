import { useState, useRef } from "react";

export type TimelineClip = {
  id: string;
  name: string;
  url: string;
  duration: number;
  start: number;
  end: number;
  type?: "video" | "image";
  isBroken?: boolean;
};

type TimelineProps = {
  clips: TimelineClip[];
  selectedClip: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, start: number, end: number) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, time: number) => void;
  onReorder: (fromId: string, toId: string) => void;
  onReplaceMedia?: (id: string, file: File) => void;
  onDuplicate?: (id: string) => void;
};

export function Timeline({
  clips,
  selectedClip,
  onSelect,
  onDelete,
  onReorder,
  onReplaceMedia,
  onDuplicate,
}: TimelineProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const totalDuration = clips.reduce(
    (acc, c) => acc + Math.max(0.1, c.end - c.start),
    0
  );

  return (
    <div className="w-full border-t border-white/10 bg-[#090909] px-3 py-2 sm:px-4 sm:py-2.5 shrink-0">
      {/* Hidden file input for media replacement */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceTargetId && onReplaceMedia) {
            onReplaceMedia(replaceTargetId, file);
          }
          setReplaceTargetId(null);
          if (replaceInputRef.current) replaceInputRef.current.value = "";
        }}
      />

      {/* TIMELINE HEADER */}
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-white/70 text-[11px] uppercase">
            Timeline Sequence
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
            {clips.length} {clips.length === 1 ? "clip" : "clips"}
          </span>
        </div>

        <span className="text-[11px] text-white/40">
          Total: <strong className="font-mono text-white">{totalDuration.toFixed(1)}s</strong>
        </span>
      </div>

      {/* CLIPS HORIZONTAL TRACK */}
      <div className="flex h-24 gap-2 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-2 items-center">
        {clips.map((clip, index) => {
          const selected = selectedClip === clip.id;
          const length = Math.max(clip.end - clip.start, 0.1);
          const isImage =
            clip.type === "image" ||
            /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(clip.name);
          const isBroken = brokenUrls[clip.id] || clip.isBroken;

          return (
            <div
              key={clip.id}
              draggable
              onDragStart={() => setDraggedId(clip.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedId && draggedId !== clip.id) {
                  onReorder(draggedId, clip.id);
                }
                setDraggedId(null);
              }}
              onClick={() => onSelect(clip.id)}
              className={`group relative flex h-full min-w-[140px] sm:min-w-[170px] max-w-[200px] cursor-pointer overflow-hidden rounded-lg border transition-all ${
                selected
                  ? "border-[#d4ff00] bg-[#1c1c14] shadow-md shadow-[#d4ff00]/15 ring-2 ring-[#d4ff00]/60"
                  : "border-white/10 bg-[#141414] hover:border-white/30"
              }`}
            >
              {/* THUMBNAIL BACKGROUND */}
              <div className="relative w-16 sm:w-20 h-full shrink-0 overflow-hidden bg-black/80 flex items-center justify-center border-r border-white/10">
                {isBroken ? (
                  <div className="flex flex-col items-center justify-center p-1 text-center text-amber-400 gap-0.5">
                    <span className="text-xs">⚠️</span>
                    <span className="text-[8px] font-bold">Expired</span>
                  </div>
                ) : isImage ? (
                  <img
                    src={clip.url}
                    alt={clip.name}
                    onError={() => setBrokenUrls((prev) => ({ ...prev, [clip.id]: true }))}
                    className="h-full w-full object-cover opacity-85"
                  />
                ) : (
                  <video
                    src={clip.url}
                    muted
                    preload="metadata"
                    onError={() => setBrokenUrls((prev) => ({ ...prev, [clip.id]: true }))}
                    className="h-full w-full object-cover opacity-85"
                  />
                )}

                <div className="absolute top-1 left-1 rounded bg-black/75 px-1 py-0.5 text-[8px] font-bold text-[#d4ff00]">
                  #{index + 1}
                </div>
              </div>

              {/* CLIP DETAILS */}
              <div className="flex flex-1 flex-col justify-between p-1.5 sm:p-2 overflow-hidden min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[11px] font-semibold text-white/90" title={clip.name}>
                    {clip.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(clip.id);
                    }}
                    title="Delete Clip"
                    className="text-white/30 hover:text-red-400 text-xs px-1 rounded hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-white/50">
                  <span className="flex items-center gap-1">
                    <span>{isImage ? "📸" : "🎥"}</span>
                    <span>{isImage ? "Photo" : "Video"}</span>
                  </span>
                  <span className="font-mono font-bold text-white/80">{length.toFixed(1)}s</span>
                </div>

                {/* BOTTOM ACTION ICONS */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                  <span className="text-[9px] text-white/40">
                    {clip.start.toFixed(1)}s - {clip.end.toFixed(1)}s
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {onDuplicate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate(clip.id);
                        }}
                        title="Duplicate Clip"
                        className="text-white/60 hover:text-white px-1 hover:bg-white/10 rounded"
                      >
                        ⧉
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReplaceTargetId(clip.id);
                        replaceInputRef.current?.click();
                      }}
                      title="Replace file"
                      className="text-[#d4ff00] hover:underline text-[9px] font-bold"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!clips.length && (
          <div className="flex h-full w-full items-center justify-center gap-2 text-xs text-white/40">
            <span>🎞️</span>
            <span>No clips added yet. Use <strong>+ Media</strong> or <strong>✨ Templates</strong> on the left!</span>
          </div>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/30">
        <span>Drag to reorder clips • Select any clip to edit trim & split in inspector</span>
        <span>RIFF Studio</span>
      </div>
    </div>
  );
}
