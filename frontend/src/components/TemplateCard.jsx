import Icon from './Icons.jsx';

/** One weekday template card (used in both template sections). */
export default function TemplateCard({ template, onEdit, onPreview }) {
  const typeLabel = template.template_type === 'FOLLOW_UP' ? 'FOLLOW-UP' : 'NEW EMAIL';
  const isFollowUp = template.template_type === 'FOLLOW_UP';

  return (
    <div className="card p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800">{template.day_of_week}</h4>
        <span
          className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide ${
            isFollowUp ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'
          }`}
        >
          {typeLabel}
        </span>
      </div>

      <div className="mt-3">
        <p className="label">Subject</p>
        <p className="mt-1 text-sm font-medium text-slate-700 break-words">{template.subject}</p>
      </div>

      <div className="mt-3 flex-1">
        <p className="label">Email body preview</p>
        <p className="mt-1 text-sm text-slate-600 whitespace-pre-line line-clamp-6 leading-relaxed">
          {template.body}
        </p>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="button" className="btn-secondary flex-1" onClick={() => onEdit(template)}>
          <Icon name="edit" className="w-4 h-4" />
          Edit Template
        </button>
        <button type="button" className="btn-secondary flex-1" onClick={() => onPreview(template)}>
          <Icon name="eye" className="w-4 h-4" />
          Preview
        </button>
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Variables: <code className="text-slate-500">{'{{name}}'}</code>,{' '}
        <code className="text-slate-500">{'{{email}}'}</code>
      </p>
    </div>
  );
}
