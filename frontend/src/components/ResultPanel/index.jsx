import ReactMarkdown from 'react-markdown';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function ResultPanel({ result, loading }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        生成中...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        生成结果将显示在这里
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">生成结果</h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto prose prose-sm max-w-none">
        <ReactMarkdown>{result.result}</ReactMarkdown>
      </div>

      {result.tokens && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
          <span>Tokens: {result.tokens.total}</span>
          <span>耗时: {result.duration_ms}ms</span>
          {result.cost > 0 && <span>费用: ${result.cost.toFixed(4)}</span>}
        </div>
      )}
    </div>
  );
}
