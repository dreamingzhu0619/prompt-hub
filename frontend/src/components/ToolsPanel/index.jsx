import { useState } from 'react';
import { Search, Loader2, ExternalLink, Check } from 'lucide-react';
import { api } from '../../services/api';

function ToolsPanel({ onSelectionChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.search(query.trim());
      setResults(data);
      setSelectedIds(new Set());
      onSelectionChange([]);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const toggleSelect = (index) => {
    const next = new Set(selectedIds);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIds(next);
    onSelectionChange(results.filter((_, i) => next.has(i)));
  };

  const selectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
      onSelectionChange([]);
    } else {
      const all = new Set(results.map((_, i) => i));
      setSelectedIds(all);
      onSelectionChange(results);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">搜索增强</h3>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入搜索关键词..."
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          搜索
        </button>
      </div>

      {/* Results */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={14} className="animate-spin" />
          搜索中...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <p className="mt-3 text-sm text-gray-400">未找到相关结果</p>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">
              找到 {results.length} 条结果，已选 {selectedIds.size} 条
            </span>
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {selectedIds.size === results.length ? '取消全选' : '全选'}
            </button>
          </div>

          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {results.map((item, index) => (
              <li
                key={index}
                onClick={() => toggleSelect(index)}
                className={`p-2 rounded-md border cursor-pointer transition-colors ${
                  selectedIds.has(index)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedIds.has(index)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedIds.has(index) && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {item.title}
                      </span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-shrink-0 text-gray-400 hover:text-blue-500"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.content}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ToolsPanel;
