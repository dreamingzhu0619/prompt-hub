import { useState } from 'react';
import { Search, Loader2, ExternalLink, Check, BookOpen, Globe } from 'lucide-react';
import { api } from '../../services/api';

function ToolsPanel({ onSearchSelectionChange, onKnowledgeSelectionChange }) {
  const [activeTab, setActiveTab] = useState('search');

  // Web search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSelectedIds, setSearchSelectedIds] = useState(new Set());
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Knowledge search state
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeResults, setKnowledgeResults] = useState([]);
  const [knowledgeSelectedIds, setKnowledgeSelectedIds] = useState(new Set());
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeDone, setKnowledgeDone] = useState(false);

  // Web search handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchDone(true);
    try {
      const data = await api.search(searchQuery.trim());
      setSearchResults(data);
      setSearchSelectedIds(new Set());
      onSearchSelectionChange([]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSearchSelect = (index) => {
    const next = new Set(searchSelectedIds);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSearchSelectedIds(next);
    onSearchSelectionChange(searchResults.filter((_, i) => next.has(i)));
  };

  const selectAllSearch = () => {
    if (searchSelectedIds.size === searchResults.length) {
      setSearchSelectedIds(new Set());
      onSearchSelectionChange([]);
    } else {
      const all = new Set(searchResults.map((_, i) => i));
      setSearchSelectedIds(all);
      onSearchSelectionChange(searchResults);
    }
  };

  // Knowledge search handlers
  const handleKnowledgeSearch = async () => {
    if (!knowledgeQuery.trim()) return;
    setKnowledgeLoading(true);
    setKnowledgeDone(true);
    try {
      const data = await api.searchKnowledge(knowledgeQuery.trim());
      setKnowledgeResults(data);
      setKnowledgeSelectedIds(new Set());
      onKnowledgeSelectionChange([]);
    } catch {
      setKnowledgeResults([]);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const toggleKnowledgeSelect = (index) => {
    const next = new Set(knowledgeSelectedIds);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setKnowledgeSelectedIds(next);
    onKnowledgeSelectionChange(knowledgeResults.filter((_, i) => next.has(i)));
  };

  const selectAllKnowledge = () => {
    if (knowledgeSelectedIds.size === knowledgeResults.length) {
      setKnowledgeSelectedIds(new Set());
      onKnowledgeSelectionChange([]);
    } else {
      const all = new Set(knowledgeResults.map((_, i) => i));
      setKnowledgeSelectedIds(all);
      onKnowledgeSelectionChange(knowledgeResults);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 border-b border-gray-200 -mx-4 px-4">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'search'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe size={14} />
          网络搜索
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'knowledge'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={14} />
          知识库检索
        </button>
      </div>

      {/* Web search tab */}
      {activeTab === 'search' && (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入搜索关键词..."
              className="flex-1 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              搜索
            </button>
          </div>

          {searchLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              搜索中...
            </div>
          )}

          {!searchLoading && searchDone && searchResults.length === 0 && (
            <p className="mt-3 text-sm text-gray-400">未找到相关结果</p>
          )}

          {!searchLoading && searchResults.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  找到 {searchResults.length} 条结果，已选 {searchSelectedIds.size} 条
                </span>
                <button onClick={selectAllSearch} className="text-xs text-blue-600 hover:text-blue-700">
                  {searchSelectedIds.size === searchResults.length ? '取消全选' : '全选'}
                </button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => toggleSearchSelect(index)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${
                      searchSelectedIds.has(index)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          searchSelectedIds.has(index) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}
                      >
                        {searchSelectedIds.has(index) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
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
      )}

      {/* Knowledge search tab */}
      {activeTab === 'knowledge' && (
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              value={knowledgeQuery}
              onChange={(e) => setKnowledgeQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleKnowledgeSearch()}
              placeholder="输入知识库检索关键词..."
              className="flex-1 px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleKnowledgeSearch}
              disabled={knowledgeLoading || !knowledgeQuery.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {knowledgeLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              检索
            </button>
          </div>

          {knowledgeLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              检索中...
            </div>
          )}

          {!knowledgeLoading && knowledgeDone && knowledgeResults.length === 0 && (
            <p className="mt-3 text-sm text-gray-400">未找到相关内容</p>
          )}

          {!knowledgeLoading && knowledgeResults.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  找到 {knowledgeResults.length} 条结果，已选 {knowledgeSelectedIds.size} 条
                </span>
                <button onClick={selectAllKnowledge} className="text-xs text-blue-600 hover:text-blue-700">
                  {knowledgeSelectedIds.size === knowledgeResults.length ? '取消全选' : '全选'}
                </button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {knowledgeResults.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => toggleKnowledgeSelect(index)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${
                      knowledgeSelectedIds.has(index)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          knowledgeSelectedIds.has(index) ? 'bg-green-600 border-green-600' : 'border-gray-300'
                        }`}
                      >
                        {knowledgeSelectedIds.has(index) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                            {item.file}
                          </span>
                          <span className="text-xs text-gray-400">
                            相关度 {Math.round(item.score * 100)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.preview}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ToolsPanel;
