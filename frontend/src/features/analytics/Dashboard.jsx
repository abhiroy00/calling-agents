import { useGetSummaryQuery } from './analyticsApi'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const DISPOSITION_COLORS = {
  interested: '#22c55e',
  callback: '#3b82f6',
  not_interested: '#f43f5e',
  voicemail: '#a855f7',
  no_answer: '#94a3b8',
  pending: '#e2e8f0',
}

export default function Dashboard() {
  const { data, isFetching } = useGetSummaryQuery()

  if (isFetching) return <p className="text-gray-400">Loading…</p>
  if (!data) return null

  const pieData = Object.entries(data.dispositions || {}).map(([name, value]) => ({ name, value }))

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total calls', value: data.total_calls },
          { label: 'Connected', value: data.connected },
          { label: 'Connect rate', value: `${Math.round((data.connect_rate || 0) * 100)}%` },
          { label: 'Avg duration', value: `${data.avg_duration}s` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-4">Calls per day (last 14 days)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.calls_per_day || []}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-medium text-gray-700 mb-4">Dispositions</p>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={DISPOSITION_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
