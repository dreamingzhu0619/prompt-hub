import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TemplateEditor from './components/TemplateEditor';
import VariableForm from './components/VariableForm';
import Settings from './components/Settings';
import ToolsPanel from './components/ToolsPanel';
import ResultPanel from './components/ResultPanel';
import { api } from './services/api';

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
  };

  const handleVariableChange = (name, value) => {
    setVariableValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return;

    // Check required variables
    const missing = selectedTemplate.variables
      .filter((v) => v.required && !variableValues[v.name]?.trim())
      .map((v) => v.label);

    if (missing.length > 0) {
      setError(`请填写必填变量: ${missing.join(', ')}`);
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

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
  };

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
        {/* Left: Template + Variables + Settings */}
        <div className="w-1/2 border-r border-gray-200 p-6 overflow-y-auto">
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

              <ToolsPanel
                onSearchSelectionChange={setSearchResults}
                onKnowledgeSelectionChange={setKnowledgeResults}
              />

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play size={14} />
                {loading ? '生成中...' : '生成'}
              </button>
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div className="w-1/2 p-6">
          <ResultPanel result={result} loading={loading} />
        </div>
      </main>
    </div>
  );
}

export default App;
