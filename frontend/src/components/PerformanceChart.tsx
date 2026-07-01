import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProductivitySummary } from '../types'

interface Props {
  data: ProductivitySummary[]
}

export default function PerformanceChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
        No productivity data yet.
      </div>
    )
  }

  const formatted = data.map((d) => ({
    date: d.date,
    score: parseFloat(d.avg_score.toFixed(2)),
    logs: d.log_count,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6B7280' }}
          tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#6B7280' }} />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'score' ? `${value} / 5` : value,
            name === 'score' ? 'Avg Productivity' : 'Log Entries',
          ]}
          labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#2563EB"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563EB' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
