import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ExternalLink, Check, BookOpen, Globe } from 'lucide-react';
import { api } from '../../services/api';

const TOOL_OPTIONS = [
  { id: 'web_search', label: '网络搜索', icon: Globe },
  { id: 'knowledge_search', label: '知识库检索', icon: BookOpen },
];

function ToolsPanel({
  selectedTools,
  onToolsChange,
  searchResults,
  selectedSearchIndexes,
  onSearchResultsChange,
  onSearchSelectionChange,
  knowledgeResults,
  selectedKnowledgeIndexes,
  onKnowledgeResultsChange,
  onKnowledgeSelectionChange,
}) {
  const [activeTab, setActiveTab] = useState('search');

  // Web search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDone, setSearchDone] = useState(false);

  // Knowledge search state
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeDone, setKnowledgeDone] = useState(false);

  const enabledSearch = selectedTools.includes('web_search');
  const enabledKnowledge = selectedTools.includes('knowledge_search');
  const hasEnabledTools = enabledSearch || enabledKnowledge;
  const visibleTabs = useMemo(() => {
    const tabs = [];
    if (enabledSearch) tabs.push('search');
    if (enabledKnowledge) tabs.push('knowledge');
    return tabs;
  }, [enabledSearch, enabledKnowledge]);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] || 'search');
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (!enabledSearch) {
      onSearchSelectionChange([]);
    }
  }, [enabledSearch, onSearchSelectionChange]);

  useEffect(() => {
    if (!enabledKnowledge) {
      onKnowledgeSelectionChange([]);
    }
  }, [enabledKnowledge, onKnowledgeSelectionChange]);

  const toggleTool = (toolId) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((item) => item !== toolId));
      return;
    }

    onToolsChange([...selectedTools, toolId]);
  };

  // Web search handlers
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchDone(true);
    try {
      const data = await api.search(searchQuery.trim());
      onSearchResultsChange(data);
      onSearchSelectionChange([]);
    } catch {
      onSearchResultsChange([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSearchSelect = (index) => {
    const next = selectedSearchIndexes.includes(index)
      ? selectedSearchIndexes.filter((item) => item !== index)
      : [...selectedSearchIndexes, index];
    onSearchSelectionChange(next);
  };

  const selectAllSearch = () => {
    if (selectedSearchIndexes.length === searchResults.length) {
      onSearchSelectionChange([]);
    } else {
      onSearchSelectionChange(searchResults.map((_, index) => index));
    }
  };

  // Knowledge search handlers
  const handleKnowledgeSearch = async () => {
    if (!knowledgeQuery.trim()) return;
    setKnowledgeLoading(true);
    setKnowledgeDone(true);
    try {
      const data = await api.searchKnowledge(knowledgeQuery.trim());
      onKnowledgeResultsChange(data);
      onKnowledgeSelectionChange([]);
    } catch {
      onKnowledgeResultsChange([]);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const toggleKnowledgeSelect = (index) => {
    const next = selectedKnowledgeIndexes.includes(index)
      ? selectedKnowledgeIndexes.filter((item) => item !== index)
      : [...selectedKnowledgeIndexes, index];
    onKnowledgeSelectionChange(next);
  };

  const selectAllKnowledge = () => {
    if (selectedKnowledgeIndexes.length === knowledgeResults.length) {
      onKnowledgeSelectionChange([]);
    } else {
      onKnowledgeSelectionChange(knowledgeResults.map((_, index) => index));
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800">工具选择</h3>
        <p className="mt-1 text-sm text-gray-500">模板会默认勾选常用工具，你也可以手动取消。</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TOOL_OPTIONS.map((tool) => {
          const Icon = tool.icon;
          const active = selectedTools.includes(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => toggleTool(tool.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {tool.label}
            </button>
          );
        })}
      </div>

      {!hasEnabledTools && (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-center text-gray-500">
          当前没有启用任何工具。你可以点击上方工具名称重新启用。
        </div>
      )}

      {hasEnabledTools && (
        <>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 border-b border-gray-200 -mx-4 px-4">
        {enabledSearch && (
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
        )}
        {enabledKnowledge && (
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
        )}
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
                  找到 {searchResults.length} 条结果，已选 {selectedSearchIndexes.length} 条
                </span>
                <button onClick={selectAllSearch} className="text-xs text-blue-600 hover:text-blue-700">
                  {selectedSearchIndexes.length === searchResults.length ? '取消全选' : '全选'}
                </button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => toggleSearchSelect(index)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedSearchIndexes.includes(index)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedSearchIndexes.includes(index) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}
                      >
                        {selectedSearchIndexes.includes(index) && <Check size={10} className="text-white" />}
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
                  找到 {knowledgeResults.length} 条结果，已选 {selectedKnowledgeIndexes.length} 条
                </span>
                <button onClick={selectAllKnowledge} className="text-xs text-blue-600 hover:text-blue-700">
                  {selectedKnowledgeIndexes.length === knowledgeResults.length ? '取消全选' : '全选'}
                </button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {knowledgeResults.map((item, index) => (
                  <li
                    key={index}
                    onClick={() => toggleKnowledgeSelect(index)}
                    className={`p-2 rounded-md border cursor-pointer transition-colors ${
                      selectedKnowledgeIndexes.includes(index)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                          selectedKnowledgeIndexes.includes(index) ? 'bg-green-600 border-green-600' : 'border-gray-300'
                        }`}
                      >
                        {selectedKnowledgeIndexes.includes(index) && <Check size={10} className="text-white" />}
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
        </>
      )}
    </div>
  );
}

export default ToolsPanel;
