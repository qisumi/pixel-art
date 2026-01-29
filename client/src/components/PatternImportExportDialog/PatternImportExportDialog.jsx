import { useEffect, useMemo, useState } from 'react';
import { encode } from '../../utils/rle.js';

function safeInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function PatternImportExportDialog({
  open,
  title = '导入 / 导出',
  store,
  onClose,
  onImported,
  showToast,
}) {
  const exportRle = useMemo(() => encode(store.pixels), [store.pixels]);

  const [tab, setTab] = useState('export');
  const [importText, setImportText] = useState('');
  const [importWidth, setImportWidth] = useState(store.width);
  const [importHeight, setImportHeight] = useState(store.height);

  useEffect(() => {
    if (!open) return;
    setTab('export');
    setImportText('');
    setImportWidth(store.width);
    setImportHeight(store.height);
  }, [open, store.width, store.height]);

  if (!open) return null;

  async function handleCopyExport() {
    try {
      await navigator.clipboard.writeText(exportRle);
      showToast?.('已复制到剪贴板', { type: 'success' });
    } catch (err) {
      console.error('Copy failed:', err);
      showToast?.('复制失败，请手动全选复制', { type: 'warning' });
    }
  }

  function handleImport(useCustomSize) {
    const width = useCustomSize ? safeInt(importWidth, store.width) : store.width;
    const height = useCustomSize ? safeInt(importHeight, store.height) : store.height;

    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      showToast?.('宽高必须是大于 0 的整数', { type: 'warning' });
      return;
    }
    if (width > 128 || height > 128) {
      showToast?.('宽高过大（最大 128）', { type: 'warning' });
      return;
    }

    try {
      store.importFromRle({ rle: importText, width, height });
      showToast?.('导入成功', { type: 'success' });
      onImported?.();
      onClose?.();
    } catch (err) {
      showToast?.(`导入失败: ${err.message}`, { type: 'error' });
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal glass-panel" style={{ width: 'min(760px, 100%)', maxHeight: '85vh', overflow: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-secondary" onClick={onClose}>关闭</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${tab === 'export' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('export')}
            style={{ flex: 1 }}
          >
            导出
          </button>
          <button
            className={`btn ${tab === 'import' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('import')}
            style={{ flex: 1 }}
          >
            导入
          </button>
        </div>

        {tab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="modal-description" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <span>尺寸：{store.width} × {store.height}</span>
              <span>调色板长度：{store.palette.length}</span>
            </div>

            <textarea
              value={exportRle}
              readOnly
              rows={10}
              style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />

            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              <button className="btn btn-secondary" onClick={handleCopyExport}>复制 RLE</button>
              <button className="btn btn-primary" onClick={onClose}>完成</button>
            </div>
          </div>
        )}

        {tab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p className="modal-description">
              粘贴格式：<span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>count*index,count*index,...</span>
            </p>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={10}
              placeholder="例如：3*0,2*1,1*0"
              style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="modal-description">宽</span>
                <input value={importWidth} onChange={(e) => setImportWidth(e.target.value)} inputMode="numeric" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span className="modal-description">高</span>
                <input value={importHeight} onChange={(e) => setImportHeight(e.target.value)} inputMode="numeric" />
              </label>
              <div style={{ flex: 1 }} />
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => handleImport(false)}>
                按当前尺寸导入（{store.width}×{store.height}）
              </button>
              <button className="btn btn-primary" onClick={() => handleImport(true)}>
                按上方宽高导入
              </button>
            </div>

            <p className="modal-description">
              注意：该格式只包含像素索引，不包含调色板色号；导入数据里的最大索引必须小于当前调色板长度（当前为 {store.palette.length}）。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PatternImportExportDialog;
