export default function VariableForm({ variables, values, onChange }) {
  if (!variables || variables.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">变量填充</h3>
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
              className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <input
              type="text"
              value={values[v.name] || ''}
              onChange={(e) => onChange(v.name, e.target.value)}
              placeholder={`请输入${v.label}`}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
      ))}
    </div>
  );
}
