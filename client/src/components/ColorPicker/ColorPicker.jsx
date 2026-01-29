import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Palette } from 'lucide-react';

function ColorPicker({ 
  colors = [], 
  selectedColors = [], 
  currentColorCode = null,
  onSelectColor,
  onRemoveColor 
}) {
  const [expandedGroups, setExpandedGroups] = useState(new Set(['H', 'A', 'B']));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'palette'

  const colorGroups = colors.reduce((acc, color) => {
    if (!acc[color.group]) acc[color.group] = [];
    acc[color.group].push(color);
    return acc;
  }, {});

  const toggleGroup = (group) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const filteredGroups = Object.entries(colorGroups).reduce((acc, [group, groupColors]) => {
    if (!searchQuery) {
      acc[group] = groupColors;
      return acc;
    }
    
    const filtered = groupColors.filter(color => 
      color.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      color.hex.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {});

  const isColorInPalette = (code) => {
    return selectedColors.includes(code);
  };

  const handleColorClick = (code) => {
    onSelectColor?.(code);
  };

  return (
    <div className="color-picker">
      <div className="color-picker-tabs">
        <button 
          className={`color-picker-tab ${activeTab === 'palette' ? 'active' : ''}`}
          onClick={() => setActiveTab('palette')}
        >
          <Palette size={16} />
          当前调色板 ({selectedColors.filter(c => c !== null).length})
        </button>
        <button 
          className={`color-picker-tab ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          <Search size={16} />
          浏览所有颜色
        </button>
      </div>

      {activeTab === 'palette' && (
        <div className="palette-colors-list">
          {selectedColors.filter(code => code !== null).length === 0 ? (
            <div className="empty-palette">
              <Palette size={32} />
              <p>调色板是空的</p>
              <span>点击"浏览所有颜色"添加颜色</span>
            </div>
          ) : (
            <div className="palette-grid">
              {selectedColors.map((code, index) => {
                if (code === null) return null;
                const color = colors.find(c => c.code === code);
                if (!color) return null;
                
                return (
                  <div
                    key={`${code}-${index}`}
                    className={`palette-color-item ${currentColorCode === code ? 'active' : ''}`}
                    onClick={() => handleColorClick(code)}
                  >
                    <span 
                      className="palette-color-swatch"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="palette-color-info">
                      <span className="palette-color-code">{color.code}</span>
                      <span className="palette-color-hex">{color.hex}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'browse' && (
        <>
          <div className="color-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索颜色代码或 HEX..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="color-groups-list">
            {Object.keys(filteredGroups).length === 0 ? (
              <div className="no-results">
                <Search size={32} />
                <p>未找到匹配的颜色</p>
              </div>
            ) : (
              Object.entries(filteredGroups).map(([group, groupColors]) => (
                <div key={group} className="color-group">
                  <button 
                    className="color-group-header"
                    onClick={() => toggleGroup(group)}
                  >
                    {expandedGroups.has(group) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                    <span className="color-group-name">
                      Group {group}
                    </span>
                    <span className="color-group-count">
                      {groupColors.length} 色
                    </span>
                  </button>
                  
                  {expandedGroups.has(group) && (
                    <div className="color-group-colors">
                      {groupColors.map(color => (
                        <button
                          key={color.code}
                          className={`color-item ${isColorInPalette(color.code) ? 'in-palette' : ''} ${currentColorCode === color.code ? 'active' : ''}`}
                          onClick={() => handleColorClick(color.code)}
                          title={`${color.code} ${color.hex}`}
                        >
                          <span 
                            className="color-swatch"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="color-code">{color.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      <style>{`
        .color-picker {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }

        .color-picker-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .color-picker-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          color: var(--color-text-muted);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .color-picker-tab:hover {
          background: rgba(255, 255, 255, 0.5);
          color: var(--color-text);
        }

        .color-picker-tab.active {
          background: white;
          border-color: var(--color-primary);
          color: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .color-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          background: rgba(255, 255, 255, 0.5);
        }

        .color-search svg {
          color: var(--color-text-muted);
          flex-shrink: 0;
        }

        .color-search input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.875rem;
          color: var(--color-text);
        }

        .color-search input::placeholder {
          color: var(--color-text-muted);
        }

        .color-groups-list, .palette-colors-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .color-groups-list::-webkit-scrollbar,
        .palette-colors-list::-webkit-scrollbar {
          width: 6px;
        }

        .color-groups-list::-webkit-scrollbar-thumb,
        .palette-colors-list::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .color-group {
          margin-bottom: 0.5rem;
        }

        .color-group-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .color-group-header:hover {
          background: rgba(255, 255, 255, 0.8);
          border-color: var(--color-primary);
        }

        .color-group-name {
          flex: 1;
          text-align: left;
          font-weight: 600;
          color: var(--color-text);
          font-size: 0.875rem;
        }

        .color-group-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 500;
        }

        .color-group-colors {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.01);
          border-radius: var(--radius-sm);
          margin-top: 0.25rem;
        }

        .color-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem;
          background: white;
          border: 2px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .color-item:hover {
          border-color: var(--color-primary);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
          transform: translateY(-2px);
        }

        .color-item.in-palette {
          border-color: var(--color-success);
          background: rgba(16, 185, 129, 0.05);
        }

        .color-item.active {
          border-color: var(--color-primary);
          background: var(--color-primary-muted);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .color-swatch {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 6px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .color-code {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .palette-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 0.75rem;
        }

        .palette-color-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border: 2px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .palette-color-item:hover {
          border-color: var(--color-primary);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
          transform: translateY(-2px);
        }

        .palette-color-item.active {
          border-color: var(--color-primary);
          background: var(--color-primary-muted);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .palette-color-swatch {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .palette-color-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }

        .palette-color-code {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .palette-color-hex {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .empty-palette, .no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: var(--color-text-muted);
          text-align: center;
          gap: 0.5rem;
        }

        .empty-palette svg, .no-results svg {
          opacity: 0.3;
        }

        .empty-palette p, .no-results p {
          font-weight: 600;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .empty-palette span {
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

export default ColorPicker;
