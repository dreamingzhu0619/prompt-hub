import { useState } from 'react';
import { Send, CheckCircle, XCircle, MessageSquare, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

function FreeInput({ templates, onIntentResolved }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [intentResult, setIntentResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setConversation((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setIntentResult(null);
    setFeedbackGiven(false);

    try {
      const context = conversation.length > 0 ? conversation : undefined;
      const result = await api.chat(text, context);

      if (result.type === 'ready') {
        setIntentResult(result);
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'ready',
            content: `已识别意图，匹配模板：${result.template.name}`,
            result,
          },
        ]);
      } else if (result.type === 'clarification') {
        setIntentResult(result.template ? result : null);
        setConversation((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'clarification',
            content: result.question,
            result,
          },
        ]);
      }
    } catch (err) {
      setConversation((prev) => [
        ...prev,
        { role: 'assistant', type: 'error', content: '意图识别失败，请重试。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyIntent = () => {
    if (!intentResult) return;
    const template = templates.find((t) => t.id === intentResult.template.id);
    if (template) {
      onIntentResolved(template, intentResult.prefilled_variables || {});
    }
  };

  const handleFeedback = async (correct) => {
    if (!intentResult?.id) {
      return;
    }

    if (correct) {
      await api.intentFeedback(intentResult.id, { correct: true, note: '' });
      setFeedbackGiven(true);
      return;
    }

    setShowFeedbackInput(true);
  };

  const handleSubmitNegativeFeedback = async () => {
    if (!intentResult?.id) {
      return;
    }

    await api.intentFeedback(intentResult.id, {
      correct: false,
      note: feedbackNote,
    });
    setFeedbackGiven(true);
    setShowFeedbackInput(false);
    setFeedbackNote('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {conversation.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">输入你的需求，AI 将自动识别意图并匹配模板</p>
            <p className="text-xs text-gray-300 mt-1">例如："帮我优化简历"、"写一封求职信"</p>
          </div>
        )}

        {conversation.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.type === 'error'
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Intent Ready Result */}
              {msg.type === 'ready' && msg.result && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-yellow-500" />
                    <span className="font-medium">模板: {msg.result.template.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                      {Math.round(msg.result.confidence * 100)}%
                    </span>
                  </div>
                  {msg.result.reasoning && (
                    <p className="text-xs text-gray-500">{msg.result.reasoning}</p>
                  )}
                </div>
              )}

              {/* Clarification Candidates */}
              {msg.type === 'clarification' && msg.result?.template && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">候选模板: {msg.result.template.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      {Math.round((msg.result.confidence || 0) * 100)}%
                    </span>
                  </div>
                  {Array.isArray(msg.result.missing_variables) && msg.result.missing_variables.length > 0 && (
                    <p className="text-xs text-gray-500">
                      还缺少: {msg.result.missing_variables.join('、')}
                    </p>
                  )}
                  {msg.result.reasoning && (
                    <p className="text-xs text-gray-500">{msg.result.reasoning}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              正在识别意图...
            </div>
          </div>
        )}
      </div>

      {/* Intent Action Bar */}
      {intentResult && !feedbackGiven && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                {intentResult.type === 'ready' ? '已匹配' : '候选模板'}: {intentResult.template.name}
              </span>
            </div>
            <button
              onClick={handleApplyIntent}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
            >
              {intentResult.type === 'ready' ? '应用并填充变量' : '去补全变量'} <ArrowRight size={12} />
            </button>
          </div>

          {Array.isArray(intentResult.missing_variables) && intentResult.missing_variables.length > 0 && (
            <p className="mt-2 text-xs text-blue-700">
              仍需补充: {intentResult.missing_variables.join('、')}
            </p>
          )}

          {/* Feedback buttons */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200">
            <span className="text-xs text-blue-600">识别准确吗？</span>
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-green-100 text-green-600"
            >
              <CheckCircle size={12} /> 正确
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-red-100 text-red-600"
            >
              <XCircle size={12} /> 错误
            </button>
          </div>

          {showFeedbackInput && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="简要说明错误原因..."
                className="flex-1 text-xs px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
              <button
                onClick={handleSubmitNegativeFeedback}
                className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                提交
              </button>
            </div>
          )}
        </div>
      )}

      {feedbackGiven && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-center">
          <span className="text-xs text-green-600">感谢反馈！</span>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的需求，例如：帮我优化简历..."
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

export default FreeInput;
