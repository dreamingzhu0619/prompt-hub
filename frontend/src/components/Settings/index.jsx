export default function Settings({
  models,
  selectedModel,
  onModelChange,
  temperature,
  onTemperatureChange,
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">生成设置</h3>

      <div>
        <label className="block text-xs text-gray-500 mb-1">模型</label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">
          温度: {temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => onTemperatureChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-0.5">
          <span>精确</span>
          <span>创意</span>
        </div>
      </div>
    </div>
  );
}
