import { useState, useEffect } from 'react';
import {
  Clock,
  Star,
  ChevronRight,
  Loader2,
  DollarSign,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';
import HistoryDetail from './HistoryDetail';
import CostStats from './CostStats';

export default function History() {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ is_favorite: false });
  const [selectedId, setSelectedId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data = await api.getHistory(filter);
        setHistory(data.items);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [filter]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await api.getCostStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      }
    };

    loadStats();
  }, []);

  const handleViewDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const data = await api.getHistoryDetail(id);
      setDetailData(data);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleFavorite = async (id, currentValue) => {
    try {
      await api.updateHistory(id, { is_favorite: !currentValue });
      const nextValue = !currentValue;

      setHistory((prev) =>
        prev.map((h) => (h.id === id ? { ...h, is_favorite: nextValue } : h))
      );
      setDetailData((prev) =>
        prev && prev.id === id ? { ...prev, is_favorite: nextValue } : prev
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleCloseDetail = () => {
    setSelectedId(null);
    setDetailData(null);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (selectedId) {
    return (
      <HistoryDetail
        data={detailData}
        loading={detailLoading}
        onClose={handleCloseDetail}
        onToggleFavorite={handleToggleFavorite}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Clock size={20} />
          生成历史
          <span className="text-sm font-normal text-gray-500">({total})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
              showStats
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <TrendingUp size={12} />
            统计
          </button>
          <button
            onClick={() => setFilter((f) => ({ ...f, is_favorite: !f.is_favorite }))}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border transition-colors ${
              filter.is_favorite
                ? 'bg-yellow-50 border-yellow-200 text-yellow-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Star size={12} fill={filter.is_favorite ? 'currentColor' : 'none'} />
            收藏
          </button>
        </div>
      </div>

      {/* Cost Stats */}
      {showStats && stats && <CostStats stats={stats} />}

      {/* History List */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mr-2" size={16} />
          加载中...
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {filter.is_favorite ? '没有收藏的记录' : '暂无生成历史'}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-colors cursor-pointer group"
              onClick={() => handleViewDetail(item.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item.id, item.is_favorite);
                    }}
                    className="flex-shrink-0"
                  >
                    <Star
                      size={14}
                      className={
                        item.is_favorite
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300 hover:text-yellow-400'
                      }
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {item.template_name}
                  </span>
                  <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                    {item.model}
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  className="text-gray-300 group-hover:text-blue-400 flex-shrink-0"
                />
              </div>
              <div className="flex items-center gap-3 mt-1.5 ml-6 text-xs text-gray-400">
                <span>{formatDate(item.created_at)}</span>
                <span className="flex items-center gap-0.5">
                  <Zap size={10} />
                  {item.total_tokens} tokens
                </span>
                <span className="flex items-center gap-0.5">
                  <DollarSign size={10} />
                  ${item.cost.toFixed(4)}
                </span>
                {item.note && (
                  <span className="text-gray-500 truncate max-w-[120px]">{item.note}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
