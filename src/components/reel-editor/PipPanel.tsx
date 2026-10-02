import { useRef } from "react";
import { safeRandomUUID } from "@/lib/uuid";

export type PipLayer = {
  id: string;
  name: string;
  url: string;
  type: "video" | "image";
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rotation: number;
  muted: boolean;
};

type PipPanelProps = {
  layers: PipLayer[];
  selectedId: string | null;
  onAdd: (layer: PipLayer) => void;
  onUpdate: (
    id: string,
    changes: Partial<PipLayer>,
  ) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
};

export function PipPanel({
  layers,
  selectedId,
  onAdd,
  onUpdate,
  onDelete,
  onSelect,
}: PipPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function importPip(files: FileList | null) {
    if (!files) return;

    Array.from(files)
      .filter(
        (file) =>
          file.type.startsWith("video/") ||
          file.type.startsWith("image/"),
      )
      .forEach((file) => {
        const isVideo = file.type.startsWith("video/");

        onAdd({
          id: safeRandomUUID(),
          name: file.name,
          url: URL.createObjectURL(file),
          type: isVideo ? "video" : "image",
          x: 50,
          y: 50,
          width: 35,
          height: 35,
          opacity: 1,
          rotation: 0,
          muted: false,
        });
      });
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*"
        multiple
        hidden
        onChange={(event) =>
          importPip(event.target.files)
        }
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl bg-[#d4ff00] px-4 py-3 text-sm font-bold text-black transition hover:opacity-90"
      >
        + Add PIP Layer
      </button>

      {!layers.length && (
        <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/30">
          No PIP layers yet. Import a video or image.
        </div>
      )}

      {layers.map((layer) => {
        const selected = selectedId === layer.id;

        return (
          <div
            key={layer.id}
            className={`rounded-xl border p-3 transition ${
              selected
                ? "border-[#d4ff00] bg-[#d4ff00]/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <button
              onClick={() => onSelect(layer.id)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="max-w-[150px] truncate text-xs font-medium text-white/80">
                {layer.type === "video" ? "🎬" : "🖼️"} {layer.name}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  selected ? "text-[#d4ff00]" : "text-white/30"
                }`}
              >
                {selected ? "▲" : "▼"}
              </span>
            </button>

            {selected && (
              <div className="mt-4 space-y-3">
                <Slider
                  label="Size"
                  value={layer.width}
                  min={10}
                  max={90}
                  unit="%"
                  onChange={(value) =>
                    onUpdate(layer.id, {
                      width: value,
                      height: value,
                    })
                  }
                />

                <Slider
                  label="X Position"
                  value={layer.x}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(value) =>
                    onUpdate(layer.id, { x: value })
                  }
                />

                <Slider
                  label="Y Position"
                  value={layer.y}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(value) =>
                    onUpdate(layer.id, { y: value })
                  }
                />

                <Slider
                  label="Opacity"
                  value={layer.opacity * 100}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(value) =>
                    onUpdate(layer.id, {
                      opacity: value / 100,
                    })
                  }
                />

                <Slider
                  label="Rotation"
                  value={layer.rotation}
                  min={-180}
                  max={180}
                  unit="°"
                  onChange={(value) =>
                    onUpdate(layer.id, { rotation: value })
                  }
                />

                <div className="flex gap-2 pt-1">
                  {layer.type === "video" && (
                    <button
                      onClick={() =>
                        onUpdate(layer.id, {
                          muted: !layer.muted,
                        })
                      }
                      className={`flex-1 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                        layer.muted
                          ? "border-white/20 bg-white/5 text-white/50 hover:bg-white/10"
                          : "border-[#d4ff00] bg-[#d4ff00]/10 text-[#d4ff00]"
                      }`}
                    >
                      {layer.muted ? "🔇 Muted" : "🔊 Sound On"}
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(layer.id)}
                    className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-white/40">
        <span className="uppercase tracking-wide">{label}</span>
        <span className="font-mono text-white/60">
          {Math.round(value)}{unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value))
        }
        className="h-1.5 w-full cursor-pointer accent-[#d4ff00]"
      />
    </div>
  );
}
