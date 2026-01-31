import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link, useBeforeUnload } from 'react-router-dom';
import { ArrowLeft, Save, Undo2, Redo2, Pencil, Eraser, PaintBucket, Grid3X3, ZoomIn, ZoomOut, Maximize, RotateCcw, Trash2, Palette, ChevronDown, Upload, Lock, Unlock, Hand, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [showTagDeleteDialog, setShowTagDeleteDialog] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [colors, setColors] = useState([]);
  const [highlightCode, setHighlightCode] = useState(null);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [isHexOpen, setIsHexOpen] = useState(false);
  const [isUsageStatsOpen, setIsUsageStatsOpen] = useState(false);
  const [tagOptions, setTagOptions] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [tagLoading, setTagLoading] = useState(false);
  const [isMobileToolbarCollapsed, setIsMobileToolbarCollapsed] = useState(false);
  const initialFitDone = useRef(false);
  const { toast, showToast, clearToast } = useToast();
  const pendingLeaveAction = useRef(null);

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

  function requestLeave(action) {
    if (!shouldBlockLeave) {
      action();
      return;
    }
    pendingLeaveAction.current = action;
    setShowLeaveDialog(true);
  }

  useEffect(() => {
    loadColors();
    loadTags();
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

  async function loadTags() {
    setTagLoading(true);
    try {
      const result = await api.tags.list();
      setTagOptions(result);
    } catch (err) {
      console.error('Failed to load tags:', err);
      showToast('标签加载失败', { type: 'error' });
    } finally {
      setTagLoading(false);
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

  function normalizeTagName(name) {
    return name.trim().replace(/\s+/g, ' ');
  }

  function addTag(name) {
    const next = normalizeTagName(name);
    if (!next) return;
    if (next.length > 30) {
      showToast('标签长度不能超过 30 个字符', { type: 'warning' });
      return;
    }
    const currentTags = Array.isArray(store.tags) ? store.tags : [];
    if (currentTags.includes(next)) {
      setTagInput('');
      return;
    }
    store.setTags([...currentTags, next]);
    setTagInput('');
    setTagOptions((prev) => {
      if (prev.some((tag) => tag.name === next)) return prev;
      return [...prev, { id: `local-${next}`, name: next, count: 0 }].sort((a, b) =>
        a.name.localeCompare(b.name, 'zh-CN')
      );
    });
  }

  function removeTag(name) {
    const currentTags = Array.isArray(store.tags) ? store.tags : [];
    store.setTags(currentTags.filter((tag) => tag !== name));
  }

  function requestDeleteTag(tag) {
    setTagToDelete(tag);
    setShowTagDeleteDialog(true);
  }

  async function confirmDeleteTag() {
    if (!tagToDelete) return;
    try {
      await api.tags.delete(tagToDelete.id);
      setTagOptions((prev) => prev.filter((item) => item.id !== tagToDelete.id));
      removeTag(tagToDelete.name);
      showToast('标签已删除', { type: 'success' });
    } catch (err) {
      showToast(`删除失败: ${err.message}`, { type: 'error' });
    } finally {
      setShowTagDeleteDialog(false);
      setTagToDelete(null);
    }
  }

  function handleTagInputKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',' || event.key === '，' || event.key === ';' || event.key === '；') {
      event.preventDefault();
      addTag(tagInput);
      return;
    }
    if (event.key === 'Backspace' && !tagInput) {
      const currentTags = Array.isArray(store.tags) ? store.tags : [];
      if (currentTags.length > 0) {
        removeTag(currentTags[currentTags.length - 1]);
      }
    }
  }

  const filteredTagOptions = tagInput.trim()
    ? tagOptions.filter((tag) => {
        const currentTags = Array.isArray(store.tags) ? store.tags : [];
        return (
          !currentTags.includes(tag.name) &&
          tag.name.toLowerCase().includes(tagInput.trim().toLowerCase())
        );
      })
    : tagOptions.filter((tag) => {
        const currentTags = Array.isArray(store.tags) ? store.tags : [];
        return !currentTags.includes(tag.name);
      });

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
          touchPanMode={store.handTool ? 'single' : 'double'}
          showGrid={store.showGrid}
          showCodes={true}
          showCodesMinZoom={0.6}
          highlightCode={highlightCode}
          currentTool={store.currentTool}
          currentColorIndex={store.currentColorIndex}
          readonly={store.handTool}
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
          <Link
            to="/"
            className="btn glass-button btn-icon"
            onClick={(event) => {
              if (!shouldBlockLeave) return;
              event.preventDefault();
              requestLeave(() => navigate('/'));
            }}
          >
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
          <button
            className={`btn glass-button btn-icon tool-btn ${store.currentTool === 'fill' ? 'active' : ''}`}
            onClick={() => store.setTool('fill')}
            title="填充工具 (F)"
          >
            <PaintBucket size={20} />
          </button>
        </div>

        <div className="divider-horizontal"></div>

        <div className="tool-group">
          <button
            className={`btn glass-button btn-icon ${store.lockMode ? 'active' : ''}`}
            onClick={() => store.toggleLockMode()}
            title={store.lockMode ? "锁定模式：只能在空白格子上色" : "普通模式：可以在任意格子上色"}
          >
            {store.lockMode ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
          <button
            className={`btn glass-button btn-icon ${store.handTool ? 'active' : ''}`}
            onClick={() => store.toggleHandTool()}
            title="手指工具 (H) - 单指拖动画布"
          >
            <Hand size={20} />
          </button>
        </div>

        <div className="divider-horizontal"></div>

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
          <button
            className="btn glass-button btn-icon mobile-collapse-btn"
            onClick={() => setIsMobileToolbarCollapsed(!isMobileToolbarCollapsed)}
            title={isMobileToolbarCollapsed ? "展开工具栏" : "折叠工具栏"}
          >
            {isMobileToolbarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      <footer className={`editor-palette glass-panel ${isMobilePaletteOpen ? 'mobile-open' : ''}`}>
        <div className="mobile-palette-handle" onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}>
          <div className="handle-bar"></div>
        </div>
        <div className="palette-section palette-section-tags">
          <button
            type="button"
            className="palette-section-header collapsible-header"
            onClick={() => setIsTagsOpen(!isTagsOpen)}
          >
            <h3>标签</h3>
            <ChevronDown
              size={18}
              style={{
                transform: isTagsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: 'var(--color-text-secondary)',
              }}
            />
          </button>
          <div className="tag-editor" style={{ display: isTagsOpen ? 'flex' : 'none' }}>
            <div className="tag-input-row">
              <input
                type="text"
                className="tag-input glass-input"
                placeholder="输入标签，回车添加"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagInputKeyDown}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
              >
                添加
              </button>
            </div>
            {tagLoading ? (
              <div className="tag-hint">标签加载中...</div>
            ) : filteredTagOptions.length > 0 ? (
              <div className="tag-suggestions">
                {filteredTagOptions.slice(0, 8).map((tag) => (
                  <div className="tag-suggestion-item" key={tag.id ?? tag.name}>
                    <button
                      type="button"
                      className="tag suggestion"
                      onClick={() => addTag(tag.name)}
                    >
                      {tag.name}
                      {Number.isFinite(tag.count) && (
                        <span className="tag-count">{tag.count}</span>
                      )}
                    </button>
                    {Number.isFinite(tag.id) && (
                      <button
                        type="button"
                        className="tag-delete"
                        title="删除标签"
                        onClick={() => requestDeleteTag(tag)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="tag-hint">暂无可用标签</div>
            )}
            {Array.isArray(store.tags) && store.tags.length > 0 ? (
              <div className="tag-list">
                {store.tags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    className="tag tag-removable"
                    onClick={() => removeTag(tag)}
                    title="点击移除"
                  >
                    {tag}
                    <span className="tag-remove">×</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="tag-empty">还没有添加标签</div>
            )}
          </div>
        </div>

        <div className="palette-divider" />

        <div className="palette-section">
          <button
            type="button"
            className="palette-section-header collapsible-header"
            onClick={() => setIsHexOpen(!isHexOpen)}
          >
            <h3>HEX 颜色匹配</h3>
            <ChevronDown
              size={18}
              style={{
                transform: isHexOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
                color: 'var(--color-text-secondary)',
              }}
            />
          </button>
          <div style={{ display: isHexOpen ? 'block' : 'none' }}>
            <HexMatcher 
              colors={colors}
              onSelectColor={handleSelectColor}
            />
          </div>
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
          <button
            type="button"
            className="palette-section-header collapsible-header"
            onClick={() => setIsUsageStatsOpen(!isUsageStatsOpen)}
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
          </button>
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
          const action = pendingLeaveAction.current;
          pendingLeaveAction.current = null;
          action?.();
        }}
        onCancel={() => {
          setShowLeaveDialog(false);
          pendingLeaveAction.current = null;
        }}
      />

      <ConfirmDialog
        open={showTagDeleteDialog}
        title="删除标签？"
        description={
          tagToDelete
            ? `确定要删除标签「${tagToDelete.name}」吗？已关联图纸将解除关联。`
            : '确定要删除该标签吗？已关联图纸将解除关联。'
        }
        confirmText="删除"
        cancelText="取消"
        danger={true}
        loading={false}
        onConfirm={confirmDeleteTag}
        onCancel={() => {
          setShowTagDeleteDialog(false);
          setTagToDelete(null);
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

        .collapsible-header {
          width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
        }

        .collapsible-header:hover h3 {
          color: var(--color-text);
        }

        .palette-section-header h3 {
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .palette-section-tags .tag-editor {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .tag-input-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tag-input.glass-input {
          flex: 1;
          min-width: 0;
          padding: 0.45rem 0.75rem;
          font-size: 0.85rem;
        }

        .tag-suggestions,
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag-suggestion-item {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .tag-hint,
        .tag-empty {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .tag {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: var(--color-primary-hover);
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          font-size: 0.75rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }

        .tag:hover {
          background: rgba(99, 102, 241, 0.16);
          border-color: rgba(99, 102, 241, 0.35);
        }

        .tag-removable {
          cursor: pointer;
        }

        .tag-remove {
          font-size: 0.8rem;
          opacity: 0.6;
        }

        .suggestion {
          cursor: pointer;
        }

        .tag-count {
          font-size: 0.7rem;
          opacity: 0.7;
          background: rgba(0, 0, 0, 0.1);
          padding: 0.05rem 0.35rem;
          border-radius: 999px;
        }

        .tag-delete {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ef4444;
          background: rgba(239, 68, 68, 0.08);
          font-size: 0.9rem;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tag-delete:hover {
          background: rgba(239, 68, 68, 0.16);
          border-color: rgba(239, 68, 68, 0.5);
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

          /* Scrollable toolbar for mobile */
          .editor-toolbar {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none; /* Firefox */
          }

          .editor-toolbar::-webkit-scrollbar {
            display: none; /* Chrome, Safari, Edge */
          }

          .editor-toolbar .tool-group {
            flex-shrink: 0;
          }

          /* Show collapse button hint on small screens */
          .mobile-collapse-btn {
            display: none;
          }

          @media (max-width: 480px) {
            .mobile-collapse-btn {
              display: flex;
            }
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
            height: min(82vh, calc(100vh - 56px));
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
            min-height: 260px;
          }

          .palette-section-tags {
            padding-bottom: 0.5rem;
          }

          .palette-section-tags .tag-editor {
            gap: 0.5rem;
          }

          .palette-section-tags .tag-suggestions,
          .palette-section-tags .tag-list {
            gap: 0.35rem;
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
