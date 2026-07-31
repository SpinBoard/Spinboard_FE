"use client";

import { Gift, PlayCircle, Sparkles } from "lucide-react";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

const CENTER = 150;
const RADIUS = 140;
const LABEL_RADIUS = 92;

const SEGMENTS = [
  { label: "₦500 CASH", fill: "url(#seg-a)", text: "#F8F9FF" },
  { label: "20% OFF", fill: "url(#seg-b)", text: "#1A1A2E" },
  { label: "FREE GIFT", fill: "url(#seg-c)", text: "#F8F9FF" },
  { label: "₦1,000 CASH", fill: "url(#seg-d)", text: "#F8F9FF" },
  { label: "50% OFF", fill: "url(#seg-b)", text: "#1A1A2E" },
  { label: "JACKPOT", fill: "url(#seg-e)", text: "#1A1A2E" },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const WHEEL_SLICES = SEGMENTS.map((seg, i) => {
  const startAngle = i * SEGMENT_ANGLE;
  const endAngle = startAngle + SEGMENT_ANGLE;
  const midAngle = startAngle + SEGMENT_ANGLE / 2;
  const path = describeSlice(CENTER, CENTER, RADIUS, startAngle, endAngle);
  const { x, y } = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midAngle);
  const rotation = midAngle <= 180 ? midAngle - 90 : midAngle + 90;
  return { ...seg, path, x, y, rotation };
});

// Hero-only decorative wheel: watch-ad badge + win badge bracket the wheel
// to tell the "watch → spin → win" story at a glance. Slow continuous spin
// rides on the `spin` keyframe Tailwind already emits (animate-spin is used
// elsewhere, e.g. spin-machine.tsx loaders), just with a slower duration.
export function HeroSpinWheel() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[360px] sm:max-w-[420px] mx-auto aspect-square">
      <div className="absolute w-64 h-64 bg-primary opacity-30 rounded-full filter blur-[80px]" />
      <div className="absolute w-52 h-52 bg-secondary opacity-20 rounded-full filter blur-[70px] translate-x-10 -translate-y-6" />

      <div className="absolute -top-3 -left-2 sm:-left-10 z-20 flex items-center gap-2 rounded-full bg-card/90 border border-white/10 pl-2 pr-4 py-2 shadow-xl backdrop-blur-sm animate-bounce [animation-duration:3s]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <PlayCircle className="h-4 w-4" />
        </span>
        <span className="text-xs font-semibold font-sora whitespace-nowrap">Watch an ad</span>
      </div>

      <svg
        className="absolute -top-1 left-14 sm:left-16 w-24 h-20 z-10 hidden sm:block"
        viewBox="0 0 100 80"
        fill="none"
        aria-hidden="true">
        <defs>
          <marker id="hero-wheel-arrowhead" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--secondary))" />
          </marker>
        </defs>
        <path
          d="M8 8 C 40 8, 68 28, 76 56"
          stroke="hsl(var(--secondary))"
          strokeWidth="2"
          strokeDasharray="5 5"
          strokeLinecap="round"
          markerEnd="url(#hero-wheel-arrowhead)"
        />
      </svg>

      <div
        className="absolute -top-1 z-30 h-0 w-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent border-t-accent drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
        aria-hidden="true"
      />

      <div
        className="relative rounded-full p-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] animate-[spin_26s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, #ffffffaa, #6C5CE7, #00D9FF, #FF6B9D, #6C5CE7, #ffffffaa)",
        }}>
        <svg viewBox="0 0 300 300" className="w-full h-full drop-shadow-[0_0_25px_rgba(108,92,231,0.45)]">
          <defs>
            <radialGradient id="seg-a" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#8C7AF0" />
              <stop offset="100%" stopColor="#6C5CE7" />
            </radialGradient>
            <radialGradient id="seg-b" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#5CE8FF" />
              <stop offset="100%" stopColor="#00B8D9" />
            </radialGradient>
            <radialGradient id="seg-c" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#FF8FB8" />
              <stop offset="100%" stopColor="#FF6B9D" />
            </radialGradient>
            <radialGradient id="seg-d" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#4FE99B" />
              <stop offset="100%" stopColor="#00C853" />
            </radialGradient>
            <radialGradient id="seg-e" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#FFE28A" />
              <stop offset="100%" stopColor="#FFC300" />
            </radialGradient>
          </defs>

          {WHEEL_SLICES.map((slice, i) => (
            <g key={i}>
              <path d={slice.path} fill={slice.fill} stroke="#1A1A2E" strokeWidth="2" />
              <text
                x={slice.x}
                y={slice.y}
                fill={slice.text}
                fontSize="13"
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${slice.rotation} ${slice.x} ${slice.y})`}
                style={{ fontFamily: "var(--font-sora), sans-serif" }}>
                {slice.label}
              </text>
            </g>
          ))}

          <ellipse cx="110" cy="90" rx="90" ry="55" fill="white" opacity="0.08" />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-white to-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_-3px_4px_rgba(0,0,0,0.2)] border-4 border-background">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-4 -right-2 sm:-right-8 z-20 flex items-center gap-2 rounded-2xl bg-card/90 border border-white/10 px-3 py-2 shadow-xl backdrop-blur-sm animate-bounce [animation-duration:3.4s] [animation-delay:1s]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
          <Gift className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-[10px] text-white/60 font-medium">You won</p>
          <p className="text-xs font-bold font-sora text-success">₦500 Cash!</p>
        </div>
      </div>
    </div>
  );
}
