import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Plus } from 'lucide-react';
import KnowledgePanel from '../KnowledgePanel';

export default function Sidebar({ templates, selectedId, onSelect, onCreateTemplate, knowledgeFiles, onKnowledgeFilesChange }) {
  const [expanded, setExpanded] = useState({});

  // Group templates by scene → category
  const tree = useMemo(() => {
    const map = {};
    for (const t of templates) {
      if (!map[t.scene]) map[t.scene] = {};
      if (!map[t.scene][t.category]) map[t.scene][t.category] = [];
      map[t.scene][t.category].push(t);
    }
    return map;
  }, [templates]);

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCreate = (e, prefill = {}) => {
    e.stopPropagation();
    onCreateTemplate(prefill);
  };

  return (
    <aside className="w-full border-r border-gray-200 bg-gray-50 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-800">Prompt Hub</h1>
        <button
          onClick={(e) => handleCreate(e)}
          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
          title="新建模板"
        >
          <Plus size={16} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {Object.entries(tree).map(([scene, categories]) => (
          <div key={scene} className="mb-1">
            <div className="group flex items-center">
              <button
                onClick={() => toggle(scene)}
                className="flex-1 flex items-center gap-1 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded"
              >
                {expanded[scene] ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                {scene}
              </button>
              <button
                onClick={(e) => handleCreate(e, { scene })}
                className="hidden group-hover:block p-0.5 mr-1 text-gray-400 hover:text-blue-600 rounded"
                title={`在"${scene}"下新建`}
              >
                <Plus size={12} />
              </button>
            </div>
            {expanded[scene] &&
              Object.entries(categories).map(([category, items]) => (
                <div key={category} className="ml-3">
                  <div className="group flex items-center">
                    <button
                      onClick={() => toggle(`${scene}-${category}`)}
                      className="flex-1 flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
                    >
                      {expanded[`${scene}-${category}`] ? (
                        <ChevronDown size={12} />
                      ) : (
                        <ChevronRight size={12} />
                      )}
                      {category}
                    </button>
                    <button
                      onClick={(e) => handleCreate(e, { scene, category })}
                      className="hidden group-hover:block p-0.5 mr-1 text-gray-400 hover:text-blue-600 rounded"
                      title={`在"${scene} > ${category}"下新建`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  {expanded[`${scene}-${category}`] &&
                    items.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onSelect(t)}
                        className={`flex items-center gap-1.5 w-full ml-3 px-2 py-1 text-sm rounded ${
                          selectedId === t.id
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <FileText size={12} />
                        {t.name}
                      </button>
                    ))}
                </div>
              ))}
          </div>
        ))}
      </nav>
      <KnowledgePanel files={knowledgeFiles} onFilesChange={onKnowledgeFilesChange} />
    </aside>
  );
}
