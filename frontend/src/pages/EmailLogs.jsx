import { useCallback, useEffect, useState } from 'react';
import logApi from '../services/logApi.js';
import { getErrorMessage } from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icons.jsx';

const STATUS_STYLES = {
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  SKIPPED: 'bg-slate-100 text-slate-500',
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'
      }`}
    >
      {status}
    </span>
  );
}

const EMPTY_FILTERS = { search: '', status: '', emailType: '', dateFrom: '', dateTo: '' };

export default function EmailLogs() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState({ logs: [], total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, pageSize: 20 };
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.emailType) params.emailType = filters.emailType;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;

    logApi
      .list(params)
      .then(setData)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, page]);

  useEffect(fetchLogs, [fetchLogs]);

  function openDetail(log) {
    setDetail(log);
    setDetailLoading(true);
    logApi
      .getById(log.id)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }

  function updateFilter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  // ---------- COLUMNS (updated with widths + proper wrapping) ----------
  const columns = [
    {
      key: 'created_at',
      header: 'Date',
      width: '120px',
      wrap: false,
      render: (r) => {
        const d = new Date(r.created_at);
        return (
          <div className="leading-tight">
            <div className="text-slate-700">{d.toLocaleDateString()}</div>
            <div className="text-xs text-slate-400">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Name',
      width: '90px',
      wrap: false,
      render: (r) => r.name || '—',
    },
    {
      key: 'email',
      header: 'Email',
      width: '220px',
      className: 'break-all whitespace-normal',
      render: (r) => (
        <span className="text-xs text-slate-600">{r.email}</span>
      ),
    },
    {
      key: 'sent_from_email',
      header: 'Sent From',
      width: '220px',
      className: 'break-all whitespace-normal',
      render: (r) => <span className="text-xs text-slate-600">{r.sent_from_email || '—'}</span>,
    },
    {
      key: 'mail_found',
      header: 'Prev Mail',
      width: '95px',
      wrap: false,
      render: (r) =>
        r.mail_found === null || r.mail_found === undefined ? (
          '—'
        ) : r.mail_found === 1 || r.mail_found === true ? (
          <span className="text-violet-700 font-semibold">Yes</span>
        ) : (
          <span className="text-sky-700 font-semibold">No</span>
        ),
    },
    {
      key: 'email_type',
      header: 'Email Type',
      width: '110px',
      wrap: false,
      render: (r) =>
        r.email_type === 'FOLLOW_UP' ? (
          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700">
            Follow-up
          </span>
        ) : (
          <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700">
            New Email
          </span>
        ),
    },
    {
      key: 'template_type',
      header: 'Template',
      width: '100px',
      wrap: false,
      render: (r) => r.template_type || '—',
    },
    {
      key: 'subject',
      header: 'Subject',
      // no width => takes remaining space
      render: (r) => (
        <span
          className="text-slate-700"
          title={r.subject || ''}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {r.subject || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      wrap: false,
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: 'error_message',
      header: 'Error',
      width: '140px',
      render: (r) =>
        r.error_message ? (
          <span
            className="block text-xs text-red-600"
            title={r.error_message}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {r.error_message}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'sent_at',
      header: 'Sent At',
      width: '110px',
      wrap: false,
      render: (r) => {
        if (!r.sent_at) return <span className="text-slate-400">—</span>;
        const d = new Date(r.sent_at);
        return (
          <div className="leading-tight">
            <div className="text-slate-700">{d.toLocaleDateString()}</div>
            <div className="text-xs text-slate-400">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
  ];

  const activeFilters =
    Boolean(filters.search) || filters.status || filters.emailType || filters.dateFrom || filters.dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3 text-slate-500">
          <Icon name="filter" className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide">Filters</span>
          {activeFilters && (
            <button
              type="button"
              className="ml-auto text-xs font-semibold text-blue-600 hover:underline"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setSearchInput('');
                setPage(1);
              }}
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Icon name="search" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Search email or name"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <select className="input" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
          <select className="input" value={filters.emailType} onChange={(e) => updateFilter('emailType', e.target.value)}>
            <option value="">All email types</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="NEW_EMAIL">New Email</option>
          </select>
          <input
            type="date"
            className="input"
            title="From date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
          />
          <input
            type="date"
            className="input"
            title="To date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Logs table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="card-title">Email Logs</h2>
          <button type="button" className="btn-ghost px-2 py-1" onClick={fetchLogs} title="Refresh">
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={data.logs}
          loading={loading}
          emptyMessage="No email logs match these filters."
          onRowClick={openDetail}
          pagination={{ page, total: data.total, totalPages: data.totalPages }}
          onPageChange={setPage}
        />
      </div>

      {/* Detail modal */}
      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detailLoading ? 'Email Log — loading…' : `Email Log #${detail?.id ?? ''}`}
        size="lg"
        footer={
          <button type="button" className="btn-secondary" onClick={() => setDetail(null)}>
            Close
          </button>
        }
      >
        {detail && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Name', detail.name || '—'],
              ['Email', detail.email],
              ['Sent From', detail.sent_from_email || '—'],
              ['Previous Mail', detail.mail_found === null ? '—' : detail.mail_found ? 'Yes' : 'No'],
              ['Email Type', detail.email_type === 'FOLLOW_UP' ? 'Follow-up' : 'New Email'],
              ['Template (weekday)', detail.template_type],
              ['Subject', detail.subject || '—'],
              ['Status', <StatusBadge status={detail.status} />],
              ['Sent At', detail.sent_at ? new Date(detail.sent_at).toLocaleString() : '—'],
              ['Created At', new Date(detail.created_at).toLocaleString()],
              ['Gmail Message ID', detail.gmail_message_id || '—'],
              ['Gmail Thread ID', detail.gmail_thread_id || '—'],
              ['Process Date', detail.process_date || '—'],
            ].map(([label, value], i) => (
              <div key={i}>
                <dt className="label">{label}</dt>
                <dd className="mt-0.5 text-slate-700 break-words">{value}</dd>
              </div>
            ))}
            {detail.error_message && (
              <div className="sm:col-span-2">
                <dt className="label">Error</dt>
                <dd className="mt-0.5 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-red-700 text-xs break-words">
                  {detail.error_message}
                </dd>
              </div>
            )}
          </dl>
        )}
      </Modal>
    </div>
  );
}