function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className={`toast ${toast.type}`}>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" onClick={onClose} aria-label="关闭提示">
        ×
      </button>
    </div>
  );
}

export default Toast;
