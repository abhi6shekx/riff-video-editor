import React from "react";
import { cn } from "@/lib/utils";

interface RiffIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  withDots?: boolean;
}

/**
 * RIFF Mini Icon Mark
 * High-fidelity vector mark matching the RIFF Brand design system.
 */
export function RiffIcon({
  size = 36,
  className,
  withDots = false,
  ...props
}: RiffIconProps) {
  const gradId = React.useId().replace(/:/g, "_");
  const cyanGradId = `cyanGrad_${gradId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none transition-transform duration-200", className)}
      {...props}
    >
      {/* Black rounded squircle background badge */}
      <rect
        width="64"
        height="64"
        rx="16"
        fill="#000000"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* Vertical Cyan Stem */}
      <rect
        x="15"
        y="14"
        width="9"
        height="36"
        rx="4.5"
        fill="#00E5FF"
      />

      {/* Cyan Upper Loop */}
      <path
        d="M20 14H35C42.5 14 48.5 19 48.5 26.5C48.5 34 42.5 39 35 39H20V14Z"
        fill="#00E5FF"
      />

      {/* Inner Cutout (Matching Dark Surface) */}
      <path
        d="M24 21.5H34C37.5 21.5 40 23.5 40 26.5C40 29.5 37.5 31.5 34 31.5H24V21.5Z"
        fill="#000000"
      />

      {/* Bright Mint Green Diagonal Leg */}
      <path
        d="M26.5 32.5L49 50H39.5L20 35H26.5Z"
        fill="#00E699"
      />

      {/* Golden 4-Point Star Accent at top-right curve */}
      <polygon
        points="48,13 49.5,17 53.5,18.5 49.5,20 48,24 46.5,20 42.5,18.5 46.5,17"
        fill="#FFB703"
      />
    </svg>
  );
}

interface RiffNavbarLockupProps {
  size?: number | string;
  className?: string;
  badgeText?: string;
  compactOnMobile?: boolean;
}

/**
 * RIFF Navbar Lockup
 * Matches exact specified layout:
 * - Mini Icon Mark (36x36 SVG)
 * - Brand Title: "RIFF" (Syne Display 900, 24px, letter-spacing 1.5px, #FFFFFF)
 * - Cyan Social Badge: "SOCIAL" (pill badge, 11px 700, #00D2D3, letter-spacing 1.2px)
 */
export function RiffNavbarLockup({
  size = 36,
  className,
  badgeText,
  compactOnMobile = false,
}: RiffNavbarLockupProps) {
  return (
    <div
      className={cn("flex items-center gap-3", className)}
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
    >
      {/* Mini Icon Mark */}
      <RiffIcon size={size} />

      {/* Brand Title */}
      <span
        className="font-display text-white select-none transition-colors"
        style={{
          fontWeight: 900,
          fontSize: "24px",
          letterSpacing: "1.5px",
          color: "#FFFFFF",
          lineHeight: 1,
        }}
      >
        RIFF
      </span>

      {/* Optional Badge (only if explicitly passed) */}
      {badgeText ? (
        <span
          className={cn(
            "inline-flex items-center uppercase select-none transition-all",
            compactOnMobile && "hidden sm:inline-flex"
          )}
          style={{
            background: "rgba(0, 210, 211, 0.12)",
            border: "1.5px solid #00D2D3",
            color: "#00D2D3",
            fontWeight: 700,
            fontSize: "11px",
            letterSpacing: "1.2px",
            padding: "2px 10px",
            borderRadius: "9999px",
            lineHeight: "1.2",
          }}
        >
          {badgeText}
        </span>
      ) : null}
    </div>
  );
}
