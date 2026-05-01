import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Star,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  DollarSign,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
} from 'lucide-react';

export default function HistoryDetail({ data, loading, onClose, onToggleFavorite }) {
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteValue, setNoteValue] = useState('');

  const handleCopyResult = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrompt = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.rendered_prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  if (loading || !data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <Loader2 className="animate-spin mr-2" size={16} />
        加载中...
      </div>
    );
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={16} />
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleFavorite(data.id, data.is_favorite)}
            className="p-1.5 rounded hover:bg-gray-100"
          >
            <Star
              size={16}
              className={
                data.is_favorite
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-400 hover:text-yellow-400'
              }
            />
          </button>
          <button
            onClick={handleCopyResult}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? '已复制' : '复制结果'}
          </button>
        </div>
      </div>

      {/* Meta info */}
      <div className="p-3 bg-gray-50 rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-gray-800">{data.template_name}</span>
          <span className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded">
            v{data.template_version}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MessageSquare size={10} />
            {data.model}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {data.duration_ms}ms
          </span>
          <span className="flex items-center gap-1">
            <Zap size={10} />
            {data.total_tokens} tokens
          </span>
          <span className="flex items-center gap-1">
            <DollarSign size={10} />
            ${data.cost.toFixed(4)}
          </span>
          <span>T={data.temperature}</span>
          <span>{formatDate(data.created_at)}</span>
        </div>
      </div>

      {/* Note */}
      {(data.note || noteEditing) && (
        <div className="mb-3 text-xs text-gray-500 italic border-l-2 border-yellow-300 pl-2">
          {data.note || '暂无备注'}
        </div>
      )}

      {/* Collapsible sections */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Rendered Prompt */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <FileText size={14} />
              渲染后的 Prompt
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPrompt();
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {copiedPrompt ? <Check size={12} /> : <Copy size={12} />}
              </button>
              {showPrompt ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </button>
          {showPrompt && (
            <div className="p-3 text-sm text-gray-600 whitespace-pre-wrap bg-white border-t border-gray-200 max-h-48 overflow-y-auto">
              {data.rendered_prompt}
            </div>
          )}
        </div>

        {/* Execution Steps */}
        {data.execution_steps && data.execution_steps.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex items-center justify-between w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <Zap size={14} />
                执行链路 ({data.execution_steps.length} 步)
              </span>
              {showSteps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {showSteps && (
              <div className="p-3 space-y-2 border-t border-gray-200 bg-white">
                {data.execution_steps.map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs"
                  >
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-[10px] font-medium">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{step.step_name}</span>
                        <span
                          className={`px-1 py-0.5 rounded text-[10px] ${
                            step.status === 'completed'
                              ? 'bg-green-100 text-green-600'
                              : step.status === 'error'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {step.status}
                        </span>
                      </div>
                      {step.input && (
                        <p className="text-gray-500 mt-0.5 truncate">输入: {step.input}</p>
                      )}
                      {step.output && (
                        <p className="text-gray-500 mt-0.5 truncate">输出: {step.output}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Result */}
        <div className="border border-gray-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">生成结果</h4>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{data.result}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
