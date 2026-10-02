import { useRef } from "react";
import type { PipLayer } from "./PipPanel";

type Props = {
  layer: PipLayer;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
};

export function PipCanvas({
  layer,
  selected,
  onSelect,
  onMove,
  onResize,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const resizing = useRef(false);

  const start = useRef({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  function pointerDown(event: React.PointerEvent) {
    event.stopPropagation();

    onSelect();

    const rect =
      containerRef.current?.parentElement?.getBoundingClientRect();

    if (!rect) return;

    dragging.current = true;

    start.current = {
      x: event.clientX,
      y: event.clientY,
      left: layer.x,
      top: layer.y,
      width: layer.width,
      height: layer.height,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function pointerMove(event: React.PointerEvent) {
    const rect =
      containerRef.current?.parentElement?.getBoundingClientRect();

    if (!rect) return;

    if (dragging.current) {
      const dx =
        ((event.clientX - start.current.x) / rect.width) * 100;

      const dy =
        ((event.clientY - start.current.y) / rect.height) * 100;

      const x = Math.max(0, Math.min(100, start.current.left + dx));
      const y = Math.max(0, Math.min(100, start.current.top + dy));

      onMove(x, y);
    }

    if (resizing.current) {
      const dx =
        ((event.clientX - start.current.x) / rect.width) * 100;

      const newWidth = Math.max(10, Math.min(90, start.current.width + dx));

      const ratio = start.current.height / start.current.width;

      onResize(newWidth, Math.max(10, newWidth * ratio));
    }
  }

  function pointerUp() {
    dragging.current = false;
    resizing.current = false;
  }

  function resizeDown(event: React.PointerEvent) {
    event.stopPropagation();

    onSelect();

    resizing.current = true;

    start.current = {
      x: event.clientX,
      y: event.clientY,
      left: layer.x,
      top: layer.y,
      width: layer.width,
      height: layer.height,
    };

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  return (
    <div
      ref={containerRef}
      className="absolute"
      style={{
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        width: `${layer.width}%`,
        height: `${layer.height}%`,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
        opacity: layer.opacity,
        zIndex: 20,
      }}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
    >
      {layer.type === "video" ? (
        <video
          src={layer.url}
          muted={layer.muted}
          autoPlay
          loop
          playsInline
          onPointerDown={pointerDown}
          className="h-full w-full cursor-move rounded-lg object-cover"
        />
      ) : (
        <img
          src={layer.url}
          alt=""
          draggable={false}
          onPointerDown={pointerDown}
          className="h-full w-full cursor-move rounded-lg object-cover"
        />
      )}

      {selected && (
        <>
          <div className="pointer-events-none absolute inset-0 rounded-lg border-2 border-[#d4ff00]" />

          <button
            onPointerDown={resizeDown}
            className="absolute -bottom-2 -right-2 h-5 w-5 cursor-se-resize rounded-full border-2 border-black bg-[#d4ff00]"
            aria-label="Resize PIP"
          />
        </>
      )}
    </div>
  );
}
