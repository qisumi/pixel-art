import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Grid3X3, Tag, Sparkles } from 'lucide-react';
import api from '../utils/api.js';
import PatternThumbnail from '../components/PatternThumbnail/index.js';
import { useToast } from '../hooks/useToast.js';
import Toast from '../components/Toast/index.js';

function PatternCard({ pattern }) {
  return (
    <Link to={`/view/${pattern.id}`} className="glass-panel pattern-card">
      <div className="pattern-card-preview">
        <div className="preview-content">
          {pattern.data && pattern.palette ? (
            <PatternThumbnail
              width={pattern.width}
              height={pattern.height}
              data={pattern.data}
              palette={pattern.palette}
              size={180}
            />
          ) : (
            <>
              <Grid3X3 size={48} strokeWidth={1.5} />
              <span className="pattern-size">{pattern.width}×{pattern.height}</span>
            </>
          )}
        </div>
        <div className="preview-overlay"></div>
      </div>
      <div className="pattern-card-content">
        <h3 className="pattern-card-title">{pattern.name}</h3>
        {pattern.description && (
          <p className="pattern-card-desc">{pattern.description}</p>
        )}
        {pattern.tags.length > 0 && (
          <div className="tags">
            {pattern.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

function PatternListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [patterns, setPatterns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const activeTag = searchParams.get('tag') || '';
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => {
    loadPatterns();
  }, [searchParams]);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadPatterns() {
    setLoading(true);
    try {
      const params = Object.fromEntries(searchParams.entries());
      const result = await api.patterns.list(params);
      setPatterns(result.items);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Failed to load patterns:', err);
      showToast('图纸加载失败', { type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function loadTags() {
    try {
      const result = await api.tags.list();
      setTags(result);
    } catch (err) {
      console.error('Failed to load tags:', err);
      showToast('标签加载失败', { type: 'error' });
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (keyword) {
      newParams.set('keyword', keyword);
    } else {
      newParams.delete('keyword');
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }

  function handleTagFilter(tagName) {
    const newParams = new URLSearchParams(searchParams);
    if (tagName === activeTag) {
      newParams.delete('tag');
    } else {
      newParams.set('tag', tagName);
    }
    newParams.delete('page');
    setSearchParams(newParams);
  }

  return (
    <div className="page">
      <div className="container">
        <header className="page-header">
          <div className="header-content">
            <h1 className="page-title">
              <span className="title-icon"><Grid3X3 size={36} /></span>
              Pixel Gallery
            </h1>
                      <p className="page-subtitle">探索像素艺术创作的世界</p>
          </div>
          <Link to="/new" className="btn btn-primary glow-effect">
            <Plus size={20} />
            <span>创建图纸</span>
          </Link>
        </header>

        <div className="glass-panel list-controls">
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="搜索图纸..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="btn btn-primary">搜索</button>
          </form>

          {tags.length > 0 && (
            <div className="tag-filter-wrapper">
              <div className="tag-filter-label">
                <Tag size={14} />
                <span>Filter by:</span>
              </div>
              <div className="tags">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    className={`tag ${activeTag === tag.name ? 'active' : ''}`}
                    onClick={() => handleTagFilter(tag.name)}
                  >
                    {tag.name}
                    <span className="tag-count">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : patterns.length === 0 ? (
          <div className="empty-state glass-panel">
            <div className="empty-icon">
              <Sparkles size={48} />
            </div>
            <h3>未找到图纸</h3>
            <p>成为第一个在此类别中创建精彩作品的人。</p>
            <Link to="/new" className="btn btn-primary mt-4">
              创建图纸
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cards">
              {patterns.map(pattern => (
                <PatternCard key={pattern.id} pattern={pattern} />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page === 1}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', pagination.page - 1);
                    setSearchParams(newParams);
                  }}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button 
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.set('page', pagination.page + 1);
                    setSearchParams(newParams);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="toast-container">
        <Toast toast={toast} onClose={clearToast} />
      </div>

      <style>{`
        .page-header {
          margin-bottom: 3rem;
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .page-header::after {
          display: none;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .page-title {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 3rem;
          margin-bottom: 0;
          color: var(--color-text);
        }

        .title-icon {
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(129, 140, 248, 0.1);
          padding: 0.5rem;
          border-radius: 12px;
          border: 1px solid rgba(129, 140, 248, 0.2);
        }

        .page-subtitle {
          font-size: 1.1rem;
          color: var(--color-text-secondary);
          max-width: 600px;
        }

        .list-controls {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          margin-bottom: 3rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .search-form {
          display: flex;
          gap: 1rem;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
        }

        .search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 1rem 1rem 1rem 3rem;
          font-size: 1rem;
          border-radius: var(--radius-md);
          color: #1f2937;
          backdrop-filter: blur(10px);
        }
        
        .search-input:focus {
          background: rgba(255, 255, 255, 0.9);
          border-color: var(--color-primary);
          box-shadow: 0 0 0 2px var(--color-primary-muted);
        }

        .search-input::placeholder {
          color: #6b7280;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6b7280;
        }

        .tag-filter-wrapper {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tag-filter-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
          font-size: 0.875rem;
          margin-top: 0.4rem;
          white-space: nowrap;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .tag {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--color-text-secondary);
          padding: 0.4rem 1rem;
          border-radius: 100px;
          font-size: 0.85rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tag:hover {
          background: rgba(129, 140, 248, 0.1);
          border-color: rgba(129, 140, 248, 0.3);
          color: var(--color-primary-hover);
          transform: translateY(-1px);
        }

        .tag.active {
          background: var(--color-primary);
          border-color: var(--color-primary);
          color: white;
          box-shadow: 0 0 15px rgba(129, 140, 248, 0.4);
        }
        
        .tag-count {
          font-size: 0.7rem;
          opacity: 0.7;
          background: rgba(0,0,0,0.2);
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
        }

        .pattern-card {
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: inherit;
          border-radius: var(--radius-lg);
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease;
          height: 100%;
          border: 1px solid rgba(99, 102, 241, 0.08);
          background: linear-gradient(165deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.75));
          position: relative;
          overflow: hidden;
        }

        .pattern-card:hover {
          transform: translateY(-10px) scale(1.02);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 0 22px 45px -15px rgba(30, 41, 59, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.08);
          z-index: 10;
        }

        .pattern-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 10% 0%, rgba(99, 102, 241, 0.12), transparent 45%),
                      radial-gradient(circle at 90% 20%, rgba(14, 165, 233, 0.08), transparent 40%);
          opacity: 0.6;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .pattern-card:hover::before {
          opacity: 1;
        }

        .pattern-card-preview {
          height: 200px;
          background:
            linear-gradient(140deg, rgba(99, 102, 241, 0.08), rgba(255, 255, 255, 0.6)),
            repeating-linear-gradient(45deg, rgba(148, 163, 184, 0.2) 0 10px, rgba(255, 255, 255, 0.2) 10px 20px);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .preview-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-muted);
          z-index: 2;
          transition: transform 0.3s ease, color 0.3s ease;
        }
        
        .pattern-card:hover .preview-content {
          color: var(--color-primary);
          transform: scale(1.1);
        }
        
        .preview-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.0), rgba(99, 102, 241, 0.08));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .pattern-card:hover .preview-overlay {
          opacity: 1;
        }

        .pattern-card-preview::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.6), transparent 60%);
          pointer-events: none;
        }

        .pattern-size {
          font-family: monospace;
          font-size: 0.75rem;
          background: rgba(15, 23, 42, 0.65);
          color: #e2e8f0;
          padding: 0.25rem 0.6rem;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.2);
          letter-spacing: 0.02em;
        }

        .pattern-card-content {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .pattern-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.3;
          color: var(--color-text);
        }

        .pattern-card-desc {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pattern-card .tags .tag {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.2);
          color: var(--color-primary-hover);
        }

        .pattern-card:hover .tags .tag {
          background: rgba(99, 102, 241, 0.12);
        }
        
        .mt-4 {
          margin-top: 1rem;
        }
        
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .pagination-info {
          color: var(--color-text-secondary);
          font-variant-numeric: tabular-nums;
        }
        
        .btn-sm {
          padding: 0.4rem 0.8rem;
          font-size: 0.875rem;
        }
        
        .glow-effect {
          position: relative;
          overflow: hidden;
        }
        
        .glow-effect::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 60%);
          transform: scale(0);
          transition: transform 0.6s ease-out;
        }
        
        .glow-effect:hover::after {
          transform: scale(1);
          transition: 0s;
        }

        @media (max-width: 768px) {
          .page-title {
            font-size: 2rem;
          }
          
          .list-controls {
            padding: 1rem;
          }
          
          .search-form {
            flex-direction: column;
          }
          
          .tag-filter-wrapper {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default PatternListPage;
