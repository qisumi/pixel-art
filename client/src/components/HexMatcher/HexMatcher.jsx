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
      setMatchResult(result);
      
      // Find alternative matches (closest 4 colors by sorting all colors by distance)
      const allDistances = colors.map(color => {
        // Calculate simple RGB distance (approximation)
        const inputRgb = hexToRgb('#' + hex);
        const colorRgb = hexToRgb(color.hex);
        const distance = Math.sqrt(
          Math.pow(inputRgb[0] - colorRgb[0], 2) +
          Math.pow(inputRgb[1] - colorRgb[1], 2) +
          Math.pow(inputRgb[2] - colorRgb[2], 2)
        );
        return { ...color, distance };
      }).sort((a, b) => a.distance - b.distance);
      
      // Get top 5 alternatives (excluding the best match if it's the same)
      const alts = allDistances
        .filter(c => c.code !== result.code)
        .slice(0, 4);
      
      setAlternatives(alts);
    } catch (err) {
      setError(err.message || '匹配失败');
    } finally {
      setLoading(false);
    }
  }

  function hexToRgb(hex) {
    let value = hex.startsWith('#') ? hex.slice(1) : hex;
    if (value.length === 3) {
      value = value.split('').map(c => c + c).join('');
    }
    const num = parseInt(value, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
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
          gap: 0.75rem;
        }

        .hex-input-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .hex-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(255, 255, 255, 0.9);
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          transition: all var(--transition-fast);
        }

        .hex-input-wrapper:focus-within {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-muted);
        }

        .hex-prefix {
          color: var(--color-text-muted);
          font-weight: 600;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .hex-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.95rem;
          font-family: 'Monaco', 'Menlo', monospace;
          text-transform: uppercase;
          color: var(--color-text);
          font-weight: 500;
        }

        .hex-input::placeholder {
          color: var(--color-text-muted);
          text-transform: none;
          font-family: var(--font-sans);
        }

        .hex-clear-btn {
          padding: 0.25rem;
          background: rgba(0, 0, 0, 0.05);
          border: none;
          border-radius: 4px;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all var(--transition-fast);
        }

        .hex-clear-btn:hover {
          background: rgba(0, 0, 0, 0.1);
          color: var(--color-text);
        }

        .btn-match {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          white-space: nowrap;
        }

        .match-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
          color: #dc2626;
          font-size: 0.875rem;
        }

        .match-results {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(0, 0, 0, 0.05);
          border-radius: var(--radius-sm);
        }

        .match-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .match-best, .match-alternatives {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .match-color-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          background: white;
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .match-color-item:hover {
          border-color: var(--color-primary);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
          transform: translateY(-1px);
        }

        .match-color-item.best {
          border-color: var(--color-primary);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(99, 102, 241, 0.02));
        }

        .match-color-swatch {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          border: 2px solid rgba(0, 0, 0, 0.1);
          flex-shrink: 0;
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .match-color-swatch.small {
          width: 28px;
          height: 28px;
        }

        .match-color-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          flex: 1;
        }

        .match-color-code {
          font-weight: 700;
          font-size: 0.95rem;
          color: var(--color-text);
        }

        .match-color-hex {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .match-distance {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-family: 'Monaco', 'Menlo', monospace;
          font-weight: 600;
        }

        .match-check-icon {
          color: var(--color-primary);
          flex-shrink: 0;
        }

        .match-alternatives-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.5rem;
        }

        .match-alternatives .match-color-item {
          padding: 0.5rem;
          justify-content: flex-start;
        }

        @media (max-width: 640px) {
          .hex-input-row {
            flex-direction: column;
          }

          .hex-input-wrapper {
            width: 100%;
          }

          .btn-match {
            width: 100%;
            justify-content: center;
          }

          .match-alternatives-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export default HexMatcher;
