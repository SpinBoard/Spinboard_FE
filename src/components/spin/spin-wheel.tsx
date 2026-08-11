"use client";

import { ReactNode } from "react";
import { SpinOutcomeType } from "@/types";

export interface WheelSegment {
  type: SpinOutcomeType;
  label: string;
  fill: string;
}

// The segments a normal POST /spins roll can land on. discount20 is
// exclusive to the try-again benchmark board (POST /spins/try-again/spend)
// and never appears here — see API_CONTRACT_ADS_REWARD_PLATFORM.md §5.
export const WHEEL_SEGMENTS: WheelSegment[] = [
  { type: "cash", label: "Cash", fill: "hsl(145 100% 39%)" },
  { type: "brand_product", label: "Free Gift", fill: "hsl(260 56% 66%)" },
  { type: "discount30", label: "30% Off", fill: "hsl(186 100% 50%)" },
  { type: "try_again", label: "Try Again", fill: "hsl(215 14% 42%)" },
  { type: "discount50", label: "50% Off", fill: "hsl(339 100% 71%)" },
];

const SIZE = 220;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 4;
const SEGMENT_ANGLE = 360 / WHEEL_SEGMENTS.length;

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function describeSlice(startAngle: number, endAngle: number) {
  const start = polarToCartesian(endAngle, RADIUS);
  const end = polarToCartesian(startAngle, RADIUS);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

interface SpinWheelProps {
  rotation: number;
  // Rendered in the fixed (non-rotating) hub at the wheel's center.
  children?: ReactNode;
}

export function SpinWheel({ rotation, children }: SpinWheelProps) {
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <div
        className="absolute left-1/2 -top-1 z-10 h-5 w-5 -translate-x-1/2 bg-foreground drop-shadow"
        style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
        aria-hidden
      />

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="drop-shadow-lg"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 2.4s cubic-bezier(0.15, 0.85, 0.35, 1)",
        }}
        data-testid="spin-wheel"
      >
        <circle cx={CENTER} cy={CENTER} r={RADIUS} className="fill-card stroke-border" strokeWidth={2} />
        {WHEEL_SEGMENTS.map((segment, i) => {
          const start = i * SEGMENT_ANGLE;
          const end = start + SEGMENT_ANGLE;
          const mid = start + SEGMENT_ANGLE / 2;
          const labelPos = polarToCartesian(mid, RADIUS * 0.62);
          return (
            <g key={segment.type} data-testid={`spin-wheel-segment-${segment.type}`}>
              <path
                d={describeSlice(start, end)}
                fill={segment.fill}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={700}
                fill="#fff"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }}
              >
                {segment.label}
              </text>
            </g>
          );
        })}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS * 0.2}
          className="fill-background stroke-border"
          strokeWidth={2}
        />
      </svg>

      {children && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
