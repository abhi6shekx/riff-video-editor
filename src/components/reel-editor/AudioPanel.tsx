import { useRef, useState } from "react";
import { safeRandomUUID } from "@/lib/uuid";

export type AudioTrack = {
  id: string;
  name: string;
  url: string;
  start: number;
  end: number;
  volume: number;
  muted: boolean;
};

type AudioPanelProps = {
  tracks: AudioTrack[];
  onAdd: (track: AudioTrack) => void;
  onUpdate: (id: string, changes: Partial<AudioTrack>) => void;
  onDelete: (id: string) => void;
};

export function AudioPanel({
  tracks,
  onAdd,
  onUpdate,
  onDelete,
}: AudioPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  function importAudio(files: FileList | null) {
    if (!files) return;

    Array.from(files)
      .filter((file) => file.type.startsWith("audio/"))
      .forEach((file) => {
        const url = URL.createObjectURL(file);

        onAdd({
          id: safeRandomUUID(),
          name: file.name,
          url,
          start: 0,
          end: 0,
          volume: 1,
          muted: false,
        });
      });
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        multiple
        hidden
        onChange={(event) =>
          importAudio(event.target.files)
        }
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl bg-[#d4ff00] px-4 py-3 text-sm font-bold text-black"
      >
        + Add Music
      </button>

      <div className="space-y-3">
        {tracks.map((track) => (
          <AudioTrackItem
            key={track.id}
            track={track}
            playing={playing === track.id}
            onPlay={() =>
              setPlaying(
                playing === track.id ? null : track.id,
              )
            }
            onUpdate={(changes) =>
              onUpdate(track.id, changes)
            }
            onDelete={() => onDelete(track.id)}
          />
        ))}

        {!tracks.length && (
          <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-white/30">
            No audio tracks
          </div>
        )}
      </div>
    </div>
  );
}

function AudioTrackItem({
  track,
  playing,
  onPlay,
  onUpdate,
  onDelete,
}: {
  track: AudioTrack;
  playing: boolean;
  onPlay: () => void;
  onUpdate: (changes: Partial<AudioTrack>) => void;
  onDelete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  function togglePlay() {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    onPlay();
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <audio
        ref={audioRef}
        src={track.url}
        onEnded={() => onPlay()}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-white/80">
            {track.name}
          </p>

          <p className="text-[10px] text-white/30">
            Audio track
          </p>
        </div>

        <button
          onClick={() =>
            onUpdate({
              muted: !track.muted,
            })
          }
          className="text-xs text-white/50"
        >
          {track.muted ? "Muted" : "Sound"}
        </button>

        <button
          onClick={onDelete}
          className="text-xs text-red-400"
        >
          ×
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] text-white/40">
          <span>Volume</span>

          <span>
            {Math.round(track.volume * 100)}%
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={(event) =>
            onUpdate({
              volume: Number(event.target.value),
            })
          }
          className="w-full accent-[#d4ff00]"
        />
      </div>
    </div>
  );
}
