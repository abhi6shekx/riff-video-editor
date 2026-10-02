export type SoundId = "boom" | "horn" | "rim" | "cash" | "fail" | "sting" | "pop" | "cheer";

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: "boom", label: "Boom" },
  { id: "horn", label: "Horn" },
  { id: "rim", label: "Rim" },
  { id: "cash", label: "Cash" },
  { id: "fail", label: "Fail" },
  { id: "sting", label: "Sting" },
  { id: "pop", label: "Pop" },
  { id: "cheer", label: "Cheer" },
];

let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

function env(g: GainNode, t: number, a: number, d: number, peak = 0.22) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
}

export function playSound(id: SoundId) {
  const ac = audio();
  if (!ac) return;
  void ac.resume();
  const t = ac.currentTime;
  const out = ac.destination;

  if (id === "boom") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(32, t + 0.42);
    env(g, t, 0.01, 0.5, 0.45);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.52);
    return;
  }

  if (id === "horn") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(380, t);
    o.frequency.linearRampToValueAtTime(220, t + 0.55);
    env(g, t, 0.02, 0.6, 0.12);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.62);
    return;
  }

  if (id === "rim") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    env(g, t, 0.005, 0.12, 0.2);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.14);
    const o2 = ac.createOscillator();
    const g2 = ac.createGain();
    o2.type = "square";
    o2.frequency.value = 90;
    env(g2, t, 0.001, 0.08, 0.12);
    o2.connect(g2).connect(out);
    o2.start(t);
    o2.stop(t + 0.09);
    return;
  }

  if (id === "cash") {
    [880, 1174].forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      env(g, t + i * 0.09, 0.005, 0.22, 0.16);
      o.connect(g).connect(out);
      o.start(t + i * 0.09);
      o.stop(t + i * 0.09 + 0.24);
    });
    return;
  }

  if (id === "fail") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(320, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.7);
    env(g, t, 0.02, 0.75, 0.1);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.78);
    return;
  }

  if (id === "pop") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    env(g, t, 0.005, 0.09, 0.25);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.1);
    return;
  }

  if (id === "cheer") {
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    chord.forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      env(g, t + i * 0.06, 0.01, 0.35, 0.15);
      o.connect(g).connect(out);
      o.start(t + i * 0.06);
      o.stop(t + i * 0.06 + 0.38);
    });
    return;
  }

  const notes = [392, 494, 587];
  notes.forEach((freq, i) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    env(g, t + i * 0.07, 0.01, 0.32, 0.12);
    o.connect(g).connect(out);
    o.start(t + i * 0.07);
    o.stop(t + i * 0.07 + 0.34);
  });
}
