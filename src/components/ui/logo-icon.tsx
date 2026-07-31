interface LogoIconProps {
  className?: string;
}

export const LogoIcon = ({ className = "w-10 h-10" }: LogoIconProps) => (
  <svg viewBox="0 0 40 40" fill="none" className={className}>
    <circle cx="20" cy="20" r="18" fill="#1A1A2E" stroke="#6C5CE7" strokeWidth="2" />
    <path d="M20 20 L20 2 A18 18 0 0 1 38 20 Z" fill="#6C5CE7" />
    <path d="M20 20 L38 20 A18 18 0 0 1 20 38 Z" fill="#00D9FF" />
    <path d="M20 20 L20 38 A18 18 0 0 1 2 20 Z" fill="#6C5CE7" />
    <path d="M20 20 L2 20 A18 18 0 0 1 20 2 Z" fill="#00D9FF" />
    <circle cx="20" cy="20" r="5" fill="#1A1A2E" />
  </svg>
);
