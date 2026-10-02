export type WatermarkOptions = {
  username: string;
  position?: "bottom-left" | "bottom-right";
  opacity?: number;
};

export type WatermarkConfig = ReturnType<typeof getWatermarkConfig>;

export function getWatermarkConfig(options: WatermarkOptions) {
  return {
    username: options.username,
    position: options.position ?? "bottom-left",
    opacity: options.opacity ?? 0.9,
    text: `@${options.username}`,
  };
}

/**
 * Draws the RIFF watermark onto a CanvasRenderingContext2D.
 *
 * Always called on the EXPORTED COPY — never modifies the original media.
 * Canvas dimensions are assumed to be 1080 × 1920 (9:16).
 */
export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  config: WatermarkConfig,
  canvasWidth = 1080,
  canvasHeight = 1920,
) {
  const isRight = config.position === "bottom-right";

  const pillW = 310;
  const pillH = 66;
  const pillX = isRight ? canvasWidth - pillW - 35 : 35;
  const pillY = canvasHeight - pillH - 48; // 48px from bottom

  ctx.save();
  ctx.globalAlpha = config.opacity;

  // Dark pill background
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 18);
  ctx.fillStyle = "rgba(0, 0, 0, 0.60)";
  ctx.fill();

  // RIFF wordmark in lime
  ctx.fillStyle = "#d4ff00";
  ctx.font = "900 32px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("RIFF", pillX + 20, pillY + pillH / 2);

  // Separator dot
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.arc(pillX + 83, pillY + pillH / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // @username in white
  ctx.fillStyle = "#ffffff";
  ctx.font = "500 24px Arial, sans-serif";
  ctx.fillText(config.text, pillX + 98, pillY + pillH / 2);

  ctx.restore();
}
