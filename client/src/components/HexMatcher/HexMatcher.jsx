import { useState } from 'react';
import { Search, X, Check, AlertCircle } from 'lucide-react';
import api from '../../utils/api.js';

function HexMatcher({ onSelectColor, colors = [] }) {
  const [hexInput, setHexInput] = useState('');
  const [matchResult, setMatchResult] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function getColorHex(code) {
    const color = colors.find(c => c.code === code);
    return color?.hex || '#000000';
  }

  async function handleMatch() {
    let hex = hexInput.trim();
    
    // Remove # if present
    if (hex.startsWith('#')) {
      hex = hex.slice(1);
    }
    
    // Validate hex format
    if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(hex)) {
      setError('请输入有效的 HEX 颜色 (如: ff0000 或 #ff0000)');
      return;
    }
    
    // Expand 3-digit hex to 6-digit
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await api.colors.match(hex);
      
      // Get the best match
      setMatchResult(result.match || null);
      setAlternatives(Array.isArray(result.alternatives) ? result.alternatives : []);
    } catch (err) {
      setError(err.message || '匹配失败');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e) {
    if (e.key === 'Enter') {
      handleMatch();
    }
  }

  function handleClear() {
    setHexInput('');
    setMatchResult(null);
    setAlternatives([]);
    setError('');
  }

  function handleSelectMatch(code) {
    onSelectColor?.(code);
    handleClear();
  }

  return (
    <div className="hex-matcher">
      <div className="hex-input-row">
        <div className="hex-input-wrapper">
          <span className="hex-prefix">#</span>
          <input
            type="text"
            className="hex-input"
            placeholder="输入或粘贴 HEX 颜色"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={7}
          />
          {hexInput && (
            <button className="hex-clear-btn" onClick={handleClear}>
              <X size={14} />
            </button>
          )}
        </div>
        <button 
          className="btn btn-primary btn-match" 
          onClick={handleMatch}
          disabled={!hexInput.trim() || loading}
        >
          <Search size={16} />
          {loading ? '匹配中...' : '匹配'}
        </button>
      </div>

      {error && (
        <div className="match-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {matchResult && (
        <div className="match-results">
          <div className="match-best">
            <span className="match-label">最佳匹配:</span>
            <button 
              className="match-color-item best"
              onClick={() => handleSelectMatch(matchResult.code)}
            >
              <span 
                className="match-color-swatch"
                style={{ backgroundColor: matchResult.hex }}
              />
              <div className="match-color-info">
                <span className="match-color-code">{matchResult.code}</span>
                <span className="match-color-hex">{matchResult.hex}</span>
              </div>
              <span className="match-distance">
                Δ {matchResult.distance?.toFixed(1) || '0.0'}
              </span>
              <Check size={16} className="match-check-icon" />
            </button>
          </div>

          {alternatives.length > 0 && (
            <div className="match-alternatives">
              <span className="match-label">备选方案:</span>
              <div className="match-alternatives-grid">
                {alternatives.map(alt => (
                  <button
                    key={alt.code}
                    className="match-color-item"
                    onClick={() => handleSelectMatch(alt.code)}
                    title={`${alt.code} - ${alt.hex}`}
                  >
                    <span 
                      className="match-color-swatch small"
                      style={{ backgroundColor: alt.hex }}
                    />
                    <span className="match-color-code">{alt.code}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .hex-matcher {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hex-input-row {
          display: flex;
          gap: 0.35rem;
          align-items: center;
        }

        .hex-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-sm);
          padding: 0.25rem 0.5rem;
          transition: all var(--transition-fast);
        }

        .hex-input-wrapper:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-muted);
        }

        .hex-prefix {
          color: var(--color-text-muted);
          font-weight: 600;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .hex-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.9rem;
          font-family: monospace;
          text-transform: uppercase;
          color: var(--color-text);
          font-weight: 500;
          width: 100%;
        }

        .hex-input::placeholder {
          color: var(--color-text-muted);
          text-transform: none;
          font-family: var(--font-sans);
          font-size: 0.8rem;
        }

        .hex-clear-btn {
          padding: 2px;
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hex-clear-btn:hover {
          color: var(--color-text);
        }

        .btn-match {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          white-space: nowrap;
          font-size: 0.85rem;
        }

        .match-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
          color: #dc2626;
          font-size: 0.8rem;
        }

        .match-results {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
        }

        .match-label {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .match-best, .match-alternatives {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        /* Best Match Item */
        .match-color-item.best {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem;
          background: white;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .match-color-item.best:hover {
          border-color: var(--color-primary);
          background: var(--color-surface-hover);
        }

        .match-color-item.best .match-color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
        }

        .match-color-info {
          display: flex;
          flex-direction: column;
          flex: 1;
        }

        .match-color-code {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--color-text);
        }

        .match-color-hex {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-family: monospace;
        }

        .match-distance {
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-family: monospace;
          font-weight: 600;
        }

        .match-check-icon {
          color: var(--color-primary);
          flex-shrink: 0;
        }

        /* Alternatives Grid */
        .match-alternatives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
          gap: 0.35rem;
        }

        .match-alternatives-grid .match-color-item {
          display: flex;
          position: relative;
          padding: 2px;
          background: white;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          width: 100%;
          aspect-ratio: 1;
          align-items: center;
          justify-content: center;
        }

        .match-alternatives-grid .match-color-item:hover {
          border-color: var(--color-primary);
          transform: scale(1.1);
          z-index: 2;
        }

        .match-alternatives-grid .match-color-swatch {
           width: 100%;
           height: 100%;
           border-radius: 4px;
           border: 1px solid rgba(0,0,0,0.1);
        }
        
        .match-alternatives-grid .match-color-code {
           position: absolute;
           font-size: 0.6rem;
           color: #000;
           font-weight: 700;
           background: rgba(255,255,255,0.7);
           padding: 0 2px;
           border-radius: 3px;
           pointer-events: none;
           text-shadow: 0 0 2px #fff;
        }

        @media (max-width: 640px) {
          .match-alternatives-grid {
             grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

export default HexMatcher;
