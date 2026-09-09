import { useMemo, useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icons.jsx';

const SAMPLE_VARS = { name: 'John', email: 'john@example.com' };

/** Replaces {{name}} / {{email}} with sample data for previews. */
function interpolate(text, vars) {
  return String(text || '').replace(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g, (m, key) => {
    const v = vars[key.toLowerCase()];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Template editor modal: subject + body with variable help and a live preview
 * rendered with sample data (John / john@example.com).
 */
export default function TemplateEditor({ open, template, saving, onSave, onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tab, setTab] = useState('edit');
  const [error, setError] = useState('');

  // Sync local state whenever a different template is opened
  const [currentId, setCurrentId] = useState(null);
  if (open && template && template.id !== currentId) {
    setCurrentId(template.id);
    setSubject(template.subject);
    setBody(template.body);
    setTab('edit');
    setError('');
  }
  if (!open && currentId !== null) setCurrentId(null);

  const typeLabel = template?.template_type === 'FOLLOW_UP' ? 'FOLLOW-UP' : 'NEW EMAIL';
  const isFollowUp = template?.template_type === 'FOLLOW_UP';

  const rendered = useMemo(
    () => ({
      subject: interpolate(subject, SAMPLE_VARS),
      body: interpolate(body, SAMPLE_VARS),
    }),
    [subject, body]
  );

  function insertVariable(name) {
    setBody((prev) => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}{{${name}}}`);
  }

  function handleSave() {
    if (!subject.trim()) return setError('Subject is required.');
    if (!body.trim()) return setError('Email body is required.');
    setError('');
    onSave({ subject: subject.trim(), body: body.trim() });
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Edit Template"
      size="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving && <Icon name="spinner" className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </>
      }
    >
      {/* read-only context */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
            isFollowUp ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'
          }`}
        >
          Template type: {typeLabel}
        </span>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-600">
          Day: {template?.day_of_week}
        </span>
      </div>

      {/* tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4 w-fit">
        {['edit', 'preview'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
              tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'edit' ? 'Edit' : 'Preview (as John)'}
          </button>
        ))}
      </div>

      {tab === 'edit' ? (
        <div className="space-y-4">
          <div>
            <label className="label mb-1" htmlFor="tpl-subject">
              Subject
            </label>
            <input
              id="tpl-subject"
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Monday Follow-up"
              maxLength={500}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label" htmlFor="tpl-body">
                Email body
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Insert:</span>
                {['name', 'email'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-mono hover:bg-blue-100"
                    onClick={() => insertVariable(v)}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id="tpl-body"
              className="input font-mono leading-relaxed"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi {{name}},\n\n…\n\nThank you.`}
              maxLength={20000}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              <code>{'{{name}}'}</code> → Excel name (e.g. “John”) · <code>{'{{email}}'}</code> →
              recipient email. Blank lines become paragraphs when sent.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <Icon name="warning" className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <p className="text-xs text-slate-500">
              To: john@example.com · Subject:{' '}
              <span className="font-semibold text-slate-700">{rendered.subject || '(empty)'}</span>
            </p>
          </div>
          <div className="p-4 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
            {rendered.body || '(empty)'}
          </div>
        </div>
      )}
    </Modal>
  );
}
