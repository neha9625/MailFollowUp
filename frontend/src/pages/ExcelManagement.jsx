import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import excelApi from '../services/excelApi.js';
import { getErrorMessage } from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Icon from '../components/Icons.jsx';

const MAX_SIZE_MB = 5;
const ALLOWED = ['.xlsx', '.xls'];

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
      Inactive
    </span>
  );
}

export default function ExcelManagement() {
  const inputRef = useRef(null);
  const [active, setActive] = useState(null); // { file, recordCount }
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([excelApi.getActive(), excelApi.getHistory()])
      .then(([activeData, historyData]) => {
        setActive(activeData);
        setHistory(historyData.files);
      })
      .catch((err) => setUploadError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useState(() => {
    load();
  }, []);

  function pickFile(file) {
    setUploadError('');
    setUploadResult(null);
    if (!file) return;
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED.includes(ext)) {
      setUploadError(`Invalid file type "${ext}". Only .xlsx and .xls are allowed.`);
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`);
      return;
    }
    setPendingFile(file);
  }

  async function doUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError('');
    try {
      const result = await excelApi.upload(pendingFile);
      setUploadResult(result);
      setShowInvalid(false);
      setPendingFile(null);
      load();
    } catch (err) {
      setUploadError(getErrorMessage(err));
      setPendingFile(null);
    } finally {
      setUploading(false);
    }
  }

  const columns = [
    {
      key: 'file_name',
      header: 'File Name',
      render: (row) => (
        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
          <Icon name="file" className="w-4 h-4 text-slate-400" />
          {row.file_name}
        </span>
      ),
    },
    { key: 'total_records', header: 'Total Records', render: (r) => Number(r.total_records).toLocaleString() },
    { key: 'valid_records', header: 'Valid', render: (r) => Number(r.valid_records).toLocaleString() },
    { key: 'invalid_records', header: 'Invalid', render: (r) => Number(r.invalid_records).toLocaleString() },
    {
      key: 'uploaded_at',
      header: 'Upload Date',
      render: (r) => new Date(r.uploaded_at).toLocaleString(),
    },
    { key: 'is_active', header: 'Status', render: (r) => <StatusBadge active={!!r.is_active} /> },
  ];

  const file = active?.file;

  return (
    <div className="space-y-6">
      {/* Current active file */}
      <div className="card p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Icon name="excel" className="w-6 h-6" />
            </span>
            <div>
              <p className="label">Current Active File</p>
              {loading ? (
                <div className="mt-1 h-5 w-48 rounded bg-slate-200 animate-pulse" />
              ) : file ? (
                <>
                  <p className="text-lg font-bold text-slate-800">{file.file_name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      Total records:{' '}
                      <strong className="text-slate-700">
                        {Number(active.recordCount).toLocaleString()}
                      </strong>
                    </span>
                    <span>
                      Uploaded:{' '}
                      <strong className="text-slate-700">
                        {new Date(file.uploaded_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                    </span>
                    <span>
                      Valid: <strong className="text-slate-700">{Number(file.valid_records).toLocaleString()}</strong>
                    </span>
                    <span>
                      Invalid: <strong className="text-slate-700">{Number(file.invalid_records).toLocaleString()}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-slate-400 mt-1">No active file — upload one below.</p>
              )}
            </div>
          </div>

          {file && <StatusBadge active />}

          <div className="flex items-center gap-2">
            <Link to="/" className="btn-secondary">
              <Icon name="zap" className="w-4 h-4" />
              Run Automation
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Icon name="upload" className="w-4 h-4" />
              Upload New Excel
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {/* Upload zone */}
      <div className="card p-5">
        <h2 className="card-title mb-1">Upload New File</h2>
        <p className="text-xs text-slate-400 mb-4">
          Required columns: <code className="text-slate-600">Email</code> and{' '}
          <code className="text-slate-600">Name</code> · .xlsx / .xls · max {MAX_SIZE_MB} MB
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3">
            {uploading ? (
              <Icon name="spinner" className="w-6 h-6 animate-spin" />
            ) : (
              <Icon name="upload" className="w-6 h-6" />
            )}
          </span>
          <p className="text-sm font-medium text-slate-700">
            {pendingFile ? pendingFile.name : 'Drag & drop your Excel file here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {pendingFile ? 'Press “Upload & Replace” to confirm' : 'or click to browse (.xlsx, .xls)'}
          </p>
          {pendingFile && !uploading && (
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={(e) => {
                e.stopPropagation();
                doUpload();
              }}
            >
              Upload & Replace
            </button>
          )}
        </div>

        {uploadError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
            {uploadError}
          </div>
        )}

        {uploadResult && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-semibold flex items-center gap-2">
              <Icon name="check" className="w-4 h-4" />
              File “{uploadResult.file.file_name}” is now the active list
            </p>
            <p className="mt-1 text-emerald-700">
              {Number(uploadResult.summary.validRecords).toLocaleString()} valid ·{' '}
              {Number(uploadResult.summary.invalidRecords).toLocaleString()} invalid ·{' '}
              {uploadResult.summary.duplicates} duplicate
              {uploadResult.summary.duplicates === 1 ? '' : 's'} removed
              {uploadResult.summary.previousFile
                ? ` · replaced “${uploadResult.summary.previousFile.file_name}”`
                : ''}
              . Existing email logs were kept.
            </p>

            {uploadResult.summary.invalidRows.length > 0 && (
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-900 underline"
                  onClick={() => setShowInvalid((v) => !v)}
                >
                  {showInvalid ? 'Hide' : 'Show'} {uploadResult.summary.invalidRows.length} skipped
                  row{uploadResult.summary.invalidRows.length === 1 ? '' : 's'}
                </button>
                {showInvalid && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg bg-white border border-emerald-100">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {uploadResult.summary.invalidRows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-slate-500">{r.rowNumber}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.email || '—'}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.name || '—'}</td>
                            <td className="px-3 py-1.5 text-red-600">{r.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload history */}
      <div className="card">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="card-title">Upload History</h2>
        </div>
        <DataTable
          columns={columns}
          rows={history}
          loading={loading}
          emptyMessage="No files uploaded yet."
        />
      </div>

      {/* Replacement confirmation */}
      <ConfirmModal
        open={Boolean(pendingFile)}
        title="Replace Active Email List?"
        confirmLabel="Upload & Replace"
        tone="danger"
        loading={uploading}
        onCancel={() => setPendingFile(null)}
        onConfirm={doUpload}
        message="Uploading a new file will replace the current active email list. Existing email logs will remain."
      >
        <p className="mt-2 text-xs text-slate-500">
          File: <strong>{pendingFile?.name}</strong>
        </p>
      </ConfirmModal>
    </div>
  );
}
