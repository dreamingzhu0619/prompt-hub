import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function VariableForm({ variables, values, onChange, onSave }) {
  const [collapsed, setCollapsed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCollapsed(false);
    setSaved(false);
  }, [variables]);

  // Reset saved state when values change
  useEffect(() => {
    setSaved(false);
  }, [values]);

  if (!variables || variables.length === 0) return null;

  const handleSave = () => {
    setSaved(true);
    if (onSave) onSave();
    setTimeout(() => setSaved(false), 2500);
  };

  const hasAnyValue = Object.values(values).some((v) => v && String(v).trim() !== '');

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">变量填充</h3>
          <p className="mt-1 text-sm text-gray-500">填写当前模板需要的输入内容。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasAnyValue || saved}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
              saved
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {saved && <Check size={14} />}
            {saved ? '已保存' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
            aria-label={collapsed ? '展开变量填充' : '收起变量填充'}
            title={collapsed ? '展开变量填充' : '收起变量填充'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-3 border-t border-gray-100 px-5 py-4">
          {variables.map((v) => (
            <div key={v.name}>
              <label className="block text-sm text-gray-600 mb-1">
                {v.label}
                {v.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {v.type === 'textarea' ? (
                <textarea
                  value={values[v.name] || ''}
                  onChange={(e) => onChange(v.name, e.target.value)}
                  placeholder={`请输入${v.label}`}
                  className="w-full h-24 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md resize-none cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <input
                  type="text"
                  value={values[v.name] || ''}
                  onChange={(e) => onChange(v.name, e.target.value)}
                  placeholder={`请输入${v.label}`}
                  className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-300 rounded-md cursor-text focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
