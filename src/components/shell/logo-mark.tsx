// "The Catch" — design/freebiz-logo-concepts.html's recommended mark: an
// open hook catching a falling disc. Colours are the --brand/--free tokens
// (identical to the concept file's #7C5CFF/#FFD23F, just token-referenced
// instead of hardcoded per CLAUDE-UI.md's no-hex rule).
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M13 21v4a11 11 0 0 0 22 0V13"
        fill="none"
        stroke="var(--brand)"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <circle cx={24} cy={10} r={5} fill="var(--free)" />
    </svg>
  );
}

// The wordmark — lowercase, with the freebie as the dot on the "i" (a
// dotless-ı plus a rendered dot in --free so it can be coloured by CSS
// rather than baked into the glyph).
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: "var(--display)",
        fontWeight: 800,
        fontSize: 21,
        letterSpacing: "-0.045em",
        lineHeight: 1,
      }}>
      freeb
      <span style={{ position: "relative" }}>
        ı
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "-0.3em",
            transform: "translateX(-50%)",
            width: "0.22em",
            height: "0.22em",
            borderRadius: "50%",
            background: "var(--free)",
          }}
        />
      </span>
      z
    </span>
  );
}
