import { ChevronDown, ChevronUp, Copy, Check, ArrowDownToLine } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function extractPromptVariables(prompt) {
  const matches = prompt?.match(/{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g) || [];
  return [...new Set(matches.map((item) => item.replace(/[{}]/g, '').trim()))];
}

function createVariableDraft(index = 0) {
  return {
    name: `variable_${index + 1}`,
    label: `变量${index + 1}`,
    type: 'text',
    required: false,
  };
}

const TOOL_OPTIONS = [
  { id: 'web_search', label: '网络搜索' },
  { id: 'knowledge_search', label: '知识库检索' },
];

function SectionCard({ title, description, collapsed, onToggle, actions, children }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            aria-label={collapsed ? `展开${title}` : `收起${title}`}
            title={collapsed ? `展开${title}` : `收起${title}`}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>
      {!collapsed && <div className="border-t border-gray-100 px-5 py-4">{children}</div>}
    </section>
  );
}

function renderPrompt(template, variableValues) {
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    const value = variableValues[key];
    return value != null && String(value).trim() !== '' ? String(value) : match;
  });
}

export default function TemplateEditor({ template, onSave, onCreate, saveNotice, existingScenes, variableValues = {}, requestPreview = 0, onVariablesChange }) {
  const isNew = template && !template.id;
  const [name, setName] = useState(template?.name || '');
  const [scene, setScene] = useState(template?.scene || '');
  const [category, setCategory] = useState(template?.category || '');
  const [description, setDescription] = useState(template?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(template?.system_prompt || '');
  const [userPrompt, setUserPrompt] = useState(template?.user_prompt || '');
  const [variables, setVariables] = useState(template?.variables || []);
  const [defaultTools, setDefaultTools] = useState(template?.default_tools || []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [isVariableDefinitionCollapsed, setIsVariableDefinitionCollapsed] = useState(false);
  const [promptViewMode, setPromptViewMode] = useState('edit'); // 'edit' | 'preview'
  const [copied, setCopied] = useState(false);
  const userPromptRef = useRef(null);
  const cursorPosRef = useRef(0);

  useEffect(() => {
    setName(template?.name || '');
    setScene(template?.scene || '');
    setCategory(template?.category || '');
    setDescription(template?.description || '');
    setSystemPrompt(template?.system_prompt || '');
    setUserPrompt(template?.user_prompt || '');
    setVariables(template?.variables || []);
    setDefaultTools(template?.default_tools || []);
    setMessage(null);
    setIsPromptCollapsed(false);
    setIsVariableDefinitionCollapsed(false);
    setPromptViewMode('edit');
    setCopied(false);
  }, [template]);

  // Switch to preview mode when requestPreview prop is triggered
  useEffect(() => {
    if (requestPreview > 0) {
      setPromptViewMode('preview');
      setIsPromptCollapsed(false);
    }
  }, [requestPreview]);

  // Sync current editing variables to parent
  useEffect(() => {
    if (onVariablesChange) {
      onVariablesChange(variables);
    }
  }, [variables, onVariablesChange]);

  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        请从左侧选择一个模板
      </div>
    );
  }

  const isDirty = isNew ||
    systemPrompt !== (template.system_prompt || '') ||
    userPrompt !== (template.user_prompt || '') ||
    name !== (template.name || '') ||
    scene !== (template.scene || '') ||
    category !== (template.category || '') ||
    description !== (template.description || '') ||
    JSON.stringify(variables) !== JSON.stringify(template.variables || []) ||
    JSON.stringify(defaultTools) !== JSON.stringify(template.default_tools || []);

  const promptVariables = useMemo(() => extractPromptVariables(userPrompt), [userPrompt]);
  const definedVariableNames = useMemo(
    () => variables.map((item) => item.name?.trim()).filter(Boolean),
    [variables]
  );
  const missingDefinitions = promptVariables.filter((n) => !definedVariableNames.includes(n));

  // Get unique categories for current scene
  const sceneCategoriesMap = useMemo(() => {
    if (!existingScenes) return {};
    const map = {};
    for (const t of existingScenes) {
      if (!map[t.scene]) map[t.scene] = new Set();
      map[t.scene].add(t.category);
    }
    return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
  }, [existingScenes]);

  const uniqueScenes = Object.keys(sceneCategoriesMap);
  const currentCategories = sceneCategoriesMap[scene] || [];

  const handleUserPromptCursorChange = useCallback(() => {
    if (userPromptRef.current) {
      cursorPosRef.current = userPromptRef.current.selectionStart || 0;
    }
  }, []);

  const handleInsertVariable = (varName, varLabel) => {
    const insertion = `${varLabel || varName}：{{${varName}}}`;
    const pos = cursorPosRef.current;
    const before = userPrompt.slice(0, pos);
    const after = userPrompt.slice(pos);
    const needNewlineBefore = pos > 0 && before[before.length - 1] !== '\n';
    const prefix = needNewlineBefore ? '\n' : '';
    const newText = prefix + insertion;
    setUserPrompt(before + newText + after);
    const newPos = pos + newText.length;
    cursorPosRef.current = newPos;
    // Focus and set cursor position after state update
    setTimeout(() => {
      if (userPromptRef.current) {
        userPromptRef.current.focus();
        userPromptRef.current.selectionStart = newPos;
        userPromptRef.current.selectionEnd = newPos;
      }
    }, 0);
    // Switch back to edit mode so user can see the inserted placeholder
    setPromptViewMode('edit');
  };

  const handleCopyRendered = async () => {
    const renderedSystem = renderPrompt(systemPrompt, variableValues);
    const renderedUser = renderPrompt(userPrompt, variableValues);
    const fullText = `[System Prompt]\n${renderedSystem}\n\n[User Prompt]\n${renderedUser}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: ignore
    }
  };

  const handleVariableChange = (index, field, value) => {
    setVariables((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddVariable = () => {
    const draft = createVariableDraft(variables.length);
    setVariables((prev) => [...prev, draft]);
    // Auto-insert "label：{{name}}" into user_prompt at cursor position
    const insertion = `${draft.label}：{{${draft.name}}}`;
    const pos = cursorPosRef.current;
    const before = userPrompt.slice(0, pos);
    const after = userPrompt.slice(pos);
    // Add newline before if cursor is not at start and previous char is not newline
    const needNewlineBefore = pos > 0 && before[before.length - 1] !== '\n';
    const prefix = needNewlineBefore ? '\n' : '';
    const newText = prefix + insertion;
    setUserPrompt(before + newText + after);
    cursorPosRef.current = pos + newText.length;
  };

  const handleRemoveVariable = (index) => {
    setVariables((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddMissingVariables = () => {
    setVariables((prev) => [
      ...prev,
      ...missingDefinitions.map((n) => ({
        name: n,
        label: n,
        type: 'text',
        required: false,
      })),
    ]);
  };

  const toggleDefaultTool = (toolId) => {
    setDefaultTools((prev) =>
      prev.includes(toolId) ? prev.filter((item) => item !== toolId) : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    if (!isDirty || saving) return;

    // Validate name/scene/category for new templates
    if (!name.trim()) {
      setMessage({ type: 'error', text: '模板名称不能为空。' });
      return;
    }
    if (!scene.trim()) {
      setMessage({ type: 'error', text: '场景不能为空。' });
      return;
    }
    if (!category.trim()) {
      setMessage({ type: 'error', text: '分类不能为空。' });
      return;
    }

    const normalizedVariables = variables.map((item) => ({
      ...item,
      name: item.name?.trim(),
      label: item.label?.trim(),
    }));
    const invalidVariable = normalizedVariables.find(
      (item) =>
        !item.name ||
        !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item.name) ||
        !item.label
    );
    if (invalidVariable) {
      setMessage({
        type: 'error',
        text: '变量名需使用字母/数字/下划线，且以字母或下划线开头；展示名称不能为空。',
      });
      return;
    }

    const duplicateNames = normalizedVariables.filter(
      (item, index) =>
        normalizedVariables.findIndex((other) => other.name === item.name) !== index
    );
    if (duplicateNames.length > 0) {
      setMessage({ type: 'error', text: '变量名不能重复。' });
      return;
    }

    if (missingDefinitions.length > 0) {
      setMessage({
        type: 'error',
        text: `以下占位符还没有变量定义: ${missingDefinitions.join(', ')}`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: name.trim(),
        scene: scene.trim(),
        category: category.trim(),
        description: description.trim(),
        system_prompt: systemPrompt,
        user_prompt: userPrompt,
        variables: normalizedVariables,
        default_tools: defaultTools,
      };

      if (isNew) {
        await onCreate(payload);
      } else {
        await onSave({ ...template, ...payload });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setName(template.name || '');
    setScene(template.scene || '');
    setCategory(template.category || '');
    setDescription(template.description || '');
    setSystemPrompt(template.system_prompt || '');
    setUserPrompt(template.user_prompt || '');
    setVariables(template.variables || []);
    setDefaultTools(template.default_tools || []);
    setMessage(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {isNew ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">新建模板</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">模板名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：简历优化"
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">场景</label>
                  <input
                    type="text"
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    placeholder="例如：求职"
                    list="scene-options"
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <datalist id="scene-options">
                    {uniqueScenes.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">分类</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="例如：面试"
                    list="category-options"
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <datalist id="category-options">
                    {currentCategories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">描述（可选）</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简短描述这个模板的用途"
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {template.name}
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                  {template.scene}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {template.category}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                  v{template.version}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveNotice?.type === 'success' && (
            <span className="px-2.5 py-1 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
              {saveNotice.text}
            </span>
          )}
          {!isNew && (
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              重置
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : isNew ? '创建' : '保存'}
          </button>
        </div>
      </div>

      <SectionCard
        title="Prompt"
        description="配置 System Prompt 和 User Prompt 模板。"
        collapsed={isPromptCollapsed}
        onToggle={() => setIsPromptCollapsed((prev) => !prev)}
        actions={
          <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-md">
            <button
              type="button"
              onClick={() => setPromptViewMode('edit')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                promptViewMode === 'edit'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              编辑
            </button>
            <button
              type="button"
              onClick={() => setPromptViewMode('preview')}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                promptViewMode === 'preview'
                  ? 'bg-white text-blue-600 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              预览
            </button>
          </div>
        }
      >
        {promptViewMode === 'edit' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="设定 AI 的角色和行为规则..."
                className="w-full h-24 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-md bg-white resize-none cursor-text focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Prompt 模板
              </label>
              <textarea
                ref={userPromptRef}
                value={userPrompt}
                onChange={(e) => {
                  setUserPrompt(e.target.value);
                  handleUserPromptCursorChange();
                }}
                onSelect={handleUserPromptCursorChange}
                onClick={handleUserPromptCursorChange}
                onKeyUp={handleUserPromptCursorChange}
                placeholder="用户提交给 AI 的内容模板，使用 {{variable}} 插入变量..."
                className="w-full h-32 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-md bg-white resize-none cursor-text focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 font-mono"
              />
              <p className="mt-2 text-xs text-gray-500">
                使用 <code>{'{{variable_name}}'}</code> 插入变量占位符。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                默认工具
              </label>
              <div className="flex flex-wrap gap-2">
                {TOOL_OPTIONS.map((tool) => {
                  const active = defaultTools.includes(tool.id);
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleDefaultTool(tool.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        active
                          ? 'border-blue-200 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }`}
                    >
                      {tool.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                选择该模板默认启用的工具。用户进入模板后可以再手动取消。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">
                变量已用填充值替换显示。未填充的变量保持 <code>{'{{name}}'}</code> 原样。
              </p>
              <button
                type="button"
                onClick={handleCopyRendered}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                {copied ? '已复制' : '复制完整 Prompt'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <div className="w-full min-h-[6rem] px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md bg-gray-50 whitespace-pre-wrap break-words">
                {renderPrompt(systemPrompt, variableValues) || <span className="text-gray-400">（空）</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Prompt
              </label>
              <div className="w-full min-h-[8rem] px-3 py-2 text-sm text-gray-900 border border-gray-200 rounded-md bg-gray-50 whitespace-pre-wrap break-words font-mono">
                {renderPrompt(userPrompt, variableValues) || <span className="text-gray-400">（空）</span>}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="变量定义"
        description="定义手动模式下展示哪些输入项。"
        collapsed={isVariableDefinitionCollapsed}
        onToggle={() => setIsVariableDefinitionCollapsed((prev) => !prev)}
        actions={
          <button
            type="button"
            onClick={handleAddVariable}
            className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50"
          >
            添加变量
          </button>
        }
      >
        <div className="space-y-3">
          {promptVariables.length > 0 && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-gray-600">
                  模板中检测到的占位符: {promptVariables.join(', ')}
                </div>
                {missingDefinitions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddMissingVariables}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    补全缺失变量
                  </button>
                )}
              </div>
              {missingDefinitions.length > 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  尚未定义: {missingDefinitions.join(', ')}
                </p>
              )}
            </div>
          )}

          {variables.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-3 py-6 text-sm text-center text-gray-500">
              还没有变量。你可以手动添加，也可以先在模板里写入占位符再补全定义。
            </div>
          ) : (
            <div className="space-y-3">
              {variables.map((item, index) => (
                <div key={`${item.name || 'variable'}-${index}`} className="rounded-md border border-gray-200 p-3 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        变量名
                      </label>
                      <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                        placeholder="例如 company"
                        className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        展示名称
                      </label>
                      <input
                        type="text"
                        value={item.label || ''}
                        onChange={(e) => handleVariableChange(index, 'label', e.target.value)}
                        placeholder="例如 目标公司"
                        className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-medium text-gray-600">
                      输入类型
                    </label>
                    <select
                      value={item.type || 'text'}
                      onChange={(e) => handleVariableChange(index, 'type', e.target.value)}
                      className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="text">单行文本</option>
                      <option value="textarea">多行文本</option>
                    </select>

                    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={Boolean(item.required)}
                        onChange={(e) => handleVariableChange(index, 'required', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 cursor-pointer focus:ring-blue-500"
                      />
                      必填
                    </label>

                    <button
                      type="button"
                      onClick={() => handleInsertVariable(item.name, item.label)}
                      disabled={!item.name?.trim()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="插入占位符到 User Prompt 光标位置"
                    >
                      <ArrowDownToLine size={12} />
                      插入
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(index)}
                      className="ml-auto px-2.5 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      {message?.type === 'error' && (
        <p className="text-sm text-red-500">
          {message.text}
        </p>
      )}
    </div>
  );
}
