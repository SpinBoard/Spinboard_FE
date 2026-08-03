"use client";

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none ${
        checked ? "bg-secondary" : "bg-white/20"
      } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function NotifRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-1.5 bg-white/5 rounded-lg mt-0.5 flex-shrink-0">
          <Icon className="h-4 w-4 text-white/50" />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium ${disabled ? "text-white/40" : "text-white"}`}>
            {label}
          </p>
          <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
