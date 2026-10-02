import { createServerFn } from "@tanstack/react-start";

const OFFLINE_CAPTIONS: Record<string, { top: string; bottom: string }[]> = {
  desi: [
    { top: "SHARMA JI KA BETA", bottom: "EXISTS ONLY TO HUMILIATE ME" },
    { top: "MOM: EK BAAR PHONE RAKHO", bottom: "ALL SICKNESS WILL BE CURED" },
    { top: "GUEST: BETA KYA KAR RAHE HO", bottom: "ME: SHWAS LE RAHA HOON" },
    { top: "ONE CHAI AT TAPRI", bottom: "ALL PROBLEMS SOLVED" },
    { top: "PAPAJI CHECKING BANK SMS", bottom: "CHHUP JAO SAB LOG" },
  ],
  tech: [
    { top: "IT WORKED ON MY MACHINE", bottom: "NOW PACK YOUR BAGS FOR PROD" },
    { top: "SENIOR DEV: JUST A SMALL FIX", bottom: "3 DAYS AND 40 COMMITS LATER" },
    { top: "CSS ALIGN-ITEMS: CENTER", bottom: "WHY IS IT IN ANOTHER DIMENSION" },
    { top: "GIT PUSH --FORCE", bottom: "FEELING BRAVE TODAY" },
    { top: "AI WILL REPLACE DEVELOPERS", bottom: "ME DEBUGGING FOR 8 HOURS" },
  ],
  corporate: [
    { top: "PER MY PREVIOUS EMAIL", bottom: "WHICH YOU CLEARLY DID NOT READ" },
    { top: "QUICK 5 MINUTE SYNC", bottom: "IT IS NOW TOMORROW" },
    { top: "FRIDAY 4:59 PM", bottom: "CLIENT: URGENT CHANGE REQUIRED" },
    { top: "SALARY CREDITED", bottom: "EMIS WAITING IN THE LOBBY" },
    { top: "HR: WE ARE A FAMILY HERE", bottom: "THE TOXIC KIND APPARENTLY" },
  ],
  cricket: [
    { top: "12 NEEDED OFF 1 BALL", bottom: "BOWLER BOWLS A WIDE" },
    { top: "ME IN GULLY CRICKET", bottom: "BAT MERA HAI TOH PEHLE MAIN" },
    { top: "DRS REVIEW TAKEN", bottom: "UMPIRE LOOKING CLUELESS" },
    { top: "CATCH DROPPED AT COVER", bottom: "ENTIRE TEAM LOOKS AT GROUND" },
  ],
  night: [
    { top: "3:00 AM THOUGHTS", bottom: "HOW DOES A MICROWAVE WORK" },
    { top: "GOING TO SLEEP EARLY TODAY", bottom: "IT IS 4:18 AM" },
    { top: "JUST ONE MORE REEL", bottom: "BIRDS START CHIRPING OUTSIDE" },
    { top: "ORDERING BIRYANI AT MIDNIGHT", bottom: "WORTH EVERY RUPEE" },
  ],
  general: [
    { top: "WHEN YOU REALIZE", bottom: "IT IS NOT EVEN WEDNESDAY YET" },
    { top: "ME MAKING LIFE DECISIONS", bottom: "CONFIDENTLY WRONG" },
    { top: "TRYING TO BE PRODUCTIVE", bottom: "PHONE: HEY BESTIE" },
    { top: "EXPECTATION VS REALITY", bottom: "AND REALITY WON BY KNOCKOUT" },
    { top: "OVERTHINKING EVERYTHING", bottom: "NOW AN OLYMPIC SPORT" },
  ],
};

function getSmartOfflineCaptions(vibe: string, scene: string): { top: string; bottom: string }[] {
  const text = `${vibe} ${scene}`.toLowerCase();
  let pool = OFFLINE_CAPTIONS.general;

  if (text.includes("desi") || text.includes("bollywood") || text.includes("indian") || text.includes("chai") || text.includes("mumbai")) {
    pool = [...OFFLINE_CAPTIONS.desi, ...OFFLINE_CAPTIONS.general];
  } else if (text.includes("tech") || text.includes("code") || text.includes("dev") || text.includes("bug") || text.includes("git")) {
    pool = [...OFFLINE_CAPTIONS.tech, ...OFFLINE_CAPTIONS.general];
  } else if (text.includes("work") || text.includes("corp") || text.includes("office") || text.includes("client") || text.includes("job")) {
    pool = [...OFFLINE_CAPTIONS.corporate, ...OFFLINE_CAPTIONS.general];
  } else if (text.includes("cricket") || text.includes("sport") || text.includes("match") || text.includes("ball")) {
    pool = [...OFFLINE_CAPTIONS.cricket, ...OFFLINE_CAPTIONS.general];
  } else if (text.includes("night") || text.includes("3am") || text.includes("sleep") || text.includes("late")) {
    pool = [...OFFLINE_CAPTIONS.night, ...OFFLINE_CAPTIONS.general];
  }

  // Shuffle and pick 4
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 4);
}

function generateProceduralFrame(prompt: string): string {
  const seed = prompt.length * 37 + 101;
  const hue1 = (seed * 43) % 360;
  const hue2 = (hue1 + 140) % 360;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="hsl(${hue1}, 70%, 12%)" />
      <stop offset="50%" stop-color="hsl(${(hue1 + hue2) / 2}, 60%, 8%)" />
      <stop offset="100%" stop-color="hsl(${hue2}, 80%, 14%)" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="hsl(${hue1}, 90%, 45%)" stop-opacity="0.35" />
      <stop offset="100%" stop-color="transparent" stop-opacity="0" />
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#glow)" />
  <rect width="100%" height="100%" fill="url(#grid)" />
  <circle cx="450" cy="500" r="220" fill="none" stroke="hsl(${hue1}, 90%, 65%)" stroke-width="3" stroke-dasharray="8 6" opacity="0.4" />
  <circle cx="450" cy="500" r="140" fill="hsl(${hue2}, 85%, 25%)" opacity="0.3" />
  <path d="M 200 900 Q 450 780 700 900" fill="none" stroke="hsl(${hue2}, 80%, 60%)" stroke-width="4" opacity="0.5" />
  <text x="450" y="1120" font-family="sans-serif" font-weight="600" font-size="18" fill="rgba(255,255,255,0.4)" text-anchor="middle" letter-spacing="4">
    STUDIO FRAME · ${prompt.slice(0, 24).toUpperCase() || "RIFF GENERATIVE"}
  </text>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const writeCaptions = createServerFn({ method: "POST" })
  .validator((input: { scene: string; vibe: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      // Seamless offline fallback
      const captions = getSmartOfflineCaptions(data.vibe, data.scene);
      return { ok: true as const, captions };
    }

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          max_tokens: 280,
          temperature: 0.9,
          messages: [
            {
              role: "system",
              content:
                "You write meme captions. Return ONLY JSON: {\"captions\":[{\"top\":\"...\",\"bottom\":\"...\"}, ...] } with exactly 4 options. All-caps, punchy, max 6 words per line. No hashtags, no emojis, no quotes around the lines. Indian-English internet voice is welcome. Never mention being an AI.",
            },
            {
              role: "user",
              content: `Scene: ${data.scene.slice(0, 240)}\nVibe: ${data.vibe.slice(0, 180) || "sharp, observational, funny"}`,
            },
          ],
        }),
      });
      if (!res.ok) {
        // Fallback gracefully on API errors
        return { ok: true as const, captions: getSmartOfflineCaptions(data.vibe, data.scene) };
      }
      const body = (await res.json()) as { choices: { message: { content: string } }[] };
      const raw = body.choices[0]?.message.content ?? "";
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
        captions: { top: string; bottom: string }[];
      };
      const captions = (parsed.captions ?? [])
        .filter((c) => c && (c.top || c.bottom))
        .slice(0, 4)
        .map((c) => ({
          top: String(c.top ?? "").slice(0, 48),
          bottom: String(c.bottom ?? "").slice(0, 48),
        }));
      if (!captions.length) return { ok: true as const, captions: getSmartOfflineCaptions(data.vibe, data.scene) };
      return { ok: true as const, captions };
    } catch {
      return { ok: true as const, captions: getSmartOfflineCaptions(data.vibe, data.scene) };
    }
  });

export const generateScene = createServerFn({ method: "POST" })
  .validator((input: { prompt: string }) => input)
  .handler(async ({ data }) => {
    const prompt = data.prompt.trim().slice(0, 400);
    if (prompt.length < 3) return { ok: false as const, error: "Give the scene a little more detail." };

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      // Seamless offline procedural frame generator
      const url = generateProceduralFrame(prompt);
      return { ok: true as const, url };
    }

    try {
      const res = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-imagine-image",
          prompt: `${prompt}. Photoreal cinematic still, no text, no watermark, no logos, no celebrity likeness.`,
          n: 1,
          resolution: "1k",
          response_format: "url",
        }),
      });
      if (!res.ok) {
        return { ok: true as const, url: generateProceduralFrame(prompt) };
      }
      const body = (await res.json()) as { data: { url: string }[] };
      const url = body.data?.[0]?.url;
      if (!url) return { ok: true as const, url: generateProceduralFrame(prompt) };
      return { ok: true as const, url };
    } catch {
      return { ok: true as const, url: generateProceduralFrame(prompt) };
    }
  });
