import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import api, { getErrorMessage } from '../services/api.js';
import automationApi from '../services/automationApi.js';
import StatCard from '../components/StatCard.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icons.jsx';

function Alert({ tone = 'amber', children }) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      <Icon name="info" className="w-5 h-5 shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

const WORKFLOW_STEPS = [
  { icon: 'excel', title: 'Excel', desc: 'Active lead list' },
  { icon: 'search', title: 'Gmail Search', desc: 'from:(x) OR to:(x)' },
  { icon: 'mailCheck', title: 'Found?', desc: 'Previous mail check' },
  { icon: 'send', title: 'Follow-up / New Email', desc: "Today's template" },
  { icon: 'logs', title: 'Email Logs', desc: 'Permanent history' },
];

function WorkflowVisual() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {WORKFLOW_STEPS.map((step) => (
        <div key={step.title} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white shrink-0">
            <Icon name={step.icon} className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">{step.title}</p>
            <p className="text-xs text-slate-500 truncate">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { setGmail } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [runStage, setRunStage] = useState('idle'); // idle | confirm | running | result
  const [runSummary, setRunSummary] = useState(null);
  const [runError, setRunError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/dashboard')
      .then((res) => {
        setData(res.data.data);
        setGmail(res.data.data.gmail);
        setLoadError('');
      })
      .catch((err) => setLoadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [setGmail]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun() {
    setRunStage('running');
    setRunError('');
    try {
      const summary = await automationApi.run();
      setRunSummary(summary);
      setRunStage('result');
      load(); // refresh stats
    } catch (err) {
      setRunError(getErrorMessage(err));
      setRunStage('result');
    }
  }

  const stats = data?.stats;
  const today = data?.today;
  const isWeekend = today?.isWeekend;
  const gmailReady = data?.gmail?.connected;
  const hasFile = Boolean(data?.activeFile);

  return (
    <div className="space-y-6">
      {/* Gmail / setup alerts */}
      {!loading && !data?.gmail?.configured && (
        <Alert tone="red">
          <strong>Google OAuth is not configured.</strong> Add <code>GOOGLE_CLIENT_ID</code> and{' '}
          <code>GOOGLE_CLIENT_SECRET</code> to the backend <code>.env</code>, then restart the
          server. See README → Google Cloud setup.
        </Alert>
      )}
      {!loading && data?.gmail?.configured && !gmailReady && (
        <Alert tone="amber">
          Gmail is not connected.{' '}
          <Link to="/gmail" className="font-semibold underline">
            Connect Gmail
          </Link>{' '}
          to enable automation.
        </Alert>
      )}
      {!loading && !hasFile && (
        <Alert tone="amber">
          No active Excel file.{' '}
          <Link to="/excel" className="font-semibold underline">
            Upload one on the Excel Management page
          </Link>
          .
        </Alert>
      )}
      {loadError && <Alert tone="red">{loadError}</Alert>}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Active Excel File"
          value={data?.activeFile ? data.activeFile.file_name : 'None'}
          icon="excel"
          tone="blue"
          sub={
            data?.activeFile
              ? `${Number(data.activeFile.recordCount).toLocaleString()} records · uploaded ${new Date(
                  data.activeFile.uploaded_at
                ).toLocaleDateString()}`
              : 'Upload a file to start'
          }
          loading={loading}
        />
        <StatCard
          title="Total Excel Records"
          value={data?.activeFile ? Number(data.activeFile.recordCount).toLocaleString() : 0}
          icon="users"
          tone="slate"
          sub="Valid rows in the active file"
          loading={loading}
        />
        <StatCard
          title="Previous Mails Found"
          value={stats ? Number(stats.mailsFound).toLocaleString() : 0}
          icon="mailCheck"
          tone="purple"
          sub="Addresses with prior Gmail history"
          loading={loading}
        />
        <StatCard
          title="Follow-ups Sent"
          value={stats ? Number(stats.followUpsSent).toLocaleString() : 0}
          icon="send"
          tone="green"
          sub="All-time successful follow-ups"
          loading={loading}
        />
        <StatCard
          title="New Emails Sent"
          value={stats ? Number(stats.newEmailsSent).toLocaleString() : 0}
          icon="mailX"
          tone="blue"
          sub="All-time successful new emails"
          loading={loading}
        />
        <StatCard
          title="Failed Emails"
          value={stats ? Number(stats.failedCount).toLocaleString() : 0}
          icon="warning"
          tone="red"
          sub={`Today sent: ${stats ? Number(stats.sentToday).toLocaleString() : 0}`}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Today's Automation */}
        <div className="card p-5 min-w-0 xl:col-span-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Icon name="zap" className="w-4 h-4 text-blue-600" />
                Today's Automation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {today
                  ? `${today.weekday}, ${today.date} (${today.timezone}) — decided on the backend`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={loading || isWeekend || !gmailReady || !hasFile || runStage === 'running'}
              onClick={() => setRunStage('confirm')}
              title={
                isWeekend
                  ? 'Automation is not configured for weekends.'
                  : !gmailReady
                  ? 'Connect Gmail first'
                  : !hasFile
                  ? 'Upload an Excel file first'
                  : 'Process the active Excel list now'
              }
            >
              <Icon name="zap" className="w-4 h-4" />
              Run Automation
            </button>
          </div>

          {isWeekend ? (
            <div className="mt-4">
              <Alert tone="amber">
                <strong>Today is {today?.weekday}.</strong> Automation is not configured for
                weekends. Only Monday–Friday templates exist, so no emails will be sent today.
              </Alert>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700 flex items-center gap-1.5">
                  <Icon name="mailCheck" className="w-4 h-4" />
                  If Previous Mail Found
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Follow-up →{' '}
                  <span className="font-semibold">
                    {today?.weekday} Follow-up Template
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500 truncate">
                  {data?.templates?.FOLLOW_UP ? data.templates.FOLLOW_UP.subject : 'Template missing!'}
                </p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sky-700 flex items-center gap-1.5">
                  <Icon name="mailX" className="w-4 h-4" />
                  If Previous Mail Not Found
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  New Email →{' '}
                  <span className="font-semibold">{today?.weekday} New Email Template</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 truncate">
                  {data?.templates?.NEW_EMAIL ? data.templates.NEW_EMAIL.subject : 'Template missing!'}
                </p>
              </div>
            </div>
          )}

          <hr className="my-5 border-slate-100" />

          <h3 className="card-title mb-3">Workflow</h3>
          <WorkflowVisual />
        </div>

        {/* Gmail status + recent activity */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="card-title flex items-center gap-2">
              <Icon name="gmail" className="w-4 h-4 text-blue-600" />
              Gmail Connection
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  gmailReady ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {gmailReady ? data.gmail.email : 'Not connected'}
                </p>
                <p className="text-xs text-slate-400">
                  {gmailReady ? 'Read + Send enabled via OAuth 2.0' : 'Connect to enable sending'}
                </p>
              </div>
            </div>
            <Link to="/gmail" className="btn-secondary w-full mt-4">
              Manage Connection
            </Link>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="card-title flex items-center gap-2">
                <Icon name="clock" className="w-4 h-4 text-blue-600" />
                Recent Activity
              </h2>
              <Link to="/logs" className="text-xs font-semibold text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <ul className="mt-3 space-y-3">
              {loading && <li className="text-sm text-slate-400">Loading…</li>}
              {!loading && data?.recentLogs?.length === 0 && (
                <li className="text-sm text-slate-400">No emails processed yet.</li>
              )}
              {data?.recentLogs?.slice(0, 5).map((log) => (
                <li key={log.id} className="flex items-start gap-3">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      log.status === 'SUCCESS'
                        ? 'bg-emerald-500'
                        : log.status === 'FAILED'
                        ? 'bg-red-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 truncate">
                      {log.name} <span className="text-slate-400">({log.email})</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {log.email_type === 'FOLLOW_UP' ? 'Follow-up' : 'New Email'} ·{' '}
                      {log.template_type} ·{' '}
                      <span
                        className={
                          log.status === 'SUCCESS'
                            ? 'text-emerald-600'
                            : log.status === 'FAILED'
                            ? 'text-red-600'
                            : 'text-slate-500'
                        }
                      >
                        {log.status}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Run automation: confirm */}
      <ConfirmModal
        open={runStage === 'confirm'}
        title="Run Automation"
        confirmLabel="Run Now"
        loading={false}
        onCancel={() => setRunStage('idle')}
        onConfirm={handleRun}
        message={`This will process the active Excel list (${
          data?.activeFile ? Number(data.activeFile.recordCount).toLocaleString() : 0
        } records) for today's weekday (${today?.weekday || ''}).\nFound addresses receive a Follow-up; new addresses receive a New Email. Every result is recorded in Email Logs.`}
      />

      {/* Run automation: in progress */}
      <Modal open={runStage === 'running'} title="Running Automation" size="sm">
        <div className="flex flex-col items-center py-6 text-center">
          <Icon name="spinner" className="w-10 h-10 animate-spin text-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Searching Gmail and sending emails…
          </p>
          <p className="mt-1 text-xs text-slate-400">
            This may take a while for large lists. Please keep this page open.
          </p>
        </div>
      </Modal>

      {/* Run automation: result */}
      <Modal
        open={runStage === 'result'}
        onClose={() => setRunStage('idle')}
        title={runError ? 'Automation Could Not Run' : 'Automation Finished'}
        footer={
          <button type="button" className="btn-primary" onClick={() => setRunStage('idle')}>
            Close
          </button>
        }
      >
        {runError ? (
          <Alert tone="red">{runError}</Alert>
        ) : (
          runSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xl font-bold text-slate-800">{runSummary.sent}</p>
                  <p className="text-xs text-slate-500">Sent</p>
                </div>
                <div className="rounded-lg bg-violet-50 p-3">
                  <p className="text-xl font-bold text-violet-700">{runSummary.followUpsSent}</p>
                  <p className="text-xs text-violet-600">Follow-ups</p>
                </div>
                <div className="rounded-lg bg-sky-50 p-3">
                  <p className="text-xl font-bold text-sky-700">{runSummary.newEmailsSent}</p>
                  <p className="text-xs text-sky-600">New Emails</p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xl font-bold text-red-700">{runSummary.failed}</p>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {runSummary.weekday} · {runSummary.date} · file “{runSummary.fileName}” · skipped
                (already processed today): {runSummary.skipped}
              </p>
              {runSummary.results.some((r) => r.status === 'FAILED') && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-bold text-red-700 mb-1">Failures</p>
                  {runSummary.results
                    .filter((r) => r.status === 'FAILED')
                    .map((r, i) => (
                      <p key={i} className="text-xs text-red-600 truncate">
                        {r.email}: {r.error}
                      </p>
                    ))}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Full details are in Email Logs.
              </p>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
