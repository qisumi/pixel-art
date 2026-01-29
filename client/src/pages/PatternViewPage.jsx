import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Maximize2, Grid3X3, ZoomIn, ZoomOut, ChevronDown } from 'lucide-react';
import api from '../utils/api.js';
import { decode } from '../utils/rle.js';
import { PixelGrid } from '../components/PixelGrid/index.js';
import { UsageStats } from '../components/UsageStats/index.js';

function PatternViewPage() {
  const { id } = useParams();
  const [pattern, setPattern] = useState(null);
  const [pixels, setPixels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isUsageStatsOpen, setIsUsageStatsOpen] = useState(true);
  const [colors, setColors] = useState([]);
  const [highlightCode, setHighlightCode] = useState(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const initialFitDone = useRef(false);

  useEffect(() => {
    initialFitDone.current = false;
    loadPattern();
    loadColors();
  }, [id]);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      setIsUsageStatsOpen(false);
    }
  }, []);

  const fitToScreen = useCallback((size, patternWidth, patternHeight) => {
    const BASE_PIXEL_SIZE = 16;
    const padding = 40;
    const availableWidth = size.width - padding * 2;
    const availableHeight = size.height - padding * 2;
    const gridWidth = patternWidth * BASE_PIXEL_SIZE;
    const gridHeight = patternHeight * BASE_PIXEL_SIZE;
    const scaleX = availableWidth / gridWidth;
    const scaleY = availableHeight / gridHeight;
    const newZoom = Math.min(scaleX, scaleY, 4);
    const finalZoom = Math.max(0.1, newZoom);
    setZoom(finalZoom);
    const finalGridWidth = patternWidth * BASE_PIXEL_SIZE * finalZoom;
    const finalGridHeight = patternHeight * BASE_PIXEL_SIZE * finalZoom;
    const panX = (size.width - finalGridWidth) / 2;
    const panY = (size.height - finalGridHeight) / 2;
    setPanOffset({ x: panX, y: panY });
  }, []);

  useEffect(() => {
    if (initialFitDone.current) return;
    if (!pattern) return;
    if (containerSize.width <= 1 || containerSize.height <= 1) return;
    initialFitDone.current = true;
    const rafId = requestAnimationFrame(() => fitToScreen(containerSize, pattern.width, pattern.height));
    return () => cancelAnimationFrame(rafId);
  }, [pattern, containerSize.width, containerSize.height, fitToScreen]);

  async function loadPattern() {
    try {
      const result = await api.patterns.get(id);
      const rawPalette = Array.isArray(result.palette) ? result.palette : [];
      const hasEmptySlot = rawPalette[0] === null;
      const palette = hasEmptySlot ? rawPalette : [null, ...rawPalette];
      const decoded = decode(result.data, result.width * result.height);
      const normalizedPixels = hasEmptySlot
        ? decoded
        : decoded.map((index) => (index === 0 ? 0 : index + 1));
      setPattern({ ...result, palette });
      setPixels(normalizedPixels);
    } catch (err) {
      console.error('Failed to load pattern:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadColors() {
    try {
      const result = await api.colors.list();
      setColors(result);
    } catch (err) {
      console.error('Failed to load colors:', err);
    }
  }

  const handleContainerResize = useCallback((size) => {
    if (!Number.isFinite(size?.width) || !Number.isFinite(size?.height)) return;
    if (size.width <= 1 || size.height <= 1) return;
    setContainerSize(size);
    if (!initialFitDone.current && size.width > 1 && size.height > 1 && pattern) {
      initialFitDone.current = true;
      setTimeout(() => fitToScreen(size, pattern.width, pattern.height), 50);
    }
  }, [pattern, fitToScreen]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <h3>图纸不存在</h3>
            <Link to="/" className="btn btn-primary">返回首页</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-page">
      <main className="view-canvas-area">
        {pixels && (
          <PixelGrid
            width={pattern.width}
            height={pattern.height}
            pixels={pixels}
            palette={pattern.palette}
            zoom={zoom}
            panOffset={panOffset}
            touchPanMode="single"
            showGrid={showGrid}
            showCodes={true}
            showCodesMinZoom={0.6}
            highlightCode={highlightCode}
            readonly={true}
            onZoom={setZoom}
            onPan={setPanOffset}
            onContainerResize={handleContainerResize}
          />
        )}
      </main>

      <header className="view-header glass-panel">
        <div className="view-header-left">
          <Link to="/" className="btn glass-button btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div className="divider-vertical"></div>
          <h1 className="view-title">{pattern.name}</h1>
        </div>
        <div className="view-header-right">
          <Link to={`/edit/${id}`} className="btn glass-button">
            <Edit size={18} />
            <span className="btn-text">编辑</span>
          </Link>
          <button className="btn glass-button btn-icon" title="全屏">
            <Maximize2 size={20} />
          </button>
        </div>
      </header>

      <div className="view-controls glass-panel">
        <button
          className={`btn glass-button btn-icon ${showGrid ? 'active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="网格线"
        >
          <Grid3X3 size={20} />
        </button>
        <div className="divider-vertical"></div>
        <button
          className="btn glass-button btn-icon"
          onClick={() => setZoom(z => Math.max(0.1, z - 0.25))}
        >
          <ZoomOut size={20} />
        </button>
        <span className="zoom-label">{Math.round(zoom * 100)}%</span>
        <button
          className="btn glass-button btn-icon"
          onClick={() => setZoom(z => Math.min(8, z + 0.25))}
        >
          <ZoomIn size={20} />
        </button>
      </div>

      <aside className={`view-usage glass-panel ${isUsageStatsOpen ? 'mobile-open' : ''}`}>
        <div
          className="view-usage-header"
          onClick={() => setIsUsageStatsOpen(!isUsageStatsOpen)}
        >
          <div className="view-usage-handle" />
          <span>用量统计</span>
          <ChevronDown
            size={18}
            style={{
              transform: isUsageStatsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: 'var(--color-text-secondary)',
            }}
          />
        </div>
        <div className="view-usage-body" style={{ display: isUsageStatsOpen ? 'block' : 'none' }}>
          <UsageStats
            pixels={pixels || []}
            palette={pattern.palette}
            colors={colors}
            showHeader={false}
            title="用量统计"
            maxBodyHeight={180}
            onActiveCodeChange={setHighlightCode}
          />
        </div>
      </aside>

      <style>{`
        .view-page {
          position: relative;
          width: 100vw;
          height: 100vh;
          background: var(--color-bg);
          overflow: hidden;
        }

        /* Canvas Area - Background */
        .view-canvas-area {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-color: var(--color-bg);
          background-image: radial-gradient(var(--color-border-light) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        /* Header - Floating Top Strip */
        .view-header {
          position: absolute;
          top: 1rem;
          left: 1rem;
          right: 1rem;
          height: 72px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.5rem;
          border-radius: var(--radius-lg);
        }

        .view-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .view-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .view-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .divider-vertical {
          width: 1px;
          height: 24px;
          background: var(--glass-border);
        }

        .btn-text {
          margin-left: 0.5rem;
        }

        /* Controls - Floating Bottom Right Pill */
        .view-controls {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 20;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-radius: var(--radius-lg);
        }

        /* Usage Stats - Floating Bottom Left Panel */
        .view-usage {
          position: absolute;
          bottom: 1.5rem;
          left: 1.5rem;
          z-index: 20;
          width: 240px;
          max-width: calc(100vw - 3rem);
          border-radius: var(--radius-lg);
          padding: 0.75rem 1rem;
          overflow: hidden;
        }

        .view-usage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          cursor: pointer;
          margin-bottom: 0.5rem;
          gap: 0.5rem;
        }

        .view-usage-handle {
          display: none;
        }

        .view-usage-body {
          display: block;
        }

        .zoom-label {
          font-size: 0.875rem;
          min-width: 3.5rem;
          text-align: center;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        .btn.active {
          background: var(--color-primary);
          color: #000;
          box-shadow: 0 0 15px var(--color-primary-muted);
          border-color: transparent;
        }

        @media (max-width: 1024px) {
          .view-title {
            font-size: 1.1rem;
          }
        }

        @media (max-width: 768px) {
          .view-header {
            top: 0;
            left: 0;
            right: 0;
            border-radius: 0;
            border-top: none;
            border-left: none;
            border-right: none;
            height: 60px;
            padding: 0 0.75rem;
            gap: 0.5rem;
          }

          .view-title {
            font-size: 1rem;
          }

          .btn-text {
            display: none;
          }

          .view-controls {
            top: calc(60px + 0.75rem);
            right: 0.75rem;
            bottom: auto;
            padding: 0.5rem;
          }

          .view-usage {
            position: fixed;
            left: 0.75rem;
            right: 0.75rem;
            bottom: 0.75rem;
            top: auto;
            width: auto;
            max-height: 50vh;
            border-radius: 16px 16px 12px 12px;
            padding: 0.5rem 0.75rem 0.75rem;
            transform: translateY(calc(100% - 44px));
            transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -6px 24px rgba(0,0,0,0.18);
          }

          .view-usage.mobile-open {
            transform: translateY(0);
          }

          .view-usage-header {
            margin-bottom: 0.35rem;
          }

          .view-usage-handle {
            display: block;
            width: 36px;
            height: 4px;
            border-radius: 999px;
            background: var(--color-border-light);
          }

          .view-usage-body {
            max-height: 36vh;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}

export default PatternViewPage;
