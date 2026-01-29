import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Maximize2, Grid3X3, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../utils/api.js';
import { decode } from '../utils/rle.js';
import { PixelGrid } from '../components/PixelGrid/index.js';

function PatternViewPage() {
  const { id } = useParams();
  const [pattern, setPattern] = useState(null);
  const [pixels, setPixels] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [colors, setColors] = useState([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const initialFitDone = useRef(false);

  useEffect(() => {
    initialFitDone.current = false;
    loadPattern();
    loadColors();
  }, [id]);

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

  function getColorHex(code) {
    if (!code) return '#000000';
    const color = colors.find(c => c.code === code);
    return color?.hex || '#000000';
  }

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
            showGrid={showGrid}
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

      <footer className={`view-legend glass-panel ${showLegend ? 'expanded' : ''}`}>
        <button
          className="legend-toggle"
          onClick={() => setShowLegend(!showLegend)}
        >
          <span className="legend-title">色号说明</span>
          <span className="legend-icon">{showLegend ? '▼' : '▲'}</span>
        </button>
        {showLegend && (
          <div className="legend-content">
            {pattern.palette.filter(Boolean).map((code) => (
              <div key={code} className="legend-item">
                <span
                  className="legend-swatch"
                  style={{ backgroundColor: getColorHex(code) }}
                />
                <span className="legend-code">{code}</span>
              </div>
            ))}
          </div>
        )}
      </footer>

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

        .zoom-label {
          font-size: 0.875rem;
          min-width: 3.5rem;
          text-align: center;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        /* Legend - Floating Bottom Center Panel */
        .view-legend {
          position: absolute;
          bottom: 1.5rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 20;
          width: auto;
          min-width: 200px;
          max-width: 60%;
          border-radius: var(--radius-lg);
          transition: all var(--transition-normal);
          display: flex;
          flex-direction: column;
        }

        .legend-toggle {
          width: 100%;
          padding: 0.75rem 1.5rem;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: color var(--transition-fast);
        }

        .legend-toggle:hover {
          color: var(--color-text);
        }

        .legend-content {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0 1.5rem 1.5rem;
          justify-content: center;
          max-height: 200px;
          overflow-y: auto;
        }

        /* Custom Scrollbar for Legend */
        .legend-content::-webkit-scrollbar {
          width: 4px;
        }
        
        .legend-content::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
        }

        .legend-item:hover {
          border-color: var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
        }

        .legend-swatch {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .legend-code {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .btn.active {
          background: var(--color-primary);
          color: #000;
          box-shadow: 0 0 15px var(--color-primary-muted);
          border-color: transparent;
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
            padding: 0 1rem;
          }

          .view-title {
            font-size: 1rem;
          }

          .btn-text {
            display: none;
          }

          .view-controls {
            bottom: 5rem; /* Move up to avoid legend overlap if expanded */
            right: 1rem;
            padding: 0.5rem;
          }

          .view-legend {
            bottom: 1rem;
            width: calc(100% - 2rem);
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}

export default PatternViewPage;
