import { useState, useEffect } from 'react';
import {
  ScrollText,
  AlertCircle,
  AlertTriangle,
  Info,
  Filter,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';

const LEVEL_CONFIG = {
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const CATEGORIES = ['all', 'generate', 'search', 'knowledge', 'intent', 'agent', 'llm'];

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        const data = await api.getLogs({
          level: levelFilter || undefined,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
        });
        setLogs(data);
      } catch (err) {
        console.error('Failed to load logs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [levelFilter, categoryFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api.getLogs({
        level: levelFilter || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
      });
      setLogs(data);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <ScrollText size={20} />
          操作日志
        </h2>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          <RefreshCw size={12} />
          刷新
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-3">
        {/* Level filter */}
        <div className="flex items-center gap-1">
          <Filter size={12} className="text-gray-400" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">全部级别</option>
            <option value="error">错误</option>
            <option value="warning">警告</option>
            <option value="info">信息</option>
          </select>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {cat === 'all' ? '全部' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mr-2" size={16} />
          加载中...
        </div>
      ) : logs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          暂无日志
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5">
          {logs.map((log) => {
            const config = LEVEL_CONFIG[log.level] || LEVEL_CONFIG.info;
            const Icon = config.icon;
            const isExpanded = expandedId === log.id;

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded-md border ${config.border} ${config.bg} cursor-pointer transition-colors`}
                onClick={() => setExpandedId(isExpanded ? null : log.id)}
              >
                <div className="flex items-start gap-2">
                  <Icon size={14} className={`${config.color} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-gray-700 flex-1">{log.message}</p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1 py-0.5 bg-white/60 text-gray-500 rounded">
                        {log.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded metadata */}
                {isExpanded && log.metadata && (
                  <div className="mt-2 ml-6 p-2 bg-white/80 rounded text-[11px] text-gray-600">
                    <pre className="whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
