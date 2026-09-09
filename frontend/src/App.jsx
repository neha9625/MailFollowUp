import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExcelManagement from './pages/ExcelManagement.jsx';
import GmailConnection from './pages/GmailConnection.jsx';
import Templates from './pages/Templates.jsx';
import EmailLogs from './pages/EmailLogs.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/excel" element={<ExcelManagement />} />
          <Route path="/gmail" element={<GmailConnection />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/logs" element={<EmailLogs />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
