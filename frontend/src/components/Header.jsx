import { useLocation } from 'react-router-dom';
import Icon from './Icons.jsx';

const TITLES = {
  '/': 'Dashboard',
  '/excel': 'Excel Management',
  '/gmail': 'Gmail Connection',
  '/templates': 'Email Templates',
  '/logs': 'Email Logs',
};

export default function Header({ onMenuClick, today, gmail }) {
  const { pathname } = useLocation();
  const title = TITLES[pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Icon name="menu" />
        </button>
        <h1 className="text-base md:text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {today && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            <Icon name="calendar" className="w-4 h-4" />
            {today.weekday} · {today.date}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            gmail?.connected
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
          title={gmail?.email || 'Gmail not connected'}
        >
          <span
            className={`w-2 h-2 rounded-full ${gmail?.connected ? 'bg-emerald-500' : 'bg-amber-500'}`}
          />
          <Icon name="gmail" className="w-4 h-4" />
          <span className="hidden sm:inline">
            {gmail?.connected ? gmail.email : 'Gmail not connected'}
          </span>
        </span>
      </div>
    </header>
  );
}
