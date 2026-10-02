// Audio Engine for RIFF Studio
// Handles multi-track audio playback, Web Audio synthesis for offline tracks, sound effects, beat detection, and microphone voiceover recording.
import type { AudioTrackItem } from "./types";

export type SoundEffectType =
  | "boom"
  | "horn"
  | "rim"
  | "cash"
  | "fail"
  | "sting"
  | "pop"
  | "cheer"
  | "whoosh"
  | "glitch"
  | "rewind"
  | "camera";

export type PresetMusicTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  bpm: number;
  isTrending: boolean;
  beats: number[]; // beat timestamps in seconds
  synthType: "phonk" | "lofi" | "dholak" | "bass" | "cyber";
};

export const PRESET_MUSIC_TRACKS: PresetMusicTrack[] = [
  {
    id: "trk_phonk",
    title: "Phonk Night Drift Beat",
    artist: "DriftLab",
    genre: "Drift Phonk",
    duration: 15,
    bpm: 130,
    isTrending: true,
    beats: [0.0, 0.46, 0.92, 1.38, 1.84, 2.3, 2.76, 3.23, 3.69, 4.15, 4.61, 5.07, 5.53, 6.0, 6.46, 6.92, 7.38, 7.84, 8.3, 8.76, 9.23, 9.69, 10.15, 10.61, 11.07, 11.53, 12.0, 12.46, 12.92, 13.38, 13.84, 14.3],
    synthType: "phonk",
  },
  {
    id: "trk_lofi",
    title: "Lofi Chai Beats 3AM",
    artist: "Desi Vibe Studio",
    genre: "Chill Lofi",
    duration: 16,
    bpm: 80,
    isTrending: true,
    beats: [0.0, 0.75, 1.5, 2.25, 3.0, 3.75, 4.5, 5.25, 6.0, 6.75, 7.5, 8.25, 9.0, 9.75, 10.5, 11.25, 12.0, 12.75, 13.5, 14.25, 15.0],
    synthType: "lofi",
  },
  {
    id: "trk_dholak",
    title: "Dholak Stadium Anthem",
    artist: "CricketVibes 🇮🇳",
    genre: "Desi EDM",
    duration: 14,
    bpm: 125,
    isTrending: false,
    beats: [0.0, 0.48, 0.96, 1.44, 1.92, 2.4, 2.88, 3.36, 3.84, 4.32, 4.8, 5.28, 5.76, 6.24, 6.72, 7.2, 7.68, 8.16, 8.64, 9.12, 9.6, 10.08, 10.56, 11.04, 11.52, 12.0],
    synthType: "dholak",
  },
  {
    id: "trk_bass",
    title: "Deep Bass Club Riff",
    artist: "StrobeCrew",
    genre: "Electro Club",
    duration: 15,
    bpm: 128,
    isTrending: true,
    beats: [0.0, 0.47, 0.94, 1.41, 1.88, 2.35, 2.82, 3.29, 3.76, 4.23, 4.7, 5.17, 5.64, 6.11, 6.58, 7.05, 7.52, 7.99, 8.46, 8.93, 9.4, 9.87, 10.34, 10.81, 11.28, 11.75, 12.22, 12.69, 13.16],
    synthType: "bass",
  },
  {
    id: "trk_cyber",
    title: "Cyberpunk Glitchwave",
    artist: "RIFF Soundworks",
    genre: "Synthwave",
    duration: 16,
    bpm: 110,
    isTrending: true,
    beats: [0.0, 0.54, 1.09, 1.63, 2.18, 2.72, 3.27, 3.81, 4.36, 4.9, 5.45, 6.0, 6.54, 7.09, 7.63, 8.18, 8.72, 9.27, 9.81, 10.36, 10.9, 11.45, 12.0, 12.54, 13.09, 13.63, 14.18, 14.72, 15.27],
    synthType: "cyber",
  },
];

export const PRESET_SFX: { id: SoundEffectType; label: string; icon: string; duration: number }[] = [
  { id: "boom", label: "Vine Boom", icon: "💥", duration: 0.6 },
  { id: "whoosh", label: "Swipe Whoosh", icon: "💨", duration: 0.4 },
  { id: "glitch", label: "Glitch Stutter", icon: "⚡", duration: 0.5 },
  { id: "pop", label: "Pop / Tap", icon: "🫧", duration: 0.2 },
  { id: "cheer", label: "Stadium Cheer", icon: "🎉", duration: 1.2 },
  { id: "horn", label: "Airhorn", icon: "📢", duration: 0.8 },
  { id: "camera", label: "Camera Shutter", icon: "📸", duration: 0.3 },
  { id: "fail", label: "Sad Trombone", icon: "🎺", duration: 1.4 },
  { id: "cash", label: "Cash Register", icon: "💰", duration: 0.7 },
  { id: "rim", label: "Ba-Dum Tss", icon: "🥁", duration: 0.9 },
  { id: "rewind", label: "Tape Rewind", icon: "⏪", duration: 0.6 },
  { id: "sting", label: "Dramatic Sting", icon: "🎻", duration: 1.0 },
];

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      globalAudioCtx = new AudioCtx();
    }
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    void globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

// Play single sound effect
export function playStudioSFX(id: SoundEffectType, volume = 1.0) {
  const ac = getAudioContext();
  if (!ac) return;
  const t = ac.currentTime;
  const master = ac.createGain();
  master.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), t);
  master.connect(ac.destination);

  if (id === "boom") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.55);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.65);
    return;
  }

  if (id === "whoosh") {
    // Filtered noise sweep
    const bufferSize = ac.sampleRate * 0.4;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2800, t + 0.2);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.4);
    filter.Q.setValueAtTime(3, t);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    noise.connect(filter).connect(gain).connect(master);
    noise.start(t);
    noise.stop(t + 0.4);
    return;
  }

  if (id === "glitch") {
    // Rapid square wave bursts
    for (let i = 0; i < 4; i++) {
      const burstTime = t + i * 0.09;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(300 + Math.random() * 900, burstTime);
      gain.gain.setValueAtTime(0.2, burstTime);
      gain.gain.linearRampToValueAtTime(0.001, burstTime + 0.06);
      osc.connect(gain).connect(master);
      osc.start(burstTime);
      osc.stop(burstTime + 0.07);
    }
    return;
  }

  if (id === "pop") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.13);
    return;
  }

  if (id === "camera") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.1);
    return;
  }

  if (id === "rewind") {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.25);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + 0.55);
    return;
  }

  if (id === "cheer") {
    // Multi-oscillator chord celebration
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.1 + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 1.0);
    });
    return;
  }

  // Fallback bell chime
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(523.25, t);
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + 0.45);
}

// Background music synthesizer loop for seamless in-browser playback
class MusicSynthesizer {
  private activeNodes: (AudioNode | number)[] = [];
  private isPlaying = false;
  private timer: number | null = null;

  start(synthType: PresetMusicTrack["synthType"], bpm: number, volume = 0.7) {
    this.stop();
    const ac = getAudioContext();
    if (!ac) return;

    this.isPlaying = true;
    const beatIntervalMs = (60 / bpm) * 1000;
    let step = 0;

    const playStep = () => {
      if (!this.isPlaying) return;
      const t = ac.currentTime;
      const master = ac.createGain();
      master.gain.setValueAtTime(volume * 0.4, t);
      master.connect(ac.destination);

      if (synthType === "phonk") {
        // Kick on 0, 4, 8, 12, cowbell on offbeats
        if (step % 4 === 0) {
          const kick = ac.createOscillator();
          const kGain = ac.createGain();
          kick.type = "sine";
          kick.frequency.setValueAtTime(140, t);
          kick.frequency.exponentialRampToValueAtTime(35, t + 0.2);
          kGain.gain.setValueAtTime(0.6, t);
          kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
          kick.connect(kGain).connect(master);
          kick.start(t);
          kick.stop(t + 0.25);
        }
        // Phonk cowbell synth note
        const cowNotes = [587.33, 659.25, 783.99, 880.0];
        const note = cowNotes[step % cowNotes.length];
        const bell = ac.createOscillator();
        const bGain = ac.createGain();
        bell.type = "sawtooth";
        bell.frequency.setValueAtTime(note, t);
        bGain.gain.setValueAtTime(0.18, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        bell.connect(bGain).connect(master);
        bell.start(t);
        bell.stop(t + 0.18);
      } else if (synthType === "dholak") {
        // Desi rhythmic punch
        const bass = ac.createOscillator();
        const bGain = ac.createGain();
        bass.type = "triangle";
        bass.frequency.setValueAtTime(step % 2 === 0 ? 110 : 82, t);
        bass.frequency.exponentialRampToValueAtTime(45, t + 0.25);
        bGain.gain.setValueAtTime(0.5, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        bass.connect(bGain).connect(master);
        bass.start(t);
        bass.stop(t + 0.28);
      } else if (synthType === "lofi") {
        // Warm Rhodes-style chord note
        const lofiNotes = [261.63, 329.63, 392.0, 493.88];
        const note = lofiNotes[step % lofiNotes.length];
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 0.65);
      } else {
        // Bass drop pulse
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(step % 4 === 0 ? 65 : 130, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      step = (step + 1) % 16;
      this.timer = window.setTimeout(playStep, beatIntervalMs / 2);
    };

    playStep();
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const musicSynthesizer = new MusicSynthesizer();

// Microphone Voiceover recorder
export class VoiceoverRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async start(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder.start();
      return true;
    } catch (err) {
      console.warn("Microphone access unavailable or denied:", err);
      return false;
    }
  }

  stop(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        // Stop all mic tracks
        this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        resolve(audioUrl);
      };
      this.mediaRecorder.stop();
    });
  }
}

// Multi-track audio player for user-uploaded music files, audio assets & voiceovers
export class AudioPlayerManager {
  private audioElements = new Map<string, HTMLAudioElement>();

  sync(
    tracks: AudioTrackItem[],
    currentTime: number,
    isPlaying: boolean,
    isMuted: boolean,
  ) {
    if (typeof window === "undefined") return;

    // Remove any audio elements for deleted tracks
    const activeTrackIds = new Set(tracks.map((t) => t.id));
    for (const [id, el] of this.audioElements.entries()) {
      if (!activeTrackIds.has(id)) {
        el.pause();
        el.src = "";
        this.audioElements.delete(id);
      }
    }

    // Synchronize each active track
    for (const track of tracks) {
      if (!track.sourceUrl || track.sourceUrl.startsWith("synth:")) {
        continue;
      }

      let el = this.audioElements.get(track.id);
      if (!el) {
        el = new Audio(track.sourceUrl);
        el.preload = "auto";
        this.audioElements.set(track.id, el);
      }

      const trackStart = track.timelineStart;
      const trackEnd = track.timelineStart + track.duration;
      const isInRange = currentTime >= trackStart && currentTime < trackEnd;

      if (isInRange && isPlaying && !isMuted && !track.muted) {
        const targetTime = currentTime - trackStart;
        if (Math.abs(el.currentTime - targetTime) > 0.25) {
          try {
            el.currentTime = targetTime;
          } catch {}
        }

        const vol = Math.max(0, Math.min(1, (track.volume ?? 100) / 100));
        el.volume = vol;

        if (el.paused) {
          el.play().catch(() => {});
        }
      } else {
        if (!el.paused) {
          el.pause();
        }
        if (!isInRange) {
          try {
            el.currentTime = 0;
          } catch {}
        }
      }
    }
  }

  stopAll() {
    for (const el of this.audioElements.values()) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {}
    }
  }
}

export const audioPlayerManager = new AudioPlayerManager();

