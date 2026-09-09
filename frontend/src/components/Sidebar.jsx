import { NavLink } from 'react-router-dom';
import Icon from './Icons.jsx';

/* Sidebar holds ONLY these five items — no Outlook, no Email Processing. */
const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/excel', label: 'Excel Management', icon: 'excel' },
  { to: '/gmail', label: 'Gmail Connection', icon: 'gmail' },
  { to: '/templates', label: 'Email Templates', icon: 'templates' },
  { to: '/logs', label: 'Email Logs', icon: 'logs' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
            <Icon name="gmail" className="w-5 h-5" />
          </span>
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm">Gmail Follow-up</p>
            <p className="text-[11px] text-slate-400">Automation System</p>
          </div>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon name={item.icon} className="w-5 h-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-5 py-4 border-t border-slate-800">
          <p className="flex items-center gap-2 text-[11px] text-slate-500">
            <Icon name="shield" className="w-4 h-4" />
            Gmail only · OAuth 2.0 secured
          </p>
        </div>
      </aside>
    </>
  );
}
