import { useState, useEffect } from 'react';
import { Play, MessageSquare, Settings2, Bot, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TemplateEditor from './components/TemplateEditor';
import VariableForm from './components/VariableForm';
import Settings from './components/Settings';
import ToolsPanel from './components/ToolsPanel';
import ResultPanel from './components/ResultPanel';
import FreeInput from './components/FreeInput';
import AgentSteps from './components/AgentSteps';
import { api } from './services/api';
import { useAgentSSE } from './hooks/useAgentSSE';

function App() {
  const [templates, setTemplates] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [variableValues, setVariableValues] = useState({});
  const [selectedModel, setSelectedModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [searchResults, setSearchResults] = useState([]);
  const [knowledgeResults, setKnowledgeResults] = useState([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('free'); // 'free' | 'manual'
  const [useAgent, setUseAgent] = useState(false); // Agent mode toggle

  const agent = useAgentSSE();

  useEffect(() => {
    api.getTemplates().then(setTemplates);
    api.getModels().then((ms) => {
      setModels(ms);
      if (ms.length > 0) setSelectedModel(ms[0].id);
    });
    api.getKnowledgeFiles().then(setKnowledgeFiles);
  }, []);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setVariableValues({});
    setResult(null);
    setError(null);
    setMode('manual');
    agent.reset();
  };

  const handleVariableChange = (name, value) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleIntentResolved = (template, prefilledVariables) => {
    setSelectedTemplate(template);
    setVariableValues(prefilledVariables || {});
    setResult(null);
    setError(null);
    setMode('manual');
    agent.reset();
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

    if (useAgent) {
      // Agent mode: start agent and connect SSE
      agent.reset();
      try {
        const { agent_id } = await api.startAgent({
          template_id: selectedTemplate.id,
          variables: variableValues,
          model: selectedModel,
          temperature,
          tools: ['web_search', 'knowledge_search'],
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
          search_results: searchResults.length > 0 ? searchResults : undefined,
          knowledge_results: knowledgeResults.length > 0 ? knowledgeResults : undefined,
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
    <div className="flex h-screen bg-white">
      <Sidebar
        templates={templates}
        selectedId={selectedTemplate?.id}
        onSelect={handleSelectTemplate}
        knowledgeFiles={knowledgeFiles}
        onKnowledgeFilesChange={setKnowledgeFiles}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto flex flex-col">
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
              <TemplateEditor template={selectedTemplate} />

              {selectedTemplate && (
                <div className="mt-6 space-y-6">
                  <VariableForm
                    variables={selectedTemplate.variables}
                    values={variableValues}
                    onChange={handleVariableChange}
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

        {/* Right: Result */}
        <div className="w-1/2 p-6">
          {showAgentResult ? (
            <AgentSteps
              steps={agent.steps}
              finalResult={agent.finalResult}
              status={agent.status}
              error={agent.error}
            />
          ) : (
            <ResultPanel result={result} loading={loading} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
