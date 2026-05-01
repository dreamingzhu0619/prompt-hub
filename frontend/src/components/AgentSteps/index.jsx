import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  Wrench,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  BookOpen,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

const TOOL_ICONS = {
  web_search: Search,
  knowledge_search: BookOpen,
};

const TOOL_LABELS = {
  web_search: '网络搜索',
  knowledge_search: '知识库检索',
};

function StepIcon({ step, isLatest, agentStatus }) {
  const isRunning = isLatest && agentStatus === 'running';

  if (step.type === 'thinking') {
    return isRunning ? (
      <Loader2 size={16} className="text-purple-500 animate-spin" />
    ) : (
      <Brain size={16} className="text-purple-500" />
    );
  }
  if (step.type === 'tool_call') {
    const Icon = TOOL_ICONS[step.tool] || Wrench;
    return isRunning ? (
      <Loader2 size={16} className="text-blue-500 animate-spin" />
    ) : (
      <Icon size={16} className="text-blue-500" />
    );
  }
  if (step.type === 'tool_result') {
    return <CheckCircle2 size={16} className="text-green-500" />;
  }
  if (step.type === 'error') {
    return <AlertCircle size={16} className="text-red-500" />;
  }
  return <CheckCircle2 size={16} className="text-gray-400" />;
}

function StepHeader({ step }) {
  if (step.type === 'thinking') return '思考中...';
  if (step.type === 'tool_call') {
    const label = TOOL_LABELS[step.tool] || step.tool;
    return `调用工具: ${label}`;
  }
  if (step.type === 'tool_result') {
    const label = TOOL_LABELS[step.tool] || step.tool;
    return `${label} 返回结果`;
  }
  return '步骤';
}

function StepDetail({ step }) {
  if (step.type === 'thinking') {
    return <p className="text-sm text-gray-600 whitespace-pre-wrap">{step.content}</p>;
  }

  if (step.type === 'tool_call') {
    return (
      <div className="space-y-1">
        <p className="text-xs text-gray-500 font-medium">参数:</p>
        <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
          {JSON.stringify(step.params, null, 2)}
        </pre>
      </div>
    );
  }

  if (step.type === 'tool_result') {
    const results = Array.isArray(step.result) ? step.result : [step.result];
    return (
      <div className="space-y-2">
        {step.params && Object.keys(step.params).length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">参数:</p>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(step.params, null, 2)}
            </pre>
          </div>
        )}
        {results.map((item, i) => (
          <div key={i} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-green-300">
            {item.title && <p className="font-medium text-gray-700">{item.title}</p>}
            {item.file && <p className="font-medium text-gray-700">{item.file} (score: {item.score})</p>}
            <p className="text-gray-600 mt-0.5">{item.content || item.preview}</p>
          </div>
        ))}
      </div>
    );
  }

  if (step.type === 'error') {
    return <p className="text-sm text-red-600 whitespace-pre-wrap">{step.content}</p>;
  }

  return null;
}

function StepItem({ step, isLatest, agentStatus }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div className="relative pl-6">
      {/* Timeline connector */}
      <div className="absolute left-[7px] top-6 bottom-0 w-px bg-gray-200" />

      {/* Step node */}
      <div className="relative">
        {/* Icon on timeline */}
        <div className="absolute -left-6 top-0.5 w-4 h-4 flex items-center justify-center">
          <StepIcon step={step} isLatest={isLatest} agentStatus={agentStatus} />
        </div>

        {/* Content */}
        <div className="pb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <StepHeader step={step} />
          </button>

          {expanded && (
            <div className="mt-2 ml-5">
              <StepDetail step={step} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentSteps({ steps, finalResult, status, error }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!finalResult) return;
    await navigator.clipboard.writeText(finalResult.result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (steps.length === 0 && status === 'idle') {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Agent 执行结果将显示在这里
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          Agent 执行链路
          {status === 'running' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
              <Loader2 size={10} className="animate-spin" />
              执行中
            </span>
          )}
          {status === 'completed' && (
            <span className="inline-flex items-center px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded-full">
              已完成
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
              出错
            </span>
          )}
        </h3>
        {finalResult && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '已复制' : '复制结果'}
          </button>
        )}
      </div>

      {/* Steps timeline */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-0">
          {steps.map((step, index) => (
            <StepItem
              key={step.id || index}
              step={step}
              isLatest={index === steps.length - 1}
              agentStatus={status}
            />
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Final result */}
        {finalResult && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">最终结果</h4>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{finalResult.result}</ReactMarkdown>
            </div>
            {finalResult.tokens && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
                <span>Tokens: {finalResult.tokens.total}</span>
                <span>耗时: {finalResult.duration_ms}ms</span>
                {finalResult.cost > 0 && <span>费用: ${finalResult.cost.toFixed(4)}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
