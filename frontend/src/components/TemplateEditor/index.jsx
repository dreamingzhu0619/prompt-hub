export default function TemplateEditor({ template }) {
  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        请从左侧选择一个模板
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Prompt
        </label>
        <textarea
          readOnly
          value={template.system_prompt}
          className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 resize-none focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          User Prompt 模板
        </label>
        <textarea
          readOnly
          value={template.user_prompt}
          className="w-full h-32 px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 resize-none focus:outline-none font-mono"
        />
      </div>
    </div>
  );
}
