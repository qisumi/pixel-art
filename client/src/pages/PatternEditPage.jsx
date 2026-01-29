import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useBeforeUnload, useBlocker } from 'react-router-dom';
import { ArrowLeft, Save, Undo2, Redo2, Pencil, Eraser, PaintBucket, Grid3X3, ZoomIn, ZoomOut, Maximize, RotateCcw, Trash2, Palette, ChevronDown, Upload } from 'lucide-react';
import api from '../utils/api.js';
import { useEditorStore } from '../stores/editorStore.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { useToast } from '../hooks/useToast.js';
import { PixelGrid } from '../components/PixelGrid/index.js';
import { HexMatcher } from '../components/HexMatcher/index.js';
import { ColorPicker } from '../components/ColorPicker/index.js';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp/index.js';
import { UsageStats } from '../components/UsageStats/index.js';
import { PatternImportExportDialog } from '../components/PatternImportExportDialog/index.js';
import Toast from '../components/Toast/index.js';
import ConfirmDialog from '../components/ConfirmDialog/index.js';

function PatternEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [colors, setColors] = useState([]);
  const [highlightCode, setHighlightCode] = useState(null);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isUsageStatsOpen, setIsUsageStatsOpen] = useState(true);
  const initialFitDone = useRef(false);
  const { toast, showToast, clearToast } = useToast();

  const store = useEditorStore();

  // 启用键盘快捷键
  useKeyboardShortcuts({ onSave: handleSave });
  
  // 移动端默认折叠用量统计
  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsUsageStatsOpen(false);
    }
  }, []);

  const shouldBlockLeave = store.isDirty && !saving && !deleting;
  useBeforeUnload((event) => {
    if (!shouldBlockLeave) return;
    event.preventDefault();
    event.returnValue = '';
  });
  const leaveBlocker = useBlocker(shouldBlockLeave);
  useEffect(() => {
    if (leaveBlocker.state === 'blocked') {
      setShowLeaveDialog(true);
      return;
    }
    setShowLeaveDialog(false);
  }, [leaveBlocker.state]);

  useEffect(() => {
    if (!shouldBlockLeave && leaveBlocker.state === 'blocked') {
      leaveBlocker.reset();
    }
  }, [shouldBlockLeave, leaveBlocker]);

  useEffect(() => {
    loadColors();
    if (id) {
      loadPattern(id);
    } else {
      store.initNew();
    }
    initialFitDone.current = false;
  }, [id]);

  useEffect(() => {
    if (initialFitDone.current) return;
    if (loading) return;
    if (!store.containerSize.width || !store.containerSize.height) return;
    if (!store.width || !store.height) return;
    initialFitDone.current = true;
    const rafId = requestAnimationFrame(() => {
      store.fitToScreen();
      setTimeout(() => store.fitToScreen(), 80);
    });
    return () => cancelAnimationFrame(rafId);
  }, [loading, store.containerSize.width, store.containerSize.height, store.width, store.height, store.patternId]);

  async function loadColors() {
    try {
      const result = await api.colors.list();
      setColors(result);
    } catch (err) {
      console.error('Failed to load colors:', err);
      showToast('颜色数据加载失败', { type: 'error' });
    }
  }

  async function loadPattern(patternId) {
    try {
      const pattern = await api.patterns.get(patternId);
      store.loadPattern(pattern);
    } catch (err) {
      console.error('Failed to load pattern:', err);
      showToast('图纸加载失败', { type: 'error' });
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!store.name.trim()) {
      showToast('请输入图纸名称', { type: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const data = store.getPatternData();
      if (store.patternId) {
        await api.patterns.update(store.patternId, data);
      } else {
        const result = await api.patterns.create(data);
        navigate(`/edit/${result.id}`, { replace: true });
      }
      store.markClean();
      showToast('保存成功', { type: 'success' });
    } catch (err) {
      showToast(`保存失败: ${err.message}`, { type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!store.patternId) return;
    setDeleting(true);
    try {
      await api.patterns.delete(store.patternId);
      store.initNew();
      showToast('删除成功', { type: 'success' });
      navigate('/', { replace: true });
    } catch (err) {
      showToast(`删除失败: ${err.message}`, { type: 'error' });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  const handlePixelClick = useCallback((x, y, isEraser) => {
    if (store.currentTool === 'fill' && !isEraser) {
      store.fill(x, y);
      return;
    }
    const toolOverride = isEraser ? 'eraser' : store.currentTool;
    store.setPixel(x, y, toolOverride);
  }, [store]);

  const handlePixelDrag = useCallback((x, y, isEraser) => {
    if (store.currentTool === 'fill' && !isEraser) return;
    const toolOverride = isEraser ? 'eraser' : store.currentTool;
    store.setPixel(x, y, toolOverride);
  }, [store]);

  const handleDrawStart = useCallback(() => {
    store.startDrawing();
    if (window.innerWidth <= 768) {
      setIsMobilePaletteOpen(false);
    }
  }, [store]);

  const handleDrawEnd = useCallback(() => {
    store.endDrawing();
  }, [store]);

  const handleContainerResize = useCallback((size) => {
    store.setContainerSize(size);
    if (!initialFitDone.current && size.width > 1 && size.height > 1) {
      initialFitDone.current = true;
      setTimeout(() => store.fitToScreen(), 50);
    }
  }, [store]);

  const tools = [
    { id: 'brush', icon: Pencil, label: '画笔' },
    { id: 'eraser', icon: Eraser, label: '橡皮' },
  ];

  const handleSelectColor = useCallback((code) => {
    store.addColorToPalette(code);
  }, [store]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-page">
      <main className="editor-canvas-area">
        <PixelGrid
          width={store.width}
          height={store.height}
          pixels={store.pixels}
          palette={store.palette}
          zoom={store.zoom}
          panOffset={store.panOffset}
          touchPanMode="double"
          showGrid={store.showGrid}
          showCodes={true}
          showCodesMinZoom={0.6}
          highlightCode={highlightCode}
          currentTool={store.currentTool}
          currentColorIndex={store.currentColorIndex}
          onPixelClick={handlePixelClick}
          onPixelDrag={handlePixelDrag}
          onDrawStart={handleDrawStart}
          onDrawEnd={handleDrawEnd}
          onZoom={store.setZoom}
          onPan={store.setPan}
          onContainerResize={handleContainerResize}
        />
      </main>
      
      <header className="editor-header glass-panel">
        <div className="editor-header-left">
          <Link to="/" className="btn glass-button btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div className="divider-vertical"></div>
          <input
            type="text"
            className="name-input glass-input"
            placeholder="未命名图纸"
            value={store.name}
            onChange={(e) => store.setName(e.target.value)}
          />
        </div>
        <div className="editor-header-right">
          <div className="hide-on-mobile">
            <KeyboardShortcutsHelp />
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportExportDialog(true)}
            disabled={saving || deleting}
            title="导入/导出"
          >
            <Upload size={18} />
            <span>导入/导出</span>
          </button>
          {store.patternId && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowDeleteDialog(true)}
              disabled={saving || deleting}
            >
              <Trash2 size={18} />
              <span>删除</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={18} />
            <span>{saving ? '保存中...' : '保存图纸'}</span>
          </button>
        </div>
      </header>

      <aside className="editor-toolbar glass-panel">
        <div className="tool-group">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`btn glass-button btn-icon tool-btn ${store.currentTool === tool.id ? 'active' : ''}`}
              onClick={() => store.setTool(tool.id)}
              title={tool.label}
            >
              <tool.icon size={20} />
            </button>
          ))}
        </div>

        <div className="divider-horizontal"></div>

        <div className="tool-group">
          <button
            className="btn glass-button btn-icon"
            onClick={() => store.undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button
            className="btn glass-button btn-icon"
            onClick={() => store.redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <div className="divider-horizontal"></div>

        <div className="tool-group">
          <button
            className={`btn glass-button btn-icon ${store.showGrid ? 'active' : ''}`}
            onClick={() => store.toggleGrid()}
            title="Toggle Grid"
          >
            <Grid3X3 size={20} />
          </button>
          <button
            className="btn glass-button btn-icon hide-on-mobile"
            onClick={() => store.setZoom(store.zoom + 0.25)}
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            className="btn glass-button btn-icon hide-on-mobile"
            onClick={() => store.setZoom(store.zoom - 0.25)}
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            className="btn glass-button btn-icon"
            onClick={() => store.fitToScreen()}
            title="Fit to Screen"
          >
            <Maximize size={20} />
          </button>
          <button
            className="btn glass-button btn-icon"
            onClick={() => store.centerCanvas()}
            title="Center Canvas"
          >
            <RotateCcw size={20} />
          </button>
        </div>

        <div className="tool-group mobile-only-tool">
          <div className="divider-horizontal"></div>
          <button 
             className={`btn glass-button btn-icon ${isMobilePaletteOpen ? 'active' : ''}`}
             onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
          >
            <Palette size={20} />
          </button>
        </div>
      </aside>

      <footer className={`editor-palette glass-panel ${isMobilePaletteOpen ? 'mobile-open' : ''}`}>
        <div className="mobile-palette-handle" onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}>
          <div className="handle-bar"></div>
        </div>
        <div className="palette-section">
          <div className="palette-section-header">
            <h3>HEX 颜色匹配</h3>
          </div>
          <HexMatcher 
            colors={colors}
            onSelectColor={handleSelectColor}
          />
        </div>

        <div className="palette-divider" />

        <div className="palette-section palette-section-colors">
          <div className="palette-section-header">
            <h3>颜色选择器</h3>
          </div>
          <ColorPicker
            colors={colors}
            selectedColors={store.palette}
            currentColorCode={store.palette[store.currentColorIndex]}
            onSelectColor={handleSelectColor}
          />
        </div>

        <div className="palette-divider" />

        <div className="palette-section palette-section-usage">
          <div 
            className="palette-section-header" 
            onClick={() => setIsUsageStatsOpen(!isUsageStatsOpen)}
            style={{ cursor: 'pointer' }}
          >
            <h3>用量统计</h3>
             <ChevronDown 
              size={18} 
              style={{
                transform: isUsageStatsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: 'var(--color-text-secondary)'
              }} 
            />
          </div>
          <div style={{ display: isUsageStatsOpen ? 'block' : 'none' }}>
            <UsageStats
              pixels={store.pixels}
              palette={store.palette}
              colors={colors}
              showHeader={false}
              maxBodyHeight={200}
              onActiveCodeChange={setHighlightCode}
            />
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={showDeleteDialog}
        title="确认删除图纸？"
        description={store.isDirty ? '未保存的修改将会丢失。此操作不可恢复。' : '此操作不可恢复。'}
        confirmText="删除"
        cancelText="取消"
        danger={true}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />

      <ConfirmDialog
        open={showLeaveDialog}
        title="离开编辑器？"
        description="编辑内容未保存，离开将会丢失。此操作不可恢复。"
        confirmText="离开"
        cancelText="继续编辑"
        danger={true}
        loading={false}
        onConfirm={() => {
          setShowLeaveDialog(false);
          leaveBlocker.proceed();
        }}
        onCancel={() => {
          setShowLeaveDialog(false);
          leaveBlocker.reset();
        }}
      />

      <PatternImportExportDialog
        open={showImportExportDialog}
        store={store}
        showToast={showToast}
        onImported={() => {
          initialFitDone.current = false;
          setTimeout(() => store.fitToScreen(), 50);
        }}
        onClose={() => setShowImportExportDialog(false)}
      />

      <div className="toast-container">
        <Toast toast={toast} onClose={clearToast} />
      </div>

      <style>{`
        .editor-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: var(--color-bg);
          overflow: hidden;
        }

        /* Canvas Area - Background */
        .editor-canvas-area {
          position: absolute;
          inset: 0;
          z-index: 0;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          background-color: var(--color-bg);
          background-image: radial-gradient(var(--color-border-light) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .editor-canvas-area .pixel-grid-container {
          position: absolute;
          inset: 0;
        }

        /* Header - Floating Top Strip */
        .editor-header {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          height: 72px;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          border-radius: var(--radius-lg);
        }

        .editor-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .editor-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: nowrap;
        }

        .divider-vertical {
          width: 1px;
          height: 24px;
          background: var(--glass-border);
        }

        .name-input.glass-input {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.4);
          color: #1f2937;
          font-size: 1.1rem;
          font-weight: 600;
          width: 300px;
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          backdrop-filter: blur(4px);
        }

        .name-input.glass-input:hover {
          background: rgba(255, 255, 255, 0.85);
          border-color: var(--color-primary);
        }

        .name-input.glass-input:focus {
          background: #ffffff;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-muted);
        }

        /* Toolbar - Floating Left Pill */
        .editor-toolbar {
          position: absolute;
          left: 1.5rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 20;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 1.5rem 0.75rem;
          border-radius: var(--radius-xl);
        }

        .tool-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: center;
        }

        .divider-horizontal {
          height: 1px;
          width: 100%;
          background: var(--glass-border);
        }

        .tool-btn.active, .btn-icon.active {
          background: var(--color-primary);
          color: #000;
          border-color: transparent;
        }

        /* Palette - Floating Bottom Panel */
        .editor-palette {
          position: absolute;
          right: 1.5rem;
          bottom: 1.5rem;
          top: calc(1rem + 72px + 1rem);
          z-index: 20;
          width: 360px;
          max-width: calc(100vw - 3rem);
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .palette-section {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          flex-shrink: 0;
        }

        .palette-section-colors {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .palette-section-usage {
          flex: 0 0 auto;
          min-height: 0;
        }

        .palette-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .palette-section-header h3 {
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .palette-divider {
          height: 1px;
          background: var(--glass-border);
        }

        .mobile-only-tool {
          display: none;
        }

        .hide-on-mobile {
          display: block;
        }

        .mobile-palette-handle {
          display: none;
        }

        @media (max-width: 1024px) {
          .name-input.glass-input {
            width: 220px;
          }

          .editor-palette {
            width: 320px;
          }
        }

        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none;
          }

          .mobile-only-tool {
            display: flex;
          }

          .editor-header {
            top: 0;
            left: 0;
            right: 0;
            border-radius: 0;
            border-top: none;
            border-left: none;
            border-right: none;
            height: 56px;
            padding: 0 0.75rem;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }

          .editor-header-left {
            gap: 0.5rem;
          }

          .editor-header-right {
            display: flex;
            gap: 0.5rem;
          }
          
          .editor-header-right button span {
             display: none;
          }
          
          .editor-header-right button {
             padding: 0.5rem;
          }

          .name-input.glass-input {
            width: 120px;
            font-size: 0.95rem;
            padding: 0.35rem 0.5rem;
          }

          /* Bottom Toolbar */
          .editor-toolbar {
            top: auto;
            bottom: 1.5rem;
            left: 50%;
            transform: translateX(-50%);
            width: auto;
            max-width: 95vw;
            flex-direction: row;
            padding: 0.5rem 0.75rem;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 60; /* Higher than palette when palette is closed, but wait... */
          }

          .tool-group {
            flex-direction: row;
            gap: 0.35rem;
          }

          .editor-toolbar .divider-horizontal {
            width: 1px;
            height: 20px;
          }
          
          .tool-btn, .btn-icon {
            width: 38px;
            height: 38px;
          }
          
          .tool-btn svg, .btn-icon svg {
            width: 18px;
            height: 18px;
          }

          /* Slide-up Palette */
          .editor-palette {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            top: auto;
            width: 100%;
            max-width: none;
            height: min(70vh, calc(100vh - 72px - 1rem));
            border-radius: 20px 20px 0 0;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            transform: translateY(100%);
            z-index: 50; 
            background: #fff;
            box-shadow: 0 -4px 30px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
          }

          .editor-palette.mobile-open {
            transform: translateY(0);
            z-index: 100; /* Cover everything when open */
          }

          .mobile-palette-handle {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 24px;
            width: 100%;
            cursor: pointer;
            flex-shrink: 0;
            background: rgba(0,0,0,0.02);
            border-bottom: 1px solid var(--color-border);
          }
          
          .handle-bar {
            width: 40px;
            height: 4px;
            background: var(--color-border-light);
            border-radius: 2px;
          }

          .palette-section {
            padding: 0.75rem 1rem;
          }

          .palette-section-colors {
            overflow: auto;
            flex: 1;
            min-height: 200px;
          }
          
          /* Adjust Toast position so it's not behind toolbar/keyboard */
          .toast-container {
             bottom: 5rem;
             left: 1rem; 
             right: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PatternEditPage;
