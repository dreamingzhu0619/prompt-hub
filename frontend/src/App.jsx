import { useState, useEffect, useRef } from 'react';
import {
  Play,
  MessageSquare,
  Settings2,
  Bot,
  Zap,
  Clock,
  ScrollText,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import TemplateEditor from './components/TemplateEditor';
import VariableForm from './components/VariableForm';
import Settings from './components/Settings';
import ToolsPanel from './components/ToolsPanel';
import ResultPanel from './components/ResultPanel';
import FreeInput from './components/FreeInput';
import AgentSteps from './components/AgentSteps';
import History from './components/History';
import Logs from './components/Logs';
import { api } from './services/api';
import { useAgentSSE } from './hooks/useAgentSSE';

const MIN_SIDEBAR_WIDTH = 220;
const MIN_EDITOR_WIDTH = 520;
const MIN_RIGHT_PANEL_WIDTH = 320;
const RESIZER_WIDTH = 10;
const SIDEBAR_WIDTH_STORAGE_KEY = 'prompt-hub:sidebar-width';
const EDITOR_WIDTH_STORAGE_KEY = 'prompt-hub:editor-width';
const AVAILABLE_TOOLS = ['web_search', 'knowledge_search'];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function readStoredWidth(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = Number(window.localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? stored : fallback;
  } catch {
    return fallback;
  }
}

function getTemplateDefaultTools(template) {
  if (!template || !Array.isArray(template.default_tools)) {
    return [];
  }

  return template.default_tools.filter((tool) => AVAILABLE_TOOLS.includes(tool));
}

function App() {
  const containerRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [searchResults, setSearchResults] = useState([]);
  const [knowledgeResults, setKnowledgeResults] = useState([]);
  const [selectedTools, setSelectedTools] = useState([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templateSaveNotice, setTemplateSaveNotice] = useState(null);
  const [requestPreview, setRequestPreview] = useState(0);
  const [mode, setMode] = useState('free'); // 'free' | 'manual'
  const [useAgent, setUseAgent] = useState(false); // Agent mode toggle
  const [rightPanel, setRightPanel] = useState('result'); // 'result' | 'history' | 'logs'
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(820);
  const [dragState, setDragState] = useState(null);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);

  const agent = useAgentSSE();

  useEffect(() => {
    api.getTemplates().then(setTemplates);
    api.getModels().then((ms) => {
      setModels(ms);
      if (ms.length > 0) setSelectedModel(ms[0].id);
    });
    api.getKnowledgeFiles().then(setKnowledgeFiles);
  }, []);

  useEffect(() => {
    setSidebarWidth(readStoredWidth(SIDEBAR_WIDTH_STORAGE_KEY, 260));
    setEditorWidth(readStoredWidth(EDITOR_WIDTH_STORAGE_KEY, 820));
  }, []);

  useEffect(() => {
    const clampWidths = () => {
      const containerWidth = containerRef.current?.clientWidth || 0;
      if (!containerWidth) return;

      const maxSidebarWidth = Math.max(
        MIN_SIDEBAR_WIDTH,
        containerWidth - MIN_EDITOR_WIDTH - MIN_RIGHT_PANEL_WIDTH - RESIZER_WIDTH * 2
      );
      const nextSidebarWidth = clamp(sidebarWidth, MIN_SIDEBAR_WIDTH, maxSidebarWidth);
      const maxEditorWidth = Math.max(
        MIN_EDITOR_WIDTH,
        containerWidth - nextSidebarWidth - MIN_RIGHT_PANEL_WIDTH - RESIZER_WIDTH * 2
      );
      const nextEditorWidth = clamp(editorWidth, MIN_EDITOR_WIDTH, maxEditorWidth);

      if (nextSidebarWidth !== sidebarWidth) {
        setSidebarWidth(nextSidebarWidth);
      }
      if (nextEditorWidth !== editorWidth) {
        setEditorWidth(nextEditorWidth);
      }
    };

    clampWidths();
    window.addEventListener('resize', clampWidths);
    return () => window.removeEventListener('resize', clampWidths);
  }, [sidebarWidth, editorWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarWidth));
    } catch {
      // Ignore storage write failures.
    }
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(EDITOR_WIDTH_STORAGE_KEY, String(editorWidth));
    } catch {
      // Ignore storage write failures.
    }
  }, [editorWidth]);

  useEffect(() => {
    if (!dragState) return undefined;

    const handleMouseMove = (event) => {
      const containerWidth = containerRef.current?.clientWidth || 0;
      if (!containerWidth) return;

      const deltaX = event.clientX - dragState.startX;

      if (dragState.type === 'sidebar') {
        const maxSidebarWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          containerWidth - MIN_EDITOR_WIDTH - MIN_RIGHT_PANEL_WIDTH - RESIZER_WIDTH * 2
        );
        setSidebarWidth(
          clamp(dragState.startSidebarWidth + deltaX, MIN_SIDEBAR_WIDTH, maxSidebarWidth)
        );
        return;
      }

      const maxEditorWidth = Math.max(
        MIN_EDITOR_WIDTH,
        containerWidth - sidebarWidth - MIN_RIGHT_PANEL_WIDTH - RESIZER_WIDTH * 2
      );
      setEditorWidth(
        clamp(dragState.startEditorWidth + deltaX, MIN_EDITOR_WIDTH, maxEditorWidth)
      );
    };

    const handleMouseUp = () => {
      setDragState(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState, sidebarWidth]);

  const handleResizeStart = (type, event) => {
    if (type === 'editor' && isEditorCollapsed) {
      return;
    }
    event.preventDefault();
    setDragState({
      type,
      startX: event.clientX,
      startSidebarWidth: sidebarWidth,
      startEditorWidth: editorWidth,
    });
  };

  const toggleEditorCollapsed = () => {
    setIsEditorCollapsed((prev) => !prev);
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setVariableValues({});
    setSelectedTools(getTemplateDefaultTools(template));
    setSearchResults([]);
    setKnowledgeResults([]);
    setResult(null);
    setError(null);
    setTemplateSaveNotice(null);
    setMode('manual');
    setRightPanel('result');
    agent.reset();
  };

  const handleCreateTemplate = (prefill = {}) => {
    // Create a blank draft template (no id = create mode)
    setSelectedTemplate({
      name: '',
      scene: prefill.scene || '',
      category: prefill.category || '',
      description: '',
      system_prompt: '',
      user_prompt: '',
      variables: [],
      default_tools: [],
    });
    setVariableValues({});
    setSelectedTools([]);
    setSearchResults([]);
    setKnowledgeResults([]);
    setResult(null);
    setError(null);
    setTemplateSaveNotice(null);
    setMode('manual');
    setRightPanel('result');
    agent.reset();
  };

  const handleCreateTemplateSave = async (payload) => {
    const created = await api.createTemplate(payload);
    setTemplates((prev) => [...prev, created]);
    setSelectedTemplate(created);
    setSelectedTools(getTemplateDefaultTools(created));
    setTemplateSaveNotice({ type: 'success', text: '已创建' });
  };

  const handleVariableChange = (name, value) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleIntentResolved = (template, prefilledVariables) => {
    setSelectedTemplate(template);
    setVariableValues(prefilledVariables || {});
    setSelectedTools(getTemplateDefaultTools(template));
    setSearchResults([]);
    setKnowledgeResults([]);
    setResult(null);
    setError(null);
    setTemplateSaveNotice(null);
    setMode('manual');
    setRightPanel('result');
    agent.reset();
  };

  const handleTemplateSave = async (updatedTemplate) => {
    const savedTemplate = await api.updateTemplate(updatedTemplate.id, {
      name: updatedTemplate.name,
      scene: updatedTemplate.scene,
      category: updatedTemplate.category,
      description: updatedTemplate.description,
      system_prompt: updatedTemplate.system_prompt,
      user_prompt: updatedTemplate.user_prompt,
      variables: updatedTemplate.variables,
      default_tools: updatedTemplate.default_tools,
    });

    setTemplates((prev) =>
      prev.map((template) => (template.id === savedTemplate.id ? savedTemplate : template))
    );
    setSelectedTemplate(savedTemplate);
    setSelectedTools(getTemplateDefaultTools(savedTemplate));
    setTemplateSaveNotice({ type: 'success', text: '已保存' });
  };

  const handleToolsChange = (nextTools) => {
    setSelectedTools(nextTools);

    if (!nextTools.includes('web_search')) {
      setSearchResults([]);
    }

    if (!nextTools.includes('knowledge_search')) {
      setKnowledgeResults([]);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    const missing = selectedTemplate.variables
      .filter((v) => v.required && !variableValues[v.name]?.trim())
      .map((v) => v.label);

    if (missing.length > 0) {
      setError(`请填写必填变量: ${missing.join(', ')}`);
      return;
    }

    setError(null);
    setResult(null);
    setRightPanel('result');

    if (useAgent) {
      // Agent mode: start agent and connect SSE
      agent.reset();
      try {
        const { agent_id } = await api.startAgent({
          template_id: selectedTemplate.id,
          variables: variableValues,
          model: selectedModel,
          temperature,
          tools: selectedTools,
        });
        agent.connect(agent_id);
      } catch (err) {
        setError(err.response?.data?.message || 'Agent 启动失败');
      }
    } else {
      // Manual mode: direct generate
      setLoading(true);
      try {
        const res = await api.generate({
          template_id: selectedTemplate.id,
          variables: variableValues,
          model: selectedModel,
          temperature,
          search_results: selectedTools.includes('web_search') && searchResults.length > 0 ? searchResults : undefined,
          knowledge_results: selectedTools.includes('knowledge_search') && knowledgeResults.length > 0 ? knowledgeResults : undefined,
        });
        setResult(res);
      } catch (err) {
        setError(err.response?.data?.message || '生成失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  const isAgentRunning = agent.status === 'running';
  const showAgentResult = useAgent && (agent.steps.length > 0 || agent.status !== 'idle');

  return (
    <div ref={containerRef} className="flex h-screen bg-white overflow-hidden">
      <div className="h-full flex-shrink-0 overflow-hidden" style={{ width: sidebarWidth }}>
        <Sidebar
          templates={templates}
          selectedId={selectedTemplate?.id}
          onSelect={handleSelectTemplate}
          onCreateTemplate={handleCreateTemplate}
          knowledgeFiles={knowledgeFiles}
          onKnowledgeFilesChange={setKnowledgeFiles}
        />
      </div>
      <div
        onMouseDown={(event) => handleResizeStart('sidebar', event)}
        className={`group relative h-full flex-shrink-0 cursor-col-resize transition-colors ${
          dragState?.type === 'sidebar' ? 'bg-blue-50' : 'bg-transparent hover:bg-blue-50'
        }`}
        style={{ width: RESIZER_WIDTH }}
        aria-label="调整侧边栏宽度"
      >
        <div
          className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
            dragState?.type === 'sidebar' ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-blue-400'
          }`}
        />
        <div
          className={`absolute left-1/2 top-1/2 flex h-12 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm transition-all ${
            dragState?.type === 'sidebar'
              ? 'border-blue-300 text-blue-500 shadow-md'
              : 'border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500'
          }`}
        >
          <div className="flex gap-0.5">
            <span className="block h-4 w-px bg-current" />
            <span className="block h-4 w-px bg-current" />
          </div>
        </div>
      </div>

      <main className="flex-1 flex min-w-0 overflow-hidden">
        {/* Left Panel */}
        <div
          className="flex-shrink-0 p-6 overflow-y-auto flex flex-col min-w-0"
          style={{
            width: isEditorCollapsed ? 0 : editorWidth,
            padding: isEditorCollapsed ? 0 : undefined,
            overflow: isEditorCollapsed ? 'hidden' : undefined,
          }}
        >
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
            <button
              onClick={() => setMode('free')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'free'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare size={14} />
              自由输入
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                mode === 'manual'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings2 size={14} />
              手动模式
            </button>
          </div>

          {/* Free Input Mode */}
          {mode === 'free' && (
            <div className="flex-1 min-h-0">
              <FreeInput templates={templates} onIntentResolved={handleIntentResolved} />
            </div>
          )}

          {/* Manual Mode */}
          {mode === 'manual' && (
            <>
              <TemplateEditor
                key={`${selectedTemplate?.id || 'new'}-${selectedTemplate?.version || 0}`}
                template={selectedTemplate}
                onSave={handleTemplateSave}
                onCreate={handleCreateTemplateSave}
                saveNotice={templateSaveNotice}
                existingScenes={templates}
                variableValues={variableValues}
                requestPreview={requestPreview}
              />

              {selectedTemplate && (
                <div className="mt-6 space-y-6">
                  <VariableForm
                    variables={selectedTemplate.variables}
                    values={variableValues}
                    onChange={handleVariableChange}
                    onSave={() => setRequestPreview((n) => n + 1)}
                  />

                  <Settings
                    models={models}
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    temperature={temperature}
                    onTemperatureChange={setTemperature}
                  />

                  {/* Agent Mode Toggle */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Bot size={16} className={useAgent ? 'text-blue-600' : 'text-gray-400'} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Agent 模式</p>
                        <p className="text-xs text-gray-500">
                          自动调用搜索和知识库工具，多步推理生成
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUseAgent(!useAgent)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useAgent ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useAgent ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Tools Panel - only show in non-agent mode */}
                  {!useAgent && (
                    <ToolsPanel
                      key={selectedTemplate?.id || 'new'}
                      selectedTools={selectedTools}
                      onToolsChange={handleToolsChange}
                      onSearchSelectionChange={setSearchResults}
                      onKnowledgeSelectionChange={setKnowledgeResults}
                    />
                  )}

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={loading || isAgentRunning}
                    className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                      useAgent
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {useAgent ? <Zap size={14} /> : <Play size={14} />}
                    {loading || isAgentRunning
                      ? '执行中...'
                      : useAgent
                        ? 'Agent 执行'
                        : '生成'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <div
          onMouseDown={(event) => handleResizeStart('editor', event)}
          className={`group relative h-full flex-shrink-0 cursor-col-resize transition-colors ${
            dragState?.type === 'editor' ? 'bg-blue-50' : 'bg-transparent hover:bg-blue-50'
          }`}
          style={{ width: RESIZER_WIDTH }}
          aria-label="调整编辑区宽度"
        >
          <div
            className={`absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors ${
              dragState?.type === 'editor' ? 'bg-blue-500' : 'bg-gray-200 group-hover:bg-blue-400'
            }`}
          />
          <div
            className={`absolute left-1/2 top-1/2 flex h-12 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm transition-all ${
              dragState?.type === 'editor'
                ? 'border-blue-300 text-blue-500 shadow-md'
                : 'border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500'
            }`}
          >
            <div className="flex gap-0.5">
              <span className="block h-4 w-px bg-current" />
              <span className="block h-4 w-px bg-current" />
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleEditorCollapsed();
            }}
            className="absolute left-1/2 top-4 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-blue-200 hover:text-blue-600"
            aria-label={isEditorCollapsed ? '展开编辑区' : '收起编辑区'}
            title={isEditorCollapsed ? '展开编辑区' : '收起编辑区'}
          >
            {isEditorCollapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
          </button>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-l border-gray-200">
          {/* Right panel tabs */}
          <div className="flex items-center border-b border-gray-200 px-4 pt-3">
            <button
              onClick={() => setRightPanel('result')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${
                rightPanel === 'result'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap size={13} />
              结果
            </button>
            <button
              onClick={() => setRightPanel('history')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${
                rightPanel === 'history'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={13} />
              历史
            </button>
            <button
              onClick={() => setRightPanel('logs')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors -mb-px ${
                rightPanel === 'logs'
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <ScrollText size={13} />
              日志
            </button>
          </div>

          {/* Right panel content */}
          <div className="flex-1 p-6 overflow-hidden">
            {rightPanel === 'result' && (
              showAgentResult ? (
                <AgentSteps
                  steps={agent.steps}
                  finalResult={agent.finalResult}
                  status={agent.status}
                  error={agent.error}
                />
              ) : (
                <ResultPanel result={result} loading={loading} />
              )
            )}
            {rightPanel === 'history' && <History />}
            {rightPanel === 'logs' && <Logs />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
