import type { ReelProjectState, RenderOptions, RenderResult, FilterPreset } from "./types";
import { getWatermarkConfig, drawWatermark } from "./watermark";

/**
 * Returns CSS filter string corresponding to the preset
 */
export function getFilterCss(filter: FilterPreset): string {
  switch (filter) {
    case "Vivid":
      return "saturate(1.5) contrast(1.15) brightness(1.05)";
    case "Dark":
      return "contrast(1.3) brightness(0.8) saturate(0.9)";
    case "Retro":
      return "sepia(0.35) contrast(1.1) brightness(0.95) hue-rotate(-10deg)";
    case "Cyberpunk":
      return "hue-rotate(280deg) contrast(1.35) saturate(1.6) brightness(1.1)";
    case "Cinema":
      return "contrast(1.25) brightness(0.9) saturate(0.85)";
    case "Monochrome":
      return "grayscale(1) contrast(1.2)";
    case "Normal":
    default:
      return "none";
  }
}

/**
 * Full Multi-Layer Reel Render Engine.
 *
 * Composites:
 * 1. Multi-clip Video Timeline Sequence
 * 2. Mixed Multi-Track Audio Engine (Web Audio API)
 * 3. Color Grading & Video Filter Matrix
 * 4. Draggable / Resizable PIP Video & Image Overlays
 * 5. Multi-Layer Typography with custom fonts, strokes, and shadows
 * 6. Permanent RIFF Branding Watermark (@username)
 *
 * Outputs high-quality 1080x1920 MP4/WebM file.
 */
export async function renderReelProject(
  project: ReelProjectState,
  options: RenderOptions
): Promise<RenderResult> {
  const width = options.width ?? 1080;
  const height = options.height ?? 1920;
  const fps = options.fps ?? 30;

  const validClips = project.clips.filter((c) => c.duration > 0 && c.end > c.start);

  if (validClips.length === 0) {
    throw new Error("Cannot export: No valid video clips found on the timeline.");
  }

  // Calculate total duration across all clips
  const totalDuration = validClips.reduce(
    (acc, clip) => acc + (clip.end - clip.start) / (project.speed || 1),
    0
  );

  options.onProgress?.({
    progress: 2,
    stage: "Initializing canvas & audio context...",
    currentTime: 0,
    totalTime: totalDuration,
  });

  // 1. Prepare Offscreen Canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });

  if (!ctx) {
    throw new Error("Unable to create 2D rendering context.");
  }

  const renderCtx: CanvasRenderingContext2D = ctx;

  // 2. Prepare Web Audio API Mixer
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  const audioDest = audioCtx.createMediaStreamDestination();

  // Load background audio tracks
  const bgAudioElements: HTMLAudioElement[] = [];
  for (const track of project.audioTracks) {
    if (!track.muted && track.volume > 0) {
      const audioEl = new Audio(track.url);
      if (track.url.startsWith("http://") || track.url.startsWith("https://")) {
        audioEl.crossOrigin = "anonymous";
      }
      audioEl.volume = Math.max(0, Math.min(1, track.volume));
      const source = audioCtx.createMediaElementSource(audioEl);
      source.connect(audioDest);
      bgAudioElements.push(audioEl);
    }
  }

  // Load PIP video elements and image elements
  const pipMediaMap = new Map<string, HTMLVideoElement | HTMLImageElement>();
  for (const pip of project.pipLayers) {
    if (pip.type === "video") {
      const pipVideo = document.createElement("video");
      pipVideo.src = pip.url;
      if (pip.url.startsWith("http://") || pip.url.startsWith("https://")) {
        pipVideo.crossOrigin = "anonymous";
      }
      pipVideo.muted = pip.muted;
      pipVideo.loop = true;
      pipVideo.playsInline = true;
      if (!pip.muted) {
        try {
          const source = audioCtx.createMediaElementSource(pipVideo);
          source.connect(audioDest);
        } catch {
          // fallback if CORS prevents WebAudio capture
        }
      }
      pipMediaMap.set(pip.id, pipVideo);
    } else {
      const pipImg = new Image();
      if (pip.url.startsWith("http://") || pip.url.startsWith("https://")) {
        pipImg.crossOrigin = "anonymous";
      }
      pipImg.src = pip.url;
      pipMediaMap.set(pip.id, pipImg);
    }
  }

  // 3. Create MediaRecorder
  const videoStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  let mimeType = "video/webm;codecs=vp9,opus";
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = "video/webm;codecs=vp8,opus";
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 6_000_000, // 6 Mbps for high clarity 1080p
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const watermarkConfig = getWatermarkConfig({
    username: options.username,
    position: options.watermarkPosition,
    opacity: options.watermarkOpacity,
  });

  // 4. Start recording and sequential clip processing
  recorder.start(100);

  // Start background audio tracks
  for (const a of bgAudioElements) {
    try {
      a.currentTime = 0;
      await a.play();
    } catch {
      // safe play catch
    }
  }

  // Start PIP videos
  for (const media of pipMediaMap.values()) {
    if (media instanceof HTMLVideoElement) {
      try {
        await media.play();
      } catch {
        // safe play catch
      }
    }
  }

  let accumulatedTime = 0;

  function drawOverlays() {
    // 2. Draw PIP Overlays
    for (const pip of project.pipLayers) {
      const media = pipMediaMap.get(pip.id);
      if (!media) continue;

      renderCtx.save();
      renderCtx.globalAlpha = pip.opacity;

      const pipPxX = (pip.x / 100) * width;
      const pipPxY = (pip.y / 100) * height;
      const pipPxW = (pip.width / 100) * width;
      const pipPxH = (pip.height / 100) * height;

      renderCtx.translate(pipPxX, pipPxY);
      if (pip.rotation !== 0) {
        renderCtx.rotate((pip.rotation * Math.PI) / 180);
      }

      // Rounded rect clipping for PIP
      renderCtx.beginPath();
      renderCtx.roundRect(-pipPxW / 2, -pipPxH / 2, pipPxW, pipPxH, 16);
      renderCtx.clip();

      renderCtx.drawImage(media, -pipPxW / 2, -pipPxH / 2, pipPxW, pipPxH);
      renderCtx.restore();
    }

    // 3. Draw Text Layers
    for (const textLayer of project.textLayers) {
      renderCtx.save();

      const tX = (textLayer.xPercent / 100) * width;
      const tY = (textLayer.yPercent / 100) * height;

      // Scale font proportional to 1080p canvas
      const scaledFontSize = Math.round(textLayer.fontSize * 2.8);

      const fontMap: Record<string, string> = {
        impact: `Impact, "Arial Black", sans-serif`,
        modern: `system-ui, -apple-system, sans-serif`,
        classic: `Georgia, serif`,
        mono: `ui-monospace, monospace`,
        script: `cursive, "Brush Script MT", sans-serif`,
      };

      const fontFamily = fontMap[textLayer.fontFamily] || "Impact, sans-serif";
      renderCtx.font = `900 ${scaledFontSize}px ${fontFamily}`;
      renderCtx.textAlign = (textLayer.align as CanvasTextAlign) || "center";
      renderCtx.textBaseline = "middle";

      const content = textLayer.uppercase ? textLayer.text.toUpperCase() : textLayer.text;

      // Draw background box if enabled
      if (textLayer.bgColor && textLayer.bgColor !== "transparent") {
        const metrics = renderCtx.measureText(content);
        const boxPaddingX = 24;
        const boxPaddingY = 16;
        const boxW = metrics.width + boxPaddingX * 2;
        const boxH = scaledFontSize + boxPaddingY * 2;

        renderCtx.fillStyle = textLayer.bgColor;
        renderCtx.beginPath();
        renderCtx.roundRect(tX - boxW / 2, tY - boxH / 2, boxW, boxH, 14);
        renderCtx.fill();
      }

      // Text shadow
      if (textLayer.hasShadow) {
        renderCtx.shadowColor = "rgba(0, 0, 0, 0.85)";
        renderCtx.shadowBlur = 16;
        renderCtx.shadowOffsetX = 0;
        renderCtx.shadowOffsetY = 4;
      }

      // Text stroke / outline
      if (textLayer.hasStroke) {
        renderCtx.strokeStyle = textLayer.strokeColor || "#000000";
        renderCtx.lineWidth = Math.max(4, Math.round(scaledFontSize / 8));
        renderCtx.strokeText(content, tX, tY);
      }

      // Text fill
      renderCtx.fillStyle = textLayer.color || "#ffffff";
      renderCtx.fillText(content, tX, tY);

      renderCtx.restore();
    }

    // 4. Permanent RIFF Watermark
    drawWatermark(renderCtx, watermarkConfig, width, height);
  }

  // Render each clip in sequence
  for (let clipIdx = 0; clipIdx < validClips.length; clipIdx++) {
    const clip = validClips[clipIdx];
    const clipDuration = (clip.end - clip.start) / (project.speed || 1);
    const isImageClip = clip.type === "image";

    // Handle Photo / Image Slides (e.g. Memes, Photos with audio)
    if (isImageClip) {
      const imgEl = new Image();
      if (clip.url.startsWith("http://") || clip.url.startsWith("https://")) {
        imgEl.crossOrigin = "anonymous";
      }
      imgEl.src = clip.url;
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = () => reject(new Error(`Failed to load image slide: ${clip.name}`));
      });

      const startTime = performance.now();
      const durationMs = clipDuration * 1000;

      await new Promise<void>((resolve) => {
        function renderImageLoop() {
          const now = performance.now();
          const elapsedMs = now - startTime;
          const elapsedInClip = Math.min(clipDuration, elapsedMs / 1000);

          if (elapsedMs >= durationMs) {
            resolve();
            return;
          }

          const currentTotalTime = accumulatedTime + elapsedInClip;
          const progress = Math.min(98, Math.round((currentTotalTime / totalDuration) * 95) + 3);

          options.onProgress?.({
            progress,
            stage: `Rendering Photo Slide ${clipIdx + 1}/${validClips.length}: ${clip.name}`,
            currentTime: currentTotalTime,
            totalTime: totalDuration,
          });

          // 1. Draw Main Image Frame with subtle smooth Ken Burns zoom & Filter
          renderCtx.save();
          renderCtx.filter = getFilterCss(project.filter);

          const iW = imgEl.naturalWidth || 1080;
          const iH = imgEl.naturalHeight || 1920;
          const baseScale = Math.max(width / iW, height / iH);
          const zoomProgress = (elapsedMs / durationMs) * 0.04; // subtle 4% zoom over duration
          const scale = baseScale * (1 + zoomProgress);
          const scaledW = iW * scale;
          const scaledH = iH * scale;
          const offsetX = (width - scaledW) / 2;
          const offsetY = (height - scaledH) / 2;

          renderCtx.drawImage(imgEl, offsetX, offsetY, scaledW, scaledH);
          renderCtx.restore();

          // 2. Draw PIP Overlays, Typography & Watermark
          drawOverlays();

          requestAnimationFrame(renderImageLoop);
        }

        renderImageLoop();
      });

      accumulatedTime += clipDuration;
      continue;
    }

    // Handle Video Clips
    const videoEl = document.createElement("video");
    videoEl.src = clip.url;
    if (clip.url.startsWith("http://") || clip.url.startsWith("https://")) {
      videoEl.crossOrigin = "anonymous";
    }
    videoEl.muted = project.muted;
    videoEl.playbackRate = project.speed || 1;
    videoEl.playsInline = true;

    if (!project.muted) {
      try {
        const source = audioCtx.createMediaElementSource(videoEl);
        source.connect(audioDest);
      } catch {
        // Audio connection fallback
      }
    }

    await new Promise<void>((resolve, reject) => {
      videoEl.onloadedmetadata = () => resolve();
      videoEl.onerror = () => reject(new Error(`Failed to load clip: ${clip.name}`));
    });

    videoEl.currentTime = clip.start;
    await videoEl.play();

    await new Promise<void>((resolve) => {
      function renderLoop() {
        const currentClipTime = videoEl.currentTime;

        if (currentClipTime >= clip.end || videoEl.ended || videoEl.paused) {
          videoEl.pause();
          resolve();
          return;
        }

        const elapsedInClip = Math.max(0, currentClipTime - clip.start) / (project.speed || 1);
        const currentTotalTime = accumulatedTime + elapsedInClip;
        const progress = Math.min(98, Math.round((currentTotalTime / totalDuration) * 95) + 3);

        options.onProgress?.({
          progress,
          stage: `Rendering Clip ${clipIdx + 1}/${validClips.length}: ${clip.name}`,
          currentTime: currentTotalTime,
          totalTime: totalDuration,
        });

        // 1. Draw Main Video Frame with Filter
        renderCtx.save();
        renderCtx.filter = getFilterCss(project.filter);
        
        // Scale to fill 1080x1920 (cover behavior)
        const vW = videoEl.videoWidth || 1080;
        const vH = videoEl.videoHeight || 1920;
        const scale = Math.max(width / vW, height / vH);
        const scaledW = vW * scale;
        const scaledH = vH * scale;
        const offsetX = (width - scaledW) / 2;
        const offsetY = (height - scaledH) / 2;

        renderCtx.drawImage(videoEl, offsetX, offsetY, scaledW, scaledH);
        renderCtx.restore();

        // 2. Draw PIP Overlays, Typography & Watermark
        drawOverlays();

        requestAnimationFrame(renderLoop);
      }

      renderLoop();
    });

    accumulatedTime += clipDuration;
  }

  // 5. Wrap up rendering and stop recorder
  options.onProgress?.({
    progress: 99,
    stage: "Finalizing video encoding & audio synchronization...",
    currentTime: totalDuration,
    totalTime: totalDuration,
  });

  // Stop media elements
  for (const a of bgAudioElements) {
    a.pause();
  }
  for (const m of pipMediaMap.values()) {
    if (m instanceof HTMLVideoElement) {
      m.pause();
    }
  }

  recorder.stop();
  await audioCtx.close();

  return new Promise<RenderResult>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);

      options.onProgress?.({
        progress: 100,
        stage: "Export completed successfully!",
        currentTime: totalDuration,
        totalTime: totalDuration,
      });

      resolve({
        blob,
        url,
        duration: totalDuration,
        sizeBytes: blob.size,
      });
    };
  });
}
