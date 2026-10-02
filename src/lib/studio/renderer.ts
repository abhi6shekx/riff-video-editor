// Realtime Canvas Renderer & Video Export Pipeline for RIFF Studio
import type { EditorProject, VideoClip, AspectRatio, TransitionType } from "./types";
import { getAudioContext } from "./audio-engine";

export type RenderDimensions = {
  width: number;
  height: number;
};

export function getDimensionsForRatio(ratio: AspectRatio, scale: "preview" | "1080p" = "preview"): RenderDimensions {
  if (scale === "1080p") {
    switch (ratio) {
      case "9:16":
        return { width: 1080, height: 1920 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "4:5":
        return { width: 1080, height: 1350 };
      case "16:9":
        return { width: 1920, height: 1080 };
    }
  }

  // Preview sizing (crisp 720p base for mobile/desktop smoothness)
  switch (ratio) {
    case "9:16":
      return { width: 540, height: 960 };
    case "1:1":
      return { width: 640, height: 640 };
    case "4:5":
      return { width: 540, height: 675 };
    case "16:9":
      return { width: 960, height: 540 };
  }
}

// Media cache to prevent re-loading images/videos on every frame
class MediaAssetCache {
  private images = new Map<string, HTMLImageElement>();
  private videos = new Map<string, HTMLVideoElement>();

  getImage(url: string): HTMLImageElement | null {
    if (!this.images.has(url)) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      this.images.set(url, img);
      return null;
    }
    const img = this.images.get(url)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  getVideo(url: string): HTMLVideoElement | null {
    if (!this.videos.has(url)) {
      const vid = document.createElement("video");
      vid.crossOrigin = "anonymous";
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "auto";
      this.videos.set(url, vid);
      return null;
    }
    return this.videos.get(url)!;
  }
}

export const mediaCache = new MediaAssetCache();

// Core Frame Compositor
export function renderStudioFrame(
  ctx: CanvasRenderingContext2D,
  project: EditorProject,
  currentTime: number,
  dimensions: RenderDimensions,
) {
  const { width, height } = dimensions;

  // Clear canvas
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // 1. Find active video clip
  const clips = project.clips;
  let activeClip: VideoClip | null = null;
  let activeClipIndex = -1;
  let prevClip: VideoClip | null = null;

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    if (currentTime >= c.timelineStart && currentTime <= c.timelineEnd) {
      activeClip = c;
      activeClipIndex = i;
      if (i > 0) prevClip = clips[i - 1];
      break;
    }
  }

  // Fallback to first or last clip if playhead is slightly off
  if (!activeClip && clips.length > 0) {
    if (currentTime < clips[0].timelineStart) {
      activeClip = clips[0];
      activeClipIndex = 0;
    } else {
      activeClip = clips[clips.length - 1];
      activeClipIndex = clips.length - 1;
      if (clips.length > 1) prevClip = clips[clips.length - 2];
    }
  }

  // 2. Render Media Frame with Filters & Adjustments
  if (activeClip) {
    renderClipWithTransitionsAndAdjustments(
      ctx,
      activeClip,
      prevClip,
      currentTime,
      dimensions,
      project,
    );
  }

  // 3. Render Active Visual Effects (FX)
  const activeEffects = project.effects.filter(
    (e) => currentTime >= e.timelineStart && currentTime <= e.timelineEnd,
  );
  activeEffects.forEach((fx) => {
    applyVisualEffect(ctx, fx.effect, fx.intensity, dimensions, currentTime);
  });

  // 4. Render Active Stickers
  const activeStickers = project.stickers.filter(
    (s) => currentTime >= s.timelineStart && currentTime <= s.timelineEnd,
  );
  activeStickers.forEach((stk) => {
    renderSticker(ctx, stk, dimensions, currentTime);
  });

  // 5. Render Active Text Layers
  const activeText = project.textLayers.filter(
    (t) => currentTime >= t.timelineStart && currentTime <= t.timelineEnd,
  );
  activeText.forEach((txt) => {
    renderTextLayer(ctx, txt, dimensions, currentTime);
  });

  // 6. Render Active Captions / Subtitles
  const activeCaption = project.captions.find(
    (c) => currentTime >= c.timelineStart && currentTime <= c.timelineEnd,
  );
  if (activeCaption) {
    renderCaption(ctx, activeCaption, dimensions, currentTime);
  }

  // 7. Render Meme Mode Overlay (Top & Bottom Impact Text)
  if (project.memeMode) {
    renderMemeModeOverlay(ctx, project.memeTopText, project.memeBottomText, dimensions);
  }

  // 8. Watermark (Only if remixed)
  if (project.remixedFrom) {
    renderRiffWatermark(ctx, project.remixedFrom.authorHandle, dimensions);
  }

  ctx.restore();
}

function renderClipWithTransitionsAndAdjustments(
  ctx: CanvasRenderingContext2D,
  clip: VideoClip,
  prevClip: VideoClip | null,
  currentTime: number,
  dimensions: RenderDimensions,
  project: EditorProject,
) {
  const { width, height } = dimensions;
  const adj = project.adjustments;

  // Build CSS filter string for color grading
  let filterStr = `brightness(${adj.brightness}%) contrast(${adj.contrast}%) saturate(${adj.saturation}%)`;
  if (adj.filterPreset === "vintage") filterStr += " sepia(0.4) contrast(1.1)";
  if (adj.filterPreset === "cinematic") filterStr += " contrast(1.25) saturate(1.15)";
  if (adj.filterPreset === "dark") filterStr += " brightness(0.85) contrast(1.2)";
  if (adj.filterPreset === "warm") filterStr += " sepia(0.2) hue-rotate(-10deg)";
  if (adj.filterPreset === "cold") filterStr += " hue-rotate(15deg) saturate(0.9)";
  if (adj.filterPreset === "cyber_glow") filterStr += " brightness(1.1) contrast(1.2) saturate(1.3)";
  if (adj.blur) filterStr += ` blur(${adj.blur}px)`;

  ctx.save();
  ctx.filter = filterStr;

  // Opacity
  if (clip.opacity !== undefined) {
    ctx.globalAlpha = Math.max(0, Math.min(1, clip.opacity));
  }

  // Check if entering clip has an active transition
  const transition = clip.transitionIn;
  const clipProgress = currentTime - clip.timelineStart;
  const isTransitioning = transition && transition.type !== "none" && clipProgress < transition.duration;

  if (isTransitioning && transition) {
    const tProgress = Math.max(0, Math.min(1, clipProgress / transition.duration));
    applyTransitionTransform(ctx, transition.type, tProgress, width, height);
  }

  // Draw media image or video
  if (clip.mediaType === "video") {
    const vid = mediaCache.getVideo(clip.sourceUrl);
    if (vid) {
      const targetTime = clip.sourceStart + Math.max(0, currentTime - clip.timelineStart) * clip.speed;
      if (Math.abs(vid.currentTime - targetTime) > 0.15) {
        vid.currentTime = targetTime;
      }
      drawMediaCover(ctx, vid, width, height, clip);
    } else {
      ctx.fillStyle = "#161923";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#8B90A0";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading Video Frame...", width / 2, height / 2);
    }
  } else {
    const img = mediaCache.getImage(clip.sourceUrl);
    if (img) {
      drawMediaCover(ctx, img, width, height, clip);
    } else {
      ctx.fillStyle = "#161923";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#8B90A0";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Loading Media Frame...", width / 2, height / 2);
    }
  }

  ctx.restore();

  // Apply Vignette overlay
  if (adj.vignette > 0) {
    const grad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.3,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7,
    );
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${adj.vignette / 100})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
}

// Cover image/video to full canvas maintaining aspect ratio with transform support
function drawMediaCover(
  ctx: CanvasRenderingContext2D,
  element: HTMLImageElement | HTMLVideoElement,
  canvasW: number,
  canvasH: number,
  clip: VideoClip,
) {
  ctx.save();

  // Translation to center + user position offsets
  const posX = (clip.x || 0) * 0.01 * canvasW;
  const posY = (clip.y || 0) * 0.01 * canvasH;
  ctx.translate(canvasW / 2 + posX, canvasH / 2 + posY);

  // Rotation
  const rotation = clip.rotation || 0;
  if (rotation !== 0) {
    ctx.rotate((rotation * Math.PI) / 180);
  }

  // Flips & Scale
  const flipX = clip.flipH ? -1 : 1;
  const flipY = clip.flipV ? -1 : 1;
  const scale = clip.scale || 1.0;
  ctx.scale(flipX * scale, flipY * scale);

  const elW = element instanceof HTMLVideoElement ? element.videoWidth || 1080 : element.naturalWidth || 1080;
  const elH = element instanceof HTMLVideoElement ? element.videoHeight || 1920 : element.naturalHeight || 1920;
  const canvasRatio = canvasW / canvasH;
  const elRatio = elW / elH;

  let renderW = canvasW;
  let renderH = canvasH;

  if (elRatio > canvasRatio) {
    renderH = canvasH;
    renderW = canvasH * elRatio;
  } else {
    renderW = canvasW;
    renderH = canvasW / elRatio;
  }

  ctx.drawImage(element, -renderW / 2, -renderH / 2, renderW, renderH);
  ctx.restore();
}

// Transition Transforms (Zoom, Fade, Flash, Glitch, Spin, Shake, Slide)
function applyTransitionTransform(
  ctx: CanvasRenderingContext2D,
  type: TransitionType,
  progress: number, // 0 (start) to 1 (end)
  width: number,
  height: number,
) {
  if (type === "fade") {
    ctx.globalAlpha = progress;
  } else if (type === "zoom") {
    const scale = 0.6 + progress * 0.4;
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
    ctx.globalAlpha = Math.min(1, progress * 1.5);
  } else if (type === "flash") {
    // White exposure flare
    ctx.globalAlpha = 0.5 + progress * 0.5;
  } else if (type === "spin") {
    const angle = (1 - progress) * Math.PI;
    const scale = 0.7 + progress * 0.3;
    ctx.translate(width / 2, height / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2, -height / 2);
  } else if (type === "slide_left") {
    const xOffset = (1 - progress) * width;
    ctx.translate(xOffset, 0);
  } else if (type === "slide_right") {
    const xOffset = -(1 - progress) * width;
    ctx.translate(xOffset, 0);
  } else if (type === "shake") {
    const shakeAmount = (1 - progress) * 20;
    const dx = (Math.random() - 0.5) * shakeAmount;
    const dy = (Math.random() - 0.5) * shakeAmount;
    ctx.translate(dx, dy);
  }
}

// Visual Effects (FX) Renderer
function applyVisualEffect(
  ctx: CanvasRenderingContext2D,
  effect: string,
  intensity: number,
  dimensions: RenderDimensions,
  currentTime: number,
) {
  const { width, height } = dimensions;
  const factor = intensity / 100;

  if (effect === "glitch") {
    // Horizontal RGB slice displacement
    const slices = Math.floor(6 * factor) + 2;
    for (let i = 0; i < slices; i++) {
      const sliceY = Math.random() * height;
      const sliceH = Math.random() * 25 + 5;
      const shiftX = (Math.random() - 0.5) * 35 * factor;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, sliceY, width, sliceH);
      ctx.clip();
      ctx.drawImage(ctx.canvas, shiftX, 0);
      ctx.fillStyle = `rgba(0, 240, 255, ${0.15 * factor})`;
      ctx.fillRect(0, sliceY, width, sliceH);
      ctx.restore();
    }
  } else if (effect === "shake") {
    const dx = (Math.random() - 0.5) * 16 * factor;
    const dy = (Math.random() - 0.5) * 16 * factor;
    ctx.drawImage(ctx.canvas, dx, dy);
  } else if (effect === "flash") {
    const strobe = Math.sin(currentTime * 30) > 0 ? 0.3 * factor : 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${strobe})`;
    ctx.fillRect(0, 0, width, height);
  } else if (effect === "vhs") {
    // Scanlines
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }
    // VHS Timestamp & REC icon
    ctx.fillStyle = "#FF3366";
    ctx.beginPath();
    ctx.arc(35, 45, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText("REC  PLAY  SP", 50, 50);
  } else if (effect === "rgb_split") {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(ctx.canvas, -4 * factor, 0);
    ctx.drawImage(ctx.canvas, 4 * factor, 0);
    ctx.restore();
  } else if (effect === "vintage_grain") {
    // 35mm film grain noise overlay
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 100;
    grainCanvas.height = 100;
    const gctx = grainCanvas.getContext("2d");
    if (gctx) {
      const imgData = gctx.createImageData(100, 100);
      const data = imgData.data;
      const grainAlpha = Math.floor(65 * factor);
      for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() > 0.5 ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
        data[i + 3] = Math.random() * grainAlpha;
      }
      gctx.putImageData(imgData, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      const pat = ctx.createPattern(grainCanvas, "repeat");
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, width, height);
      }
      ctx.restore();
    }
  } else if (effect === "pixelate") {
    const pixelSize = Math.max(4, Math.floor(22 * factor));
    const smallW = Math.max(1, Math.floor(width / pixelSize));
    const smallH = Math.max(1, Math.floor(height / pixelSize));
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ctx.canvas, 0, 0, smallW, smallH);
    ctx.drawImage(ctx.canvas, 0, 0, smallW, smallH, 0, 0, width, height);
    ctx.restore();
  } else if (effect === "blur" || effect === "motion_blur") {
    ctx.save();
    ctx.filter = `blur(${Math.max(1, Math.round(10 * factor))}px)`;
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.restore();
  }
}

// Text Layer Renderer
function renderTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: EditorProject["textLayers"][0],
  dimensions: RenderDimensions,
  currentTime: number,
) {
  const { width, height } = dimensions;
  const x = (layer.x / 100) * width;
  const y = (layer.y / 100) * height;

  // Scale font relative to standard 540w preview
  const scaledSize = Math.round(layer.fontSize * (width / 540));
  const weight = layer.fontWeight || (layer.fontFamily === "Impact" ? "900" : "bold");
  const fStyle = layer.fontStyle === "italic" ? "italic" : "normal";

  let fontFamily = "sans-serif";
  if (layer.fontFamily === "Impact") fontFamily = "Anton, Impact, sans-serif";
  if (layer.fontFamily === "Display") fontFamily = "Syne, sans-serif";
  if (layer.fontFamily === "Monospace") fontFamily = "monospace";
  if (layer.fontFamily === "Serif") fontFamily = "serif";

  const fontStr = `${fStyle} ${weight} ${scaledSize}px ${fontFamily}`;

  ctx.save();
  ctx.font = fontStr;
  ctx.textAlign = (layer.textAlign as CanvasTextAlign) || "center";
  ctx.textBaseline = "middle";

  let displayText = layer.text;
  const duration = layer.timelineEnd - layer.timelineStart;
  const progress = Math.max(0, Math.min(1, (currentTime - layer.timelineStart) / duration));

  // Typewriter animation
  if (layer.animation === "typewriter") {
    const charsToShow = Math.floor(progress * layer.text.length);
    displayText = layer.text.slice(0, charsToShow);
  }

  // Pop / Bounce animation
  let scale = 1.0;
  if (layer.animation === "pop" && progress < 0.2) {
    scale = 1.0 + Math.sin((progress / 0.2) * Math.PI) * 0.3;
  } else if (layer.animation === "bounce") {
    scale = 1.0 + Math.sin(currentTime * 8) * 0.08;
  }

  ctx.translate(x, y);
  if (layer.rotation) {
    ctx.rotate((layer.rotation * Math.PI) / 180);
  }
  ctx.scale(scale, scale);

  // Shadow
  if (layer.shadowColor) {
    ctx.shadowColor = layer.shadowColor;
    ctx.shadowBlur = (layer.shadowBlur || 8) * (width / 540);
    ctx.shadowOffsetX = 2 * (width / 540);
    ctx.shadowOffsetY = 2 * (width / 540);
  }

  // Background pill / box if set
  if (layer.bgColor || layer.style === "pill") {
    const metrics = ctx.measureText(displayText);
    const pad = (layer.bgPadding || 14) * (width / 540);
    const radius = (layer.bgRadius || 10) * (width / 540);
    ctx.fillStyle = layer.bgColor || "rgba(0, 0, 0, 0.75)";
    ctx.beginPath();
    const boxX = layer.textAlign === "left" ? -pad : layer.textAlign === "right" ? -metrics.width - pad : -metrics.width / 2 - pad;
    ctx.roundRect(
      boxX,
      -scaledSize / 2 - pad / 2,
      metrics.width + pad * 2,
      scaledSize + pad,
      radius,
    );
    ctx.fill();
  }

  // Stroke / Outline
  if (layer.strokeWidth || layer.style === "meme_impact") {
    const sWidth = (layer.strokeWidth || 4) * (width / 540);
    ctx.strokeStyle = layer.strokeColor || "#000000";
    ctx.lineWidth = sWidth;
    ctx.lineJoin = "round";
    ctx.strokeText(displayText, 0, 0);
  }

  // Text Fill
  ctx.fillStyle = layer.color || "#FFFFFF";
  ctx.fillText(displayText, 0, 0);

  ctx.restore();
}

// Subtitles / Captions Renderer
function renderCaption(
  ctx: CanvasRenderingContext2D,
  caption: EditorProject["captions"][0],
  dimensions: RenderDimensions,
  currentTime: number,
) {
  const { width, height } = dimensions;
  const fontSize = Math.round(18 * (width / 540));

  ctx.save();
  ctx.font = `800 ${fontSize}px Syne, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const y = height * 0.78; // Standard lower-third position

  // Draw pill background
  const metrics = ctx.measureText(caption.text);
  const padX = 16 * (width / 540);
  const padY = 8 * (width / 540);

  ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
  ctx.beginPath();
  ctx.roundRect(
    width / 2 - metrics.width / 2 - padX,
    y - fontSize / 2 - padY,
    metrics.width + padX * 2,
    fontSize + padY * 2,
    14,
  );
  ctx.fill();

  // Border outline
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Word-by-word karaoke highlighting
  if (caption.words && caption.words.length > 0) {
    let currentX = width / 2 - metrics.width / 2;
    ctx.textAlign = "left";

    caption.words.forEach((w) => {
      const isWordActive = currentTime >= w.start && currentTime <= w.end;
      ctx.fillStyle = isWordActive ? "#00F0FF" : "#FFFFFF";
      ctx.fillText(w.word + " ", currentX, y);
      currentX += ctx.measureText(w.word + " ").width;
    });
  } else {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(caption.text, width / 2, y);
  }

  ctx.restore();
}

// Stickers Renderer
function renderSticker(
  ctx: CanvasRenderingContext2D,
  sticker: EditorProject["stickers"][0],
  dimensions: RenderDimensions,
  currentTime: number,
) {
  const { width, height } = dimensions;
  const x = (sticker.x / 100) * width;
  const y = (sticker.y / 100) * height;
  const baseSize = Math.round(40 * sticker.scale * (width / 540));

  ctx.save();
  ctx.translate(x, y);

  if (sticker.rotation) {
    ctx.rotate((sticker.rotation * Math.PI) / 180);
  }

  if (sticker.animation === "bounce") {
    const scaleAnim = 1.0 + Math.sin(currentTime * 6) * 0.12;
    ctx.scale(scaleAnim, scaleAnim);
  } else if (sticker.animation === "pulse") {
    const scaleAnim = 1.0 + Math.sin(currentTime * 10) * 0.08;
    ctx.scale(scaleAnim, scaleAnim);
  }

  ctx.font = `${baseSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(sticker.emojiOrUrl, 0, 0);

  ctx.restore();
}

// Meme Mode Top & Bottom Text Overlay
function renderMemeModeOverlay(
  ctx: CanvasRenderingContext2D,
  topText: string,
  bottomText: string,
  dimensions: RenderDimensions,
) {
  const { width, height } = dimensions;
  const fontSize = Math.round(32 * (width / 540));

  ctx.save();
  ctx.font = `900 ${fontSize}px Anton, Impact, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#FFFFFF";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 6 * (width / 540);
  ctx.lineJoin = "round";

  // Top Text
  if (topText) {
    const topY = height * 0.08;
    ctx.strokeText(topText.toUpperCase(), width / 2, topY);
    ctx.fillText(topText.toUpperCase(), width / 2, topY);
  }

  // Bottom Text
  if (bottomText) {
    const botY = height * 0.92;
    ctx.strokeText(bottomText.toUpperCase(), width / 2, botY);
    ctx.fillText(bottomText.toUpperCase(), width / 2, botY);
  }

  ctx.restore();
}

// -------------------------------------------------------------
// Browser Video Export Engine (Client-side MediaRecorder)
// -------------------------------------------------------------
export async function exportStudioVideo(
  project: EditorProject,
  onProgress: (percent: number, stepLabel: string) => void,
  settings?: { resolution?: "720p" | "1080p"; fps?: number; format?: "mp4" | "webm" },
): Promise<{ blob: Blob; url: string; thumbnail: string; format: string; mimeType?: string }> {
  const exportCanvas = document.createElement("canvas");
  const scale = settings?.resolution === "1080p" ? "1080p" : "preview";
  const dims = getDimensionsForRatio(project.aspectRatio, scale);
  exportCanvas.width = dims.width;
  exportCanvas.height = dims.height;

  const ctx = exportCanvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not initialize canvas 2D context for export.");

  onProgress(5, "Analyzing clips & tracks...");

  // Generate thumbnail from first frame
  renderStudioFrame(ctx, project, 0.5, dims);
  const thumbnail = exportCanvas.toDataURL("image/jpeg", 0.85);

  const fps = settings?.fps || 30;
  const totalDuration = Math.max(1.0, project.duration);
  const totalFrames = Math.floor(totalDuration * fps);

  // Check MediaRecorder support
  const stream = exportCanvas.captureStream(fps);

  // Set up audio destination
  const ac = getAudioContext();
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  if (ac) {
    audioDest = ac.createMediaStreamDestination();
    audioDest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }

  // Detect mime type
  const preferMp4 = settings?.format === "mp4";
  let mimeType = "video/webm";

  const mp4Candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4;codecs=h264",
    "video/mp4",
  ];

  if (preferMp4) {
    for (const cand of mp4Candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }
  }

  if (!mimeType.includes("mp4")) {
    const webmCandidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp8",
      "video/webm",
    ];
    for (const cand of webmCandidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(cand)) {
        mimeType = cand;
        break;
      }
    }
  }

  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_500_000,
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  const recordingDone = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const fullBlob = new Blob(recordedChunks, { type: mimeType });
      resolve(fullBlob);
    };
  });

  recorder.start();

  // Frame by frame stepping
  for (let frame = 0; frame < totalFrames; frame++) {
    const time = (frame / fps);
    renderStudioFrame(ctx, project, time, dims);

    const percent = Math.min(95, Math.round((frame / totalFrames) * 90) + 5);
    if (frame % 5 === 0) {
      onProgress(percent, `Rendering video frames: ${frame}/${totalFrames}...`);
      // Allow DOM to breathe
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  onProgress(95, "Finalizing audio and encoding...");
  recorder.stop();

  const finalBlob = await recordingDone;
  const videoUrl = URL.createObjectURL(finalBlob);

  onProgress(100, "Export complete!");
  const actualFormat = mimeType.includes("mp4") ? "mp4" : "webm";
  return {
    blob: finalBlob,
    url: videoUrl,
    thumbnail,
    format: actualFormat,
    mimeType,
  };
}

// RIFF Watermark Overlay Renderer
function renderRiffWatermark(
  ctx: CanvasRenderingContext2D,
  username: string,
  dimensions: RenderDimensions,
) {
  const { width, height } = dimensions;
  const scale = width / 540;
  const margin = Math.round(16 * scale);
  const pillHeight = Math.round(28 * scale);

  ctx.save();
  ctx.translate(margin, height - margin - pillHeight);

  const text = `RIFF · @${username}`;
  const fontSize = Math.round(10 * scale);
  ctx.font = `bold ${fontSize}px Syne, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const iconSize = Math.round(14 * scale);
  const pillWidth = iconSize + textMetrics.width + Math.round(22 * scale);

  // Frosted dark pill background
  ctx.fillStyle = "rgba(12, 14, 22, 0.85)";
  ctx.strokeStyle = "rgba(0, 210, 211, 0.4)";
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(0, 0, pillWidth, pillHeight, pillHeight / 2);
  ctx.fill();
  ctx.stroke();

  // Cyan icon mark dot
  ctx.fillStyle = "#00D2D3";
  ctx.beginPath();
  ctx.arc(iconSize / 2 + Math.round(6 * scale), pillHeight / 2, iconSize / 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Watermark label string
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, iconSize + Math.round(10 * scale), pillHeight / 2);

  ctx.restore();
}
