import { cn } from "@/lib/utils";
import type { MemeFilter, Sticker } from "@/lib/meme-render";

function getFilterStyle(filter?: MemeFilter): string | undefined {
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
      return undefined;
  }
}

export function MemeView({
  src,
  top,
  bottom,
  className,
  alt = "",
  filter = "none",
  fontFamily,
  textColor,
  strokeColor,
  fontSizeRatio,
  stickers = [],
}: {
  src: string;
  top?: string;
  bottom?: string;
  className?: string;
  alt?: string;
  filter?: MemeFilter;
  fontFamily?: string;
  textColor?: string;
  strokeColor?: string;
  fontSizeRatio?: number;
  stickers?: Sticker[];
}) {
  const filterStyle = getFilterStyle(filter);
  const textStyle = {
    fontFamily: fontFamily || "var(--font-anton), Impact, sans-serif",
    color: textColor || "#fff8f0",
    WebkitTextStroke: strokeColor ? `2px ${strokeColor}` : undefined,
    fontSize: fontSizeRatio ? `calc(clamp(1.05rem, 4.4vw, 1.85rem) * ${fontSizeRatio / 0.072})` : undefined,
  };

  return (
    <div className={cn("relative overflow-hidden bg-raised select-none", className)}>
      <img
        src={src}
        alt={alt}
        className="block aspect-[3/4] w-full object-cover transition-[filter] duration-200"
        style={{ filter: filterStyle }}
      />
      {top ? (
        <p
          className="meme-text pointer-events-none absolute top-[5%] inset-x-[6%] text-[clamp(1.05rem,4.4vw,1.85rem)]"
          style={textStyle}
        >
          {top}
        </p>
      ) : null}
      {bottom ? (
        <p
          className="meme-text pointer-events-none absolute bottom-[5%] inset-x-[6%] text-[clamp(1.05rem,4.4vw,1.85rem)]"
          style={textStyle}
        >
          {bottom}
        </p>
      ) : null}
      {stickers.map((s) => (
        <span
          key={s.id}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 select-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            fontSize: `${s.size ? s.size / 30 : 2}rem`,
          }}
        >
          {s.emoji}
        </span>
      ))}
    </div>
  );
}
