import { DollarSign, Zap, Hash, TrendingUp } from 'lucide-react';

export default function CostStats({ stats }) {
  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Hash size={14} className="text-blue-500" />}
          label="总生成次数"
          value={stats.total_generations}
        />
        <StatCard
          icon={<Zap size={14} className="text-purple-500" />}
          label="总 Tokens"
          value={stats.total_tokens.toLocaleString()}
        />
        <StatCard
          icon={<DollarSign size={14} className="text-green-500" />}
          label="总费用"
          value={`$${stats.total_cost.toFixed(3)}`}
        />
        <StatCard
          icon={<TrendingUp size={14} className="text-orange-500" />}
          label="平均费用/次"
          value={`$${stats.avg_cost_per_generation.toFixed(4)}`}
        />
      </div>

      {/* Model breakdown */}
      {stats.by_model && stats.by_model.length > 0 && (
        <div className="mt-3 pt-3 border-t border-blue-100">
          <p className="text-xs font-medium text-gray-600 mb-2">模型使用分布</p>
          <div className="space-y-1.5">
            {stats.by_model.map((m) => (
              <div key={m.model} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{m.model}</span>
                <span className="text-gray-500">
                  {m.count}次 · {m.tokens} tokens · ${m.cost.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white/70 rounded-md">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
