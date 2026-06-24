export function LoadingSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading weather data">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200/80" />
      <div className="h-[180px] animate-pulse rounded-2xl bg-gradient-to-br from-sky-100 via-slate-100 to-cyan-50" />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-56 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-50"
          />
        ))}
      </div>
    </div>
  );
}
