import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import gmailApi from '../services/gmailApi.js';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [today, setToday] = useState(null);
  const [gmail, setGmail] = useState(null);

  useEffect(() => {
    let active = true;
    gmailApi
      .getStatus()
      .then((status) => {
        if (active) setGmail(status);
      })
      .catch(() => {});
    // today's weekday for the header badge (local machine is fine for display;
    // all business logic uses the backend timezone)
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-CA');
    setToday({ weekday, date });

    const refresh = setInterval(() => {
      gmailApi
        .getStatus()
        .then((status) => {
          if (active) setGmail(status);
        })
        .catch(() => {});
    }, 30000);
    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} today={today} gmail={gmail} />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet context={{ gmail, setGmail }} />
        </main>
        <footer className="px-6 py-4 text-[11px] text-slate-400 border-t border-slate-200">
          Gmail Email Follow-up Automation System · Excel → Gmail Search → Follow-up / New Email →
          Logs
        </footer>
      </div>
    </div>
  );
}
