import { useCallback, useEffect, useState } from 'react';
import templateApi from '../services/templateApi.js';
import { getErrorMessage } from '../services/api.js';
import TemplateCard from '../components/TemplateCard.jsx';
import TemplateEditor from '../components/TemplateEditor.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icons.jsx';

const SAMPLE_VARS = { name: 'John', email: 'john@example.com' };

function interpolate(text, vars) {
  return String(text || '').replace(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g, (m, key) => {
    const v = vars[key.toLowerCase()];
    return v === undefined || v === null ? '' : String(v);
  });
}

function SectionHeader({ type, title, subtitle, iconBg, count }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}>
        <Icon name={type === 'FOLLOW_UP' ? 'mailCheck' : 'mailX'} className="w-5 h-5" />
      </span>
      <div>
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <span className="ml-auto text-xs text-slate-400">{count}/5 templates</span>
    </div>
  );
}

export default function Templates() {
  const [grouped, setGrouped] = useState({ FOLLOW_UP: [], NEW_EMAIL: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // template being edited
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(null); // template being previewed

  const load = useCallback(() => {
    setLoading(true);
    templateApi
      .getAll()
      .then(setGrouped)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleSave(payload) {
    if (!editing) return;
    setSaving(true);
    try {
      await templateApi.update(editing.template_type, editing.day_of_week, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <Icon name="warning" className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
          <button type="button" className="ml-auto text-red-400" onClick={() => setError('')}>
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>
      )}

      <p className="text-sm text-slate-500">
        The backend automatically picks the template matching <strong>today's weekday</strong>:
        addresses <em>with</em> previous Gmail communication get the{' '}
        <span className="font-semibold text-violet-700">Follow-up</span> template, addresses{' '}
        <em>without</em> get the <span className="font-semibold text-sky-700">New Email</span>{' '}
        template. Variables: <code>{'{{name}}'}</code> and <code>{'{{email}}'}</code>.
      </p>

      {/* ── FOLLOW-UP TEMPLATES ── */}
      <section className="space-y-4">
        <div className="rounded-xl bg-violet-600 px-5 py-4">
          <SectionHeader
            type="FOLLOW_UP"
            title="FOLLOW-UP EMAIL TEMPLATES"
            subtitle="Sent when a previous email/conversation exists in Gmail"
            iconBg="bg-violet-500 text-white"
            count={grouped.FOLLOW_UP.length}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-5 h-56 animate-pulse" />
              ))
            : grouped.FOLLOW_UP.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={setEditing}
                  onPreview={setPreviewing}
                />
              ))}
        </div>
      </section>

      {/* ── NEW EMAIL TEMPLATES ── */}
      <section className="space-y-4">
        <div className="rounded-xl bg-sky-600 px-5 py-4">
          <SectionHeader
            type="NEW_EMAIL"
            title="NEW EMAIL TEMPLATES"
            subtitle="Sent when no previous email/conversation exists in Gmail"
            iconBg="bg-sky-500 text-white"
            count={grouped.NEW_EMAIL.length}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card p-5 h-56 animate-pulse" />
              ))
            : grouped.NEW_EMAIL.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={setEditing}
                  onPreview={setPreviewing}
                />
              ))}
        </div>
      </section>

      {/* Editor modal */}
      <TemplateEditor
        open={Boolean(editing)}
        template={editing}
        saving={saving}
        onSave={handleSave}
        onClose={() => setEditing(null)}
      />

      {/* Preview modal */}
      <Modal
        open={Boolean(previewing)}
        onClose={() => setPreviewing(null)}
        title="Template Preview"
        size="lg"
        footer={
          <button type="button" className="btn-secondary" onClick={() => setPreviewing(null)}>
            Close
          </button>
        }
      >
        {previewing && (
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-1">
              <p className="text-xs text-slate-500">
                <span className="font-semibold">{previewing.template_type === 'FOLLOW_UP' ? 'FOLLOW-UP' : 'NEW EMAIL'}</span>{' '}
                · {previewing.day_of_week} · rendered with sample data
              </p>
              <p className="text-xs text-slate-500">
                To: john@example.com
              </p>
              <p className="text-sm font-semibold text-slate-700">
                Subject: {interpolate(previewing.subject, SAMPLE_VARS)}
              </p>
            </div>
            <div className="p-4 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
              {interpolate(previewing.body, SAMPLE_VARS)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
