import { useState } from "react";
import { safeRandomUUID } from "@/lib/uuid";

export type TextLayer = {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  fontFamily: "impact" | "modern" | "classic" | "mono" | "script";
  position: "top" | "center" | "bottom" | "custom";
  yPercent: number;
  xPercent: number;
  align: "left" | "center" | "right";
  hasStroke: boolean;
  strokeColor: string;
  hasShadow: boolean;
  uppercase: boolean;
};

type TextPanelProps = {
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (layer: TextLayer) => void;
  onUpdate: (id: string, changes: Partial<TextLayer>) => void;
  onDelete: (id: string) => void;
};

const COLOR_PALETTE = [
  "#ffffff",
  "#d4ff00", // RIFF Lime
  "#ff0055", // Neon Magenta
  "#00e5ff", // Electric Cyan
  "#ffe600", // Bright Yellow
  "#ff8800", // Orange
  "#000000", // Black
];

const PRESET_TEMPLATES = [
  { label: "POV: ...", text: "POV: You found the secret sauce", style: "impact" as const },
  { label: "Wait for it 💀", text: "WAIT TILL THE END 💀", style: "impact" as const },
  { label: "Clean Caption", text: "The secret to scaling faster 🚀", style: "modern" as const },
  { label: "Part 2 in bio 👇", text: "Part 2 dropping tomorrow 👇", style: "modern" as const },
];

export function TextPanel({
  layers,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
}: TextPanelProps) {
  const [activeTab, setActiveTab] = useState<"layers" | "presets">("layers");

  const selectedLayer = layers.find((l) => l.id === selectedId) || null;

  function addNewText(presetText = "DOUBLE TAP TO EDIT", fontFamily: TextLayer["fontFamily"] = "impact") {
    const newLayer: TextLayer = {
      id: safeRandomUUID(),
      text: presetText,
      fontSize: 28,
      color: "#ffffff",
      bgColor: "transparent",
      fontFamily,
      position: "center",
      xPercent: 50,
      yPercent: 50,
      align: "center",
      hasStroke: true,
      strokeColor: "#000000",
      hasShadow: true,
      uppercase: fontFamily === "impact",
    };

    onAdd(newLayer);
    onSelect(newLayer.id);
    setActiveTab("layers");
  }

  function setPosition(pos: "top" | "center" | "bottom") {
    if (!selectedLayer) return;
    const yMap = { top: 18, center: 50, bottom: 80 };
    onUpdate(selectedLayer.id, {
      position: pos,
      yPercent: yMap[pos],
    });
  }

  return (
    <div className="space-y-4">
      {/* ACTION TABS */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("layers")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            activeTab === "layers"
              ? "bg-[#d4ff00] text-black shadow-xs"
              : "bg-raised text-muted hover:bg-surface hover:text-fg border border-border"
          }`}
        >
          Layers ({layers.length})
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
            activeTab === "presets"
              ? "bg-[#d4ff00] text-black shadow-xs"
              : "bg-raised text-muted hover:bg-surface hover:text-fg border border-border"
          }`}
        >
          Quick Presets
        </button>
      </div>

      {/* QUICK PRESETS TAB */}
      {activeTab === "presets" && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted">Tap a preset to insert directly onto the reel:</p>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => addNewText(tpl.text, tpl.style)}
                className="flex items-center justify-between rounded-lg border border-border bg-raised p-2.5 text-left text-xs transition hover:border-[#d4ff00] hover:bg-surface"
              >
                <span className="font-semibold text-fg">{tpl.label}</span>
                <span className="text-[10px] font-bold text-[#d4ff00]">+ Insert</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LAYERS TAB */}
      {activeTab === "layers" && (
        <div className="space-y-4">
          <button
            onClick={() => addNewText()}
            className="w-full rounded-xl bg-[#d4ff00] px-4 py-2.5 text-xs font-bold text-black transition hover:opacity-90"
          >
            ＋ Add Text Layer
          </button>

          {/* LAYER SELECTOR PILLS */}
          {layers.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {layers.map((layer, index) => {
                const isSelected = layer.id === selectedId;
                return (
                  <button
                    key={layer.id}
                    onClick={() => onSelect(layer.id)}
                    className={`max-w-[100px] truncate rounded-md px-2 py-1 text-[11px] font-medium transition ${
                      isSelected
                        ? "border border-[#d4ff00] bg-[#d4ff00]/15 text-[#d4ff00]"
                        : "border border-border bg-raised text-muted hover:bg-surface hover:text-fg"
                    }`}
                  >
                    #{index + 1} {layer.text.slice(0, 10) || "Text"}
                  </button>
                );
              })}
            </div>
          )}

          {/* SELECTED LAYER CONTROLS */}
          {selectedLayer ? (
            <div className="space-y-4 rounded-xl border border-border bg-raised p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#d4ff00]">
                  Edit Layer
                </span>
                <button
                  onClick={() => onDelete(selectedLayer.id)}
                  className="rounded px-2 py-0.5 text-[10px] font-semibold text-red-500 transition hover:bg-red-500/10"
                >
                  Delete Layer
                </button>
              </div>

              {/* TEXT INPUT */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Content
                </label>
                <textarea
                  rows={2}
                  value={selectedLayer.text}
                  onChange={(e) => onUpdate(selectedLayer.id, { text: e.target.value })}
                  placeholder="Enter text..."
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg outline-none focus:border-[#d4ff00]"
                />
              </div>

              {/* FONT STYLE */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Font Family
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: "impact", label: "Impact" },
                      { id: "modern", label: "Modern" },
                      { id: "classic", label: "Classic" },
                      { id: "mono", label: "Retro" },
                      { id: "script", label: "Cursive" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() =>
                        onUpdate(selectedLayer.id, {
                          fontFamily: f.id,
                          uppercase: f.id === "impact" ? true : selectedLayer.uppercase,
                        })
                      }
                      className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                        selectedLayer.fontFamily === f.id
                          ? "bg-[#d4ff00] text-black font-semibold"
                          : "border border-border bg-surface text-muted hover:text-fg"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* FONT SIZE SLIDER */}
              <div>
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted">
                  <span className="uppercase tracking-wider">Font Size</span>
                  <span className="font-mono text-fg">{selectedLayer.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={14}
                  max={64}
                  step={2}
                  value={selectedLayer.fontSize}
                  onChange={(e) =>
                    onUpdate(selectedLayer.id, { fontSize: Number(e.target.value) })
                  }
                  className="h-1.5 w-full cursor-pointer accent-[#d4ff00]"
                />
              </div>

              {/* POSITION SHORTCUTS */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Screen Position
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["top", "center", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => setPosition(pos)}
                      className={`rounded px-2 py-1 text-[11px] capitalize transition ${
                        selectedLayer.position === pos
                          ? "bg-[#d4ff00] text-black font-semibold"
                          : "border border-border bg-surface text-muted hover:text-fg"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* COLOR SWATCHES */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Text Color
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdate(selectedLayer.id, { color: c })}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-full border-2 transition ${
                        selectedLayer.color === c
                          ? "scale-110 border-fg shadow-md"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* BACKGROUND PILL STYLE */}
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Background Box
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: "None", val: "transparent" },
                    { label: "Dark Box", val: "rgba(0,0,0,0.75)" },
                    { label: "Lime Highlight", val: "#d4ff00" },
                  ].map((bg) => (
                    <button
                      key={bg.val}
                      onClick={() =>
                        onUpdate(selectedLayer.id, {
                          bgColor: bg.val,
                          color: bg.val === "#d4ff00" ? "#000000" : selectedLayer.color,
                        })
                      }
                      className={`rounded px-2 py-1 text-[10px] font-medium transition ${
                        selectedLayer.bgColor === bg.val
                          ? "bg-[#d4ff00] text-black font-semibold"
                          : "border border-border bg-surface text-muted hover:text-fg"
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TOGGLES: STROKE & SHADOW */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() =>
                    onUpdate(selectedLayer.id, { hasStroke: !selectedLayer.hasStroke })
                  }
                  className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-semibold transition ${
                    selectedLayer.hasStroke
                      ? "border-[#d4ff00] bg-[#d4ff00]/15 text-[#d4ff00]"
                      : "border-border bg-surface text-muted hover:text-fg"
                  }`}
                >
                  Outline / Stroke {selectedLayer.hasStroke ? "✓" : "✗"}
                </button>
                <button
                  onClick={() =>
                    onUpdate(selectedLayer.id, { hasShadow: !selectedLayer.hasShadow })
                  }
                  className={`rounded-lg border px-2 py-1.5 text-center text-[10px] font-semibold transition ${
                    selectedLayer.hasShadow
                      ? "border-[#d4ff00] bg-[#d4ff00]/15 text-[#d4ff00]"
                      : "border-border bg-surface text-muted hover:text-fg"
                  }`}
                >
                  Drop Shadow {selectedLayer.hasShadow ? "✓" : "✗"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-raised p-5 text-center text-xs text-muted">
              No text layer selected. Click "+ Add Text Layer" or tap one on screen.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
