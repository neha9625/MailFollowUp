import Icon from './Icons.jsx';

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-violet-50 text-violet-600',
  orange: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-600',
};

export default function StatCard({ title, value, icon = 'info', tone = 'blue', sub, loading }) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <span className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${TONES[tone] || TONES.blue}`}>
        <Icon name={icon} className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        {loading ? (
          <div className="mt-2 h-6 w-16 rounded bg-slate-200 animate-pulse" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{value}</p>
        )}
        {sub && <p className="mt-0.5 text-xs text-slate-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}
