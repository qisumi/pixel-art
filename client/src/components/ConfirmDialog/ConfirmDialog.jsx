function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal glass-panel">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
        </div>
        {description && <p className="modal-description">{description}</p>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
