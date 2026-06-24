import type { StatTriple } from "@/lib/history-summary";

type SummaryRow = {
  label: string;
  high: string;
  low: string;
  avg: string;
};

type Props = {
  title: string;
  left: SummaryRow[];
  right: SummaryRow[];
};

export function SummaryTable({ title, left, right }: Props) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 font-display text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <SummaryPanel rows={left} />
        <SummaryPanel rows={right} />
      </div>
    </div>
  );
}

function SummaryPanel({ rows }: { rows: SummaryRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-card">
      <table className="w-full text-sm text-ink">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          <tr>
            <th className="px-3 py-2" />
            <th className="px-3 py-2">High</th>
            <th className="px-3 py-2">Low</th>
            <th className="px-3 py-2">Average</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium">{row.label}</td>
              <td className="px-3 py-2 tabular-nums">{row.high}</td>
              <td className="px-3 py-2 tabular-nums">{row.low}</td>
              <td className="px-3 py-2 tabular-nums">{row.avg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function summaryToRows(
  blocks: { label: string; stat: StatTriple }[]
): SummaryRow[] {
  return blocks.map(({ label, stat }) => ({
    label,
    high: stat.high,
    low: stat.low,
    avg: stat.avg,
  }));
}
