type Props = {
  online: boolean;
};

export function StatusBadge({ online }: Props) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-ink-muted shadow-sm"
      role="status"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          online ? "bg-emerald-500" : "bg-slate-400"
        }`}
        aria-hidden
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
