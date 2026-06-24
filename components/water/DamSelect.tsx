"use client";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
};

export function DamSelect({
  label,
  value,
  options,
  onChange,
  className = "",
}: Props) {
  return (
    <label
      className={`flex flex-col gap-1 text-xs font-medium text-ink-subtle ${className}`}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[10rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-ink shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-sky-100"
      >
        {options.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
