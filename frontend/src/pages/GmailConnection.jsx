import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import gmailApi, { gmailConnectRedirect } from '../services/gmailApi.js';
import { getErrorMessage } from '../services/api.js';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Icon, { GoogleG } from '../components/Icons.jsx';

export default function GmailConnection() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { tone, text }
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Result of the OAuth redirect back from /api/gmail/callback
    const oauthStatus = searchParams.get('status');
    if (oauthStatus === 'connected') {
      setNotice({ tone: 'green', text: `Gmail connected successfully${searchParams.get('email') ? ` as ${searchParams.get('email')}` : ''}.` });
    } else if (oauthStatus === 'error') {
      setNotice({ tone: 'red', text: searchParams.get('message') || 'Gmail connection failed.' });
    }
    if (oauthStatus) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function load() {
    setLoading(true);
    gmailApi
      .getStatus()
      .then(setStatus)
      .catch((err) => setNotice({ tone: 'red', text: getErrorMessage(err) }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await gmailApi.disconnect();
      setNotice({ tone: 'green', text: 'Gmail disconnected. Stored tokens were revoked and cleared.' });
      load();
    } catch (err) {
      setNotice({ tone: 'red', text: getErrorMessage(err) });
    } finally {
      setDisconnecting(false);
      setConfirmOpen(false);
    }
  }

  const connected = status?.connected;
  const configured = status?.configured;

  const checks = [
    {
      icon: 'shield',
      title: 'Google OAuth 2.0',
      desc: 'No password is ever requested or stored. Access is granted via Google consent.',
      ok: configured,
    },
    {
      icon: 'search',
      title: 'Read Gmail',
      desc: 'Scope gmail.readonly — searches for previous communication with each address.',
      ok: connected,
    },
    {
      icon: 'send',
      title: 'Send Gmail',
      desc: 'Scope gmail.send — sends follow-ups and new emails from your account.',
      ok: connected,
    },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      {notice && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === 'green'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <Icon name={notice.tone === 'green' ? 'check' : 'warning'} className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{notice.text}</span>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => setNotice(null)}>
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              <GoogleG className="w-6 h-6" />
            </span>
            <div>
              <p className="label">Gmail Account</p>
              <p className="text-lg font-bold text-slate-800 break-all">
                {loading ? '…' : connected ? status.email : 'Not connected'}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {status?.connectedAt ? `Connected ${new Date(status.connectedAt).toLocaleString()}` : 'Connect your Gmail account to enable automation'}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
              connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          {!connected && (
            <button type="button" className="btn-primary" onClick={gmailConnectRedirect} disabled={loading}>
              <GoogleG className="w-4 h-4" />
              Connect Gmail
            </button>
          )}
          {connected && (
            <button type="button" className="btn-danger" onClick={() => setConfirmOpen(true)} disabled={loading}>
              <Icon name="unlink" className="w-4 h-4" />
              Disconnect Gmail
            </button>
          )}
        </div>

        {connected && status.lastError && (
          <p className="mt-3 text-xs text-red-600 flex items-center gap-1.5">
            <Icon name="warning" className="w-4 h-4" />
            {status.lastError}
          </p>
        )}
        {!configured && (
          <p className="mt-3 text-xs text-amber-700 flex items-start gap-1.5">
            <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
            Backend OAuth credentials are missing. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in
            backend/.env (see README) and restart the server.
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="card-title mb-4">Connection Details</h2>
        <ul className="space-y-4">
          {checks.map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                  c.ok ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon name={c.ok ? 'check' : c.icon} className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-700">{c.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-[11px] text-slate-400 border-t border-slate-100 pt-4">
          Tokens are stored encrypted (AES-256-GCM) in the database and refreshed automatically.
          Only your backend knows the Google client secret — it is never exposed to this React app.
        </p>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Disconnect Gmail"
        tone="danger"
        confirmLabel="Disconnect"
        loading={disconnecting}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleDisconnect}
        message={'This revokes the stored token and disconnects your Gmail account.\nAutomation cannot run until you reconnect. Existing logs and Excel data are kept.'}
      />
    </div>
  );
}
