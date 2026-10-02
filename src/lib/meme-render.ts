export type MemeFilter = "none" | "grayscale" | "vintage" | "deepfry" | "sepia" | "invert";

export type Sticker = {
  id: string;
  emoji: string;
  x: number; // percentage 0 to 100
  y: number; // percentage 0 to 100
  size?: number;
};

export type MemeRenderOptions = {
  fontFamily?: string;
  fontSizeRatio?: number;
  textColor?: string;
  strokeColor?: string;
  filter?: MemeFilter;
  stickers?: Sticker[];
};

function getCanvasFilter(filter?: MemeFilter): string {
  switch (filter) {
    case "grayscale":
      return "grayscale(100%)";
    case "vintage":
      return "sepia(50%) contrast(115%) brightness(95%) saturate(85%)";
    case "deepfry":
      return "contrast(240%) saturate(280%) brightness(105%)";
    case "sepia":
      return "sepia(100%)";
    case "invert":
      return "invert(100%)";
    default:
      return "none";
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export async function bakeMeme(
  imageSrc: string,
  top: string,
  bottom: string,
  options: MemeRenderOptions = {},
  mimeType: "image/jpeg" | "image/png" = "image/jpeg",
): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load the frame"));
    img.src = imageSrc;
  });

  const w = 1080;
  const h = Math.round((img.naturalHeight / img.naturalWidth) * w) || 1350;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Apply visual filter
  const filterStr = getCanvasFilter(options.filter);
  ctx.filter = filterStr;
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none"; // reset filter for text and overlays

  // Typography settings
  const fontFam = options.fontFamily || "Anton, Impact, sans-serif";
  const size = Math.round(w * (options.fontSizeRatio || 0.072));
  ctx.font = `700 ${size}px ${fontFam}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, Math.round(size * 0.16));
  ctx.strokeStyle = options.strokeColor || "#0c0b0a";
  ctx.fillStyle = options.textColor || "#fff8f0";

  const max = w * 0.88;
  const pad = h * 0.045;
  if (top.trim()) {
    const lines = wrapLines(ctx, top, max);
    lines.forEach((line, i) => {
      const y = pad + i * size * 1.08;
      ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    });
  }
  if (bottom.trim()) {
    const lines = wrapLines(ctx, bottom, max);
    ctx.textBaseline = "bottom";
    lines.forEach((line, i) => {
      const y = h - pad - (lines.length - 1 - i) * size * 1.08;
      ctx.strokeText(line, w / 2, y);
      ctx.fillText(line, w / 2, y);
    });
  }

  // Draw stickers
  if (options.stickers && options.stickers.length > 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const s of options.stickers) {
      const stickerSize = s.size || Math.round(w * 0.12);
      ctx.font = `${stickerSize}px sans-serif`;
      const sx = (s.x / 100) * w;
      const sy = (s.y / 100) * h;
      ctx.fillText(s.emoji, sx, sy);
    }
  }

  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      mimeType,
      mimeType === "image/jpeg" ? 0.92 : undefined,
    );
  });
}

export async function downloadMeme(
  imageSrc: string,
  top: string,
  bottom: string,
  name = "riff.jpg",
  options: MemeRenderOptions = {},
) {
  const blob = await bakeMeme(imageSrc, top, bottom, options, "image/jpeg");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyMemeToClipboard(
  imageSrc: string,
  top: string,
  bottom: string,
  options: MemeRenderOptions = {},
): Promise<void> {
  const blob = await bakeMeme(imageSrc, top, bottom, options, "image/png");
  if (!navigator.clipboard?.write) {
    throw new Error("Clipboard API not available in this browser");
  }
  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": blob,
    }),
  ]);
}
