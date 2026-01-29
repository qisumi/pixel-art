import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Undo2, Redo2, Pencil, Eraser, PaintBucket, Grid3X3, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react';
import api from '../utils/api.js';
import { useEditorStore } from '../stores/editorStore.js';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts.js';
import { PixelGrid } from '../components/PixelGrid/index.js';
import { HexMatcher } from '../components/HexMatcher/index.js';
import { ColorPicker } from '../components/ColorPicker/index.js';
import { KeyboardShortcutsHelp } from '../components/KeyboardShortcutsHelp/index.js';

function PatternEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [colors, setColors] = useState([]);
  const initialFitDone = useRef(false);

  const store = useEditorStore();

  // 启用键盘快捷键
  useKeyboardShortcuts({ onSave: handleSave });

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
    }
  }

  async function loadPattern(patternId) {
    try {
      const pattern = await api.patterns.get(patternId);
      store.loadPattern(pattern);
    } catch (err) {
      console.error('Failed to load pattern:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!store.name.trim()) {
      alert('请输入图纸名称');
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
    } catch (err) {
      alert('保存失败: ' + err.message);
    } finally {
      setSaving(false);
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
    { id: 'fill', icon: PaintBucket, label: '填充' },
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
          showGrid={store.showGrid}
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
            placeholder="Untitled Pattern"
            value={store.name}
            onChange={(e) => store.setName(e.target.value)}
          />
        </div>
        <div className="editor-header-right">
          <KeyboardShortcutsHelp />
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Pattern'}
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
            className="btn glass-button btn-icon"
            onClick={() => store.setZoom(store.zoom + 0.25)}
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <button
            className="btn glass-button btn-icon"
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
      </aside>

      <footer className="editor-palette glass-panel">
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
      </footer>

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

        @media (max-width: 768px) {
          .editor-header {
            top: 0;
            left: 0;
            right: 0;
            border-radius: 0;
            border-top: none;
            border-left: none;
            border-right: none;
            height: 60px;
            padding: 0 1rem;
          }

          .editor-toolbar {
            left: 0.5rem;
            padding: 1rem 0.5rem;
            gap: 1rem;
          }

          .editor-palette {
            bottom: 0.5rem;
            width: calc(100% - 1rem);
            padding: 0.75rem;
          }
          
          .name-input.glass-input {
            width: 150px;
          }
        }
      `}</style>
    </div>
  );
}

export default PatternEditPage;
