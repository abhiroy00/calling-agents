import { useSelector } from 'react-redux'
import useCallSocket from './useCallSocket'

const statusColor = {
  in_progress: 'text-green-500',
  ringing: 'text-blue-500',
  initiated: 'text-gray-400',
  completed: 'text-gray-400',
}

const statusDot = (status) => (
  <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
    status === 'in_progress' ? 'bg-green-500 animate-pulse' :
    status === 'ringing' ? 'bg-blue-400' : 'bg-gray-300'
  }`} />
)

export default function LiveCallBoard() {
  useCallSocket()
  const liveCalls = useSelector((s) => s.calls.liveCalls)
  const calls = Object.values(liveCalls)
  const active = calls.filter((c) => ['in_progress', 'ringing', 'initiated'].includes(c.status))
  const connected = calls.filter((c) => c.status === 'in_progress').length
  const dialed = calls.length

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">Live Call Board</h1>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Dialed', value: dialed },
          { label: 'Connected', value: connected },
          { label: 'Connect rate', value: dialed ? `${Math.round((connected / dialed) * 100)}%` : '—' },
          { label: 'Live now', value: active.length, highlight: true },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.highlight ? 'text-green-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {active.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            No active calls — start a campaign to begin dialing
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map((call) => (
              <div key={call.call_id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center">
                  {statusDot(call.status)}
                  <span className="font-mono text-xs text-gray-700">Call #{call.call_id}</span>
                </div>
                <span className={`text-xs ${statusColor[call.status] || 'text-gray-400'}`}>
                  {call.status === 'in_progress' ? 'in progress' : call.status}
                  {call.disposition && call.disposition !== 'pending' ? ` · ${call.disposition}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
