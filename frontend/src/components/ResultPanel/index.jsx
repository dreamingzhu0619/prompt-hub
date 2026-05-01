import ReactMarkdown from 'react-markdown';
import { Copy, Check, Loader2, FileText, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function ResultPanel({ result, loading }) {
  const [copied, setCopied] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleCopy = async (type = 'markdown') => {
    if (!result) return;
    const text = type === 'plain' ? stripMarkdown(result.result) : result.result;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setShowCopyMenu(false);
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
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm gap-2">
        <FileText size={32} className="text-gray-300" />
        <span>生成结果将显示在这里</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">生成结果</h3>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowCopyMenu(!showCopyMenu)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
            <ChevronDown size={10} />
          </button>
          {showCopyMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-10 w-36">
              <button
                onClick={() => handleCopy('markdown')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
              >
                复制 Markdown
              </button>
              <button
                onClick={() => handleCopy('plain')}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
              >
                复制纯文本
              </button>
            </div>
          )}
        </div>
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

function stripMarkdown(md) {
  return md
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^>\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
