import Modal from './Modal.jsx';
import Icon from './Icons.jsx';

/**
 * Confirmation dialog.
 * `tone="danger"` renders a red confirm button (destructive actions).
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button type="button" className={tone === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading && <Icon name="spinner" className="w-4 h-4 animate-spin" />}
            {loading ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
            tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
          }`}
        >
          <Icon name={tone === 'danger' ? 'warning' : 'info'} className="w-5 h-5" />
        </span>
        <div className="text-sm text-slate-600">
          <p className="whitespace-pre-line">{message}</p>
          {children}
        </div>
      </div>
    </Modal>
  );
}
