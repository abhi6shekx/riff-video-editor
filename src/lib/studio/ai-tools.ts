// AI Magic Tools for RIFF Studio
// AI Auto-Edit, AI Hinglish Subtitle Generator, Beat Sync, and Meme Punchline suggestions.

import type { EditorProject, VideoClip, CaptionItem, TransitionType } from "./types";
import { PRESET_MUSIC_TRACKS } from "./audio-engine";

export type HinglishSubtitlePreset = {
  lang: "hinglish" | "hindi" | "english";
  text: string;
  duration: number;
  words: { word: string; start: number; end: number }[];
};

export const AI_SUBTITLE_PRESETS: HinglishSubtitlePreset[] = [
  {
    lang: "hinglish",
    text: "Bhai sach bata raha hoon, yeh scene alag level ka hai 🔥",
    duration: 4.5,
    words: [
      { word: "Bhai", start: 0.2, end: 0.8 },
      { word: "sach", start: 0.8, end: 1.3 },
      { word: "bata", start: 1.3, end: 1.8 },
      { word: "raha", start: 1.8, end: 2.3 },
      { word: "hoon,", start: 2.3, end: 2.8 },
      { word: "yeh", start: 2.8, end: 3.2 },
      { word: "scene", start: 3.2, end: 3.8 },
      { word: "alag!", start: 3.8, end: 4.5 },
    ],
  },
  {
    lang: "hinglish",
    text: "Wait for the end... sabka yahi haal hai 💀",
    duration: 4.0,
    words: [
      { word: "Wait", start: 0.2, end: 0.7 },
      { word: "for", start: 0.7, end: 1.1 },
      { word: "the", start: 1.1, end: 1.5 },
      { word: "end...", start: 1.5, end: 2.2 },
      { word: "sabka", start: 2.2, end: 2.8 },
      { word: "yahi", start: 2.8, end: 3.4 },
      { word: "haal!", start: 3.4, end: 4.0 },
    ],
  },
  {
    lang: "hinglish",
    text: "Office mein 5 minute ki meeting = 2 ghante barbaad 😂",
    duration: 5.0,
    words: [
      { word: "Office", start: 0.2, end: 0.8 },
      { word: "mein", start: 0.8, end: 1.3 },
      { word: "5 min", start: 1.3, end: 2.0 },
      { word: "ki", start: 2.0, end: 2.4 },
      { word: "meeting =", start: 2.4, end: 3.2 },
      { word: "2 ghante", start: 3.2, end: 4.1 },
      { word: "barbaad!", start: 4.1, end: 5.0 },
    ],
  },
  {
    lang: "english",
    text: "Nobody prepared me for this plot twist... 🤯",
    duration: 4.2,
    words: [
      { word: "Nobody", start: 0.2, end: 0.9 },
      { word: "prepared", start: 0.9, end: 1.6 },
      { word: "me", start: 1.6, end: 2.0 },
      { word: "for", start: 2.0, end: 2.5 },
      { word: "this", start: 2.5, end: 3.0 },
      { word: "twist!", start: 3.0, end: 4.2 },
    ],
  },
  {
    lang: "hindi",
    text: "ज़िंदगी में बस इतना कॉन्फिडेंस चाहिए ✨",
    duration: 4.0,
    words: [
      { word: "ज़िंदगी", start: 0.2, end: 1.0 },
      { word: "में", start: 1.0, end: 1.6 },
      { word: "बस", start: 1.6, end: 2.2 },
      { word: "इतना", start: 2.2, end: 3.0 },
      { word: "कॉन्फिडेंस!", start: 3.0, end: 4.0 },
    ],
  },
];

export const AI_MEME_PUNCHLINES = [
  {
    category: "Office & Work",
    top: "ME AT 4:59 PM ON FRIDAY",
    bottom: "MANAGER: 'HEY CAN YOU CHECK THIS EMAIL?' 💀",
  },
  {
    category: "Coding & Tech",
    top: "MY CODE ON LOCALHOST: 100% WORKING",
    bottom: "DEPLOYED ON PRODUCTION: 💥 EVERYTHING ON FIRE",
  },
  {
    category: "Relatable Life",
    top: "MY ALARM AT 6:00 AM",
    bottom: "'I WILL JUST REST MY EYES FOR 5 MINUTES' 😴",
  },
  {
    category: "Cricket & Sports",
    top: "OPPONENT CELEBRATING EARLY",
    bottom: "ME WITH 6 RUNS REQUIRED ON LAST BALL 🏏🔥",
  },
  {
    category: "Gym & Fitness",
    top: "DAY 1 AT GYM: I AM BEAST",
    bottom: "DAY 2: CANNOT EVEN GET OUT OF BED 😭",
  },
  {
    category: "Salary & Budget",
    top: "SALARY CREDITED AT 1ST OF MONTH",
    bottom: "BY 5TH OF MONTH: WHERE DID ALL MONEY GO? 💸",
  },
];

// 1. AI Auto-Edit Montage Generator
export function generateAiAutoEdit(
  sourceClips: { url: string; label: string; duration?: number }[],
): Partial<EditorProject> {
  const transitions: TransitionType[] = ["zoom", "flash", "glitch", "fade", "slide_left"];
  const music = PRESET_MUSIC_TRACKS[0]; // Phonk Drift
  const clipDuration = 2.5; // Quick punchy cuts

  let currentTimeline = 0;
  const processedClips: VideoClip[] = sourceClips.slice(0, 5).map((src, i) => {
    const tStart = currentTimeline;
    const tEnd = currentTimeline + clipDuration;
    currentTimeline = tEnd;
    return {
      id: `ai_clip_${Date.now()}_${i}`,
      name: src.label || `Scene ${i + 1}`,
      sourceUrl: src.url,
      mediaType: "image",
      duration: clipDuration,
      sourceStart: 0,
      sourceEnd: clipDuration,
      timelineStart: tStart,
      timelineEnd: tEnd,
      speed: i % 2 === 1 ? 1.25 : 1.0,
      volume: 100,
      muted: false,
      rotation: 0,
      transitionIn: i > 0 ? { type: transitions[i % transitions.length], duration: 0.4 } : undefined,
    };
  });

  const totalDuration = Math.max(8.0, currentTimeline);

  const captions: CaptionItem[] = [
    {
      id: "ai_cap_1",
      text: "AI Analyzed & Auto-Synced to the Drop ⚡",
      timelineStart: 0.5,
      timelineEnd: 3.5,
      words: [
        { word: "AI", start: 0.5, end: 1.0 },
        { word: "Analyzed", start: 1.0, end: 1.8 },
        { word: "Beat", start: 1.8, end: 2.5 },
        { word: "Synced! ⚡", start: 2.5, end: 3.5 },
      ],
    },
    {
      id: "ai_cap_2",
      text: "Silence removed • Transitions locked 🔥",
      timelineStart: 3.8,
      timelineEnd: 7.0,
      words: [
        { word: "Silence", start: 3.8, end: 4.6 },
        { word: "removed •", start: 4.6, end: 5.4 },
        { word: "Locked! 🔥", start: 5.4, end: 7.0 },
      ],
    },
  ];

  return {
    title: "AI Smart Montage",
    duration: totalDuration,
    clips: processedClips,
    audioTracks: [
      {
        id: `ai_aud_${Date.now()}`,
        title: music.title,
        artist: music.artist,
        type: "music",
        sourceUrl: `synth:${music.synthType}`,
        timelineStart: 0,
        duration: totalDuration,
        volume: 90,
        muted: false,
        fadeIn: false,
        fadeOut: true,
        beats: music.beats,
        isTrending: true,
      },
    ],
    textLayers: [
      {
        id: "ai_txt_hook",
        text: "AI SMART EDIT ✨",
        timelineStart: 0.2,
        timelineEnd: 3.0,
        x: 50,
        y: 20,
        fontFamily: "Display",
        fontSize: 24,
        color: "#00F0FF",
        strokeColor: "#000000",
        strokeWidth: 4,
        animation: "pop",
        style: "neon",
      },
    ],
    effects: [
      {
        id: "ai_fx_glitch",
        effect: "glitch",
        timelineStart: 2.4,
        timelineEnd: 2.8,
        intensity: 75,
      },
      {
        id: "ai_fx_flash",
        effect: "flash",
        timelineStart: 4.8,
        timelineEnd: 5.1,
        intensity: 85,
      },
    ],
    captions,
    adjustments: {
      brightness: 105,
      contrast: 120,
      saturation: 120,
      exposure: 5,
      temperature: -5,
      vignette: 20,
      filterPreset: "cyber_glow",
    },
  };
}

// 2. AI Beat Sync: Aligns video clip cuts to closest beat drops
export function alignClipsToBeatSync(clips: VideoClip[], beats: number[]): VideoClip[] {
  if (!beats.length || !clips.length) return clips;

  let currentStart = 0;
  return clips.map((clip, i) => {
    // Find beat closest to desired duration
    const targetEnd = currentStart + Math.max(1.5, clip.duration);
    const closestBeat = beats.reduce((prev, curr) => {
      return Math.abs(curr - targetEnd) < Math.abs(prev - targetEnd) ? curr : prev;
    }, targetEnd);

    const actualEnd = Math.max(currentStart + 1.2, closestBeat);
    const duration = actualEnd - currentStart;

    const updated: VideoClip = {
      ...clip,
      timelineStart: currentStart,
      timelineEnd: actualEnd,
      duration,
      sourceEnd: clip.sourceStart + duration * clip.speed,
    };

    currentStart = actualEnd;
    return updated;
  });
}
