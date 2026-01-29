import { useMemo, useState, useEffect } from 'react';

function UsageStats({
  pixels = [],
  palette = [],
  colors = [],
  title = '用量统计',
  showHeader = true,
  showFooter = true,
  maxBodyHeight,
  className = '',
  onActiveCodeChange,
}) {
  const [lockedCode, setLockedCode] = useState(null);
  const [hoveredCode, setHoveredCode] = useState(null);

  const activeCode = lockedCode || hoveredCode || null;

  useEffect(() => {
    onActiveCodeChange?.(activeCode);
  }, [activeCode, onActiveCodeChange]);

  const colorMap = useMemo(() => {
    const map = new Map();
    for (const color of colors || []) {
      if (color?.code) {
        map.set(color.code, color);
      }
    }
    return map;
  }, [colors]);

  const stats = useMemo(() => {
    const counts = new Map();
    const total = Array.isArray(pixels) ? pixels.length : 0;
    let emptyCount = 0;
    let unknownCount = 0;

    if (!Array.isArray(pixels) || !Array.isArray(palette) || total === 0) {
      return { items: [], total, emptyCount, unknownCount };
    }

    for (let i = 0; i < total; i += 1) {
      const index = pixels[i];
      if (index === null || index === undefined) {
        emptyCount += 1;
        continue;
      }
      if (index === 0) {
        emptyCount += 1;
        continue;
      }
      const code = palette[index];
      if (code === null || code === undefined || code === '') {
        emptyCount += 1;
        continue;
      }
      counts.set(code, (counts.get(code) || 0) + 1);
    }

    const items = Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => (b.count - a.count) || a.code.localeCompare(b.code));

    return { items, total, emptyCount, unknownCount };
  }, [pixels, palette]);

  const usedCount = Math.max(0, stats.total - stats.emptyCount);
  const bodyStyle = maxBodyHeight ? { maxHeight: maxBodyHeight } : undefined;
  useEffect(() => {
    if (!activeCode) return;
    const stillExists = stats.items.some((item) => item.code === activeCode);
    if (!stillExists) {
      setLockedCode(null);
      setHoveredCode(null);
    }
  }, [activeCode, stats.items]);

  return (
    <div className={`usage-stats ${className}`.trim()}>
      {showHeader && (
        <div className="usage-stats-header">
          <span className="usage-stats-title">{title}</span>
          <span className="usage-stats-total">已用 {usedCount} / {stats.total}</span>
        </div>
      )}
      <div className="usage-stats-body" style={bodyStyle}>
        {stats.items.length === 0 ? (
          <div className="usage-stats-empty">暂无用量</div>
        ) : (
          stats.items.map((item) => {
            const color = colorMap.get(item.code);
            const swatch = color?.hex || '#0f172a';
            const isActive = activeCode === item.code;
            const isDim = activeCode && !isActive;
            return (
              <div
                key={item.code}
                className={`usage-stats-item ${isActive ? 'is-active' : ''} ${isDim ? 'is-dim' : ''}`.trim()}
                onMouseEnter={() => {
                  if (lockedCode) return;
                  setHoveredCode(item.code);
                }}
                onMouseLeave={() => {
                  if (lockedCode) return;
                  setHoveredCode(null);
                }}
                onClick={() => {
                  setLockedCode((prev) => {
                    const next = prev === item.code ? null : item.code;
                    if (next) {
                      setHoveredCode(null);
                    }
                    return next;
                  });
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setLockedCode((prev) => {
                      const next = prev === item.code ? null : item.code;
                      if (next) {
                        setHoveredCode(null);
                      }
                      return next;
                    });
                  }
                }}
              >
                <span className="usage-swatch" style={{ backgroundColor: swatch }} />
                <span className="usage-code">{item.code}</span>
                <span className="usage-count">{item.count}</span>
              </div>
            );
          })
        )}
      </div>
      {showFooter && (
        <div className="usage-stats-footer">
          <span>未涂色: {stats.emptyCount}</span>
          {stats.unknownCount > 0 && <span>未知色号: {stats.unknownCount}</span>}
        </div>
      )}

      <style>{`
        .usage-stats {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          color: var(--color-text);
          font-size: 0.875rem;
        }

        .usage-stats-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .usage-stats-title {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .usage-stats-total {
          font-variant-numeric: tabular-nums;
          color: var(--color-text-secondary);
          font-size: 0.75rem;
        }

        .usage-stats-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 220px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .usage-stats-body::-webkit-scrollbar {
          width: 4px;
        }

        .usage-stats-body::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 999px;
        }

        .usage-stats-item {
          display: grid;
          grid-template-columns: 14px 1fr auto;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.35rem;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          transition: opacity var(--transition-fast), border-color var(--transition-fast), background var(--transition-fast);
        }

        .usage-stats-item:hover {
          border-color: var(--glass-border);
          background: rgba(255, 255, 255, 0.08);
        }

        .usage-stats-item.is-active {
          border-color: var(--color-primary);
          background: rgba(99, 102, 241, 0.12);
        }

        .usage-stats-item.is-dim {
          opacity: 0.35;
        }

        .usage-swatch {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          border: 1px solid rgba(0, 0, 0, 0.15);
        }

        .usage-code {
          font-weight: 600;
          color: var(--color-text);
          font-size: 0.8rem;
        }

        .usage-count {
          font-variant-numeric: tabular-nums;
          font-weight: 500;
          color: var(--color-text-secondary);
          font-size: 0.8rem;
        }

        .usage-stats-empty {
          color: var(--color-text-muted);
          text-align: center;
          padding: 1rem 0;
        }

        .usage-stats-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  );
}

export default UsageStats;
